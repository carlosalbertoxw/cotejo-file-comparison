import { mkdtemp, mkdir, writeFile, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, type CompareMode, type DirNode, type ScanFilters } from '@shared/types'
import { scanDirectory } from '../src/main/services/scanner'
import { compareTrees } from '../src/main/services/compareTree'

let root: string
let left: string
let right: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cotejo-test-'))
  left = join(root, 'left')
  right = join(root, 'right')
  await mkdir(left, { recursive: true })
  await mkdir(right, { recursive: true })
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function write(base: string, relPath: string, content: string): Promise<string> {
  const full = join(base, relPath)
  await mkdir(join(full, '..'), { recursive: true })
  await writeFile(full, content, 'utf8')
  return full
}

async function compare(
  mode: CompareMode = 'quick',
  filters: ScanFilters = DEFAULT_FILTERS
): Promise<{ root: DirNode; stats: Record<string, number>; byPath: Map<string, DirNode> }> {
  const [leftScan, rightScan] = await Promise.all([
    scanDirectory(left, filters),
    scanDirectory(right, filters)
  ])
  const result = await compareTrees(left, right, leftScan.index, rightScan.index, mode)

  const byPath = new Map<string, DirNode>()
  const walk = (node: DirNode): void => {
    for (const child of node.children ?? []) {
      byPath.set(child.relPath, child)
      if (child.isDir) walk(child)
    }
  }
  walk(result.root)

  return { root: result.root, stats: result.stats, byPath }
}

describe('scanDirectory', () => {
  it('recorre recursivamente y devuelve rutas relativas en formato posix', async () => {
    await write(left, 'a.txt', 'a')
    await write(left, 'sub/b.txt', 'b')
    await write(left, 'sub/deep/c.txt', 'c')

    const { index } = await scanDirectory(left, DEFAULT_FILTERS)
    expect([...index.keys()].sort()).toEqual(['a.txt', 'sub', 'sub/b.txt', 'sub/deep', 'sub/deep/c.txt'])
    expect(index.get('sub')?.isDir).toBe(true)
    expect(index.get('a.txt')?.size).toBe(1)
  })

  it('omite las carpetas excluidas sin entrar en ellas', async () => {
    await write(left, 'src/keep.txt', 'x')
    await write(left, 'node_modules/paquete/index.js', 'y')

    const { index } = await scanDirectory(left, DEFAULT_FILTERS)
    expect([...index.keys()].some((path) => path.includes('node_modules'))).toBe(false)
    expect(index.has('src/keep.txt')).toBe(true)
  })

  it('oculta los archivos que empiezan por punto salvo que se pidan', async () => {
    await write(left, '.env', 'secreto')
    await write(left, 'visible.txt', 'x')

    const hidden = await scanDirectory(left, DEFAULT_FILTERS)
    expect(hidden.index.has('.env')).toBe(false)

    const shown = await scanDirectory(left, { ...DEFAULT_FILTERS, includeHidden: true })
    expect(shown.index.has('.env')).toBe(true)
  })

  it('aplica los filtros de inclusion solo a los archivos', async () => {
    await write(left, 'src/app.ts', 'x')
    await write(left, 'src/logo.png', 'y')

    const { index } = await scanDirectory(left, { ...DEFAULT_FILTERS, include: ['**/*.ts'] })
    expect(index.has('src/app.ts')).toBe(true)
    expect(index.has('src/logo.png')).toBe(false)
    // La carpeta sigue en el indice: es la que contiene los archivos que si casan.
    expect(index.has('src')).toBe(true)
  })

  it('registra un error en vez de fallar cuando la raiz no existe', async () => {
    const { index, errors } = await scanDirectory(join(root, 'no-existe'), DEFAULT_FILTERS)
    expect(index.size).toBe(0)
    expect(errors).toHaveLength(1)
  })
})

describe('compareTrees', () => {
  it('clasifica huerfanos, iguales y distintos', async () => {
    await write(left, 'igual.txt', 'mismo contenido')
    await write(right, 'igual.txt', 'mismo contenido')
    await write(left, 'distinto.txt', 'version izquierda')
    await write(right, 'distinto.txt', 'version derecha!!')
    await write(left, 'solo-izq.txt', 'x')
    await write(right, 'solo-der.txt', 'y')

    const { byPath, stats } = await compare('size')
    expect(byPath.get('igual.txt')?.status).toBe('same')
    expect(byPath.get('solo-izq.txt')?.status).toBe('leftOnly')
    expect(byPath.get('solo-der.txt')?.status).toBe('rightOnly')
    expect(stats).toEqual({ same: 2, different: 0, leftOnly: 1, rightOnly: 1 })
  })

  it('en modo contenido detecta archivos del mismo tamano pero distinto contenido', async () => {
    await write(left, 'mismo-tamano.txt', 'AAAA')
    await write(right, 'mismo-tamano.txt', 'BBBB')

    const bySize = await compare('size')
    expect(bySize.byPath.get('mismo-tamano.txt')?.status).toBe('same')

    const byContent = await compare('content')
    expect(byContent.byPath.get('mismo-tamano.txt')?.status).toBe('different')
  })

  it('en modo contenido confirma que dos copias identicas son iguales', async () => {
    const contenido = 'linea uno\nlinea dos\n'.repeat(500)
    await write(left, 'grande.txt', contenido)
    await write(right, 'grande.txt', contenido)

    const { byPath } = await compare('content')
    expect(byPath.get('grande.txt')?.status).toBe('same')
  })

  it('trata dos archivos vacios como iguales sin leerlos', async () => {
    await write(left, 'vacio.txt', '')
    await write(right, 'vacio.txt', '')

    const { byPath } = await compare('content')
    expect(byPath.get('vacio.txt')?.status).toBe('same')
  })

  it('el modo rapido tolera 2 segundos de diferencia en la fecha', async () => {
    const leftFile = await write(left, 'a.txt', 'contenido')
    const rightFile = await write(right, 'a.txt', 'contenido')

    const base = new Date('2026-01-01T10:00:00Z')
    const dentroDeTolerancia = new Date(base.getTime() + 1500)
    await utimes(leftFile, base, base)
    await utimes(rightFile, dentroDeTolerancia, dentroDeTolerancia)
    expect((await compare('quick')).byPath.get('a.txt')?.status).toBe('same')

    const fueraDeTolerancia = new Date(base.getTime() + 60_000)
    await utimes(rightFile, fueraDeTolerancia, fueraDeTolerancia)
    expect((await compare('quick')).byPath.get('a.txt')?.status).toBe('different')
  })

  it('propaga las diferencias hacia las carpetas padre', async () => {
    await write(left, 'a/b/c/hoja.txt', 'izquierda')
    await write(right, 'a/b/c/hoja.txt', 'derecha!!')
    await write(left, 'sin-cambios/x.txt', 'x')
    await write(right, 'sin-cambios/x.txt', 'x')

    const { byPath } = await compare('content')
    expect(byPath.get('a')?.status).toBe('dirDiffers')
    expect(byPath.get('a/b')?.status).toBe('dirDiffers')
    expect(byPath.get('a/b/c')?.status).toBe('dirDiffers')
    expect(byPath.get('sin-cambios')?.status).toBe('dirSame')
  })

  it('marca una carpeta que solo existe en un lado', async () => {
    await write(left, 'solo-izq/dentro.txt', 'x')

    const { byPath } = await compare()
    expect(byPath.get('solo-izq')?.status).toBe('leftOnly')
  })

  it('detecta que un lado es archivo y el otro carpeta', async () => {
    await write(left, 'ambiguo', 'soy un archivo')
    await write(right, 'ambiguo/dentro.txt', 'soy una carpeta')

    const { byPath } = await compare()
    expect(byPath.get('ambiguo')?.status).toBe('typeConflict')
  })

  it('ordena las carpetas antes que los archivos en cada nivel', async () => {
    await write(left, 'zzz.txt', 'x')
    await write(left, 'aaa/dentro.txt', 'x')
    await write(left, 'bbb.txt', 'x')

    const { root: tree } = await compare()
    expect(tree.children?.map((child) => child.name)).toEqual(['aaa', 'bbb.txt', 'zzz.txt'])
  })

  it('devuelve un arbol vacio cuando las dos carpetas estan vacias', async () => {
    const { root: tree, stats } = await compare()
    expect(tree.children).toEqual([])
    expect(stats).toEqual({ same: 0, different: 0, leftOnly: 0, rightOnly: 0 })
  })
})
