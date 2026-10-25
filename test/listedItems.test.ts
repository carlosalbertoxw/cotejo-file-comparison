import { describe, expect, it } from 'vitest'
import type { DirNode, EntryStat, NodeStatus } from '../src/shared/types'
import { listedItems } from '../src/renderer/components/dir/listedItems'

const FILE: EntryStat = { isDir: false, size: 1, mtimeMs: 0 }
const DIR: EntryStat = { isDir: true, size: 0, mtimeMs: 0 }

function node(
  relPath: string,
  status: NodeStatus,
  sides: { left?: EntryStat; right?: EntryStat },
  children?: DirNode[]
): DirNode {
  const entry = sides.left ?? sides.right
  return {
    relPath,
    name: relPath.split('/').at(-1) as string,
    isDir: entry?.isDir === true,
    left: sides.left ?? null,
    right: sides.right ?? null,
    status,
    children
  }
}

// src/
//   a.ts        distinto
//   igual.ts    igual
//   nuevo.ts    solo a la izquierda
//   lib/        sin diferencias
//     b.ts      igual
//   der.ts      solo a la derecha
const src = node('src', 'dirDiffers', { left: DIR, right: DIR }, [
  node('src/a.ts', 'different', { left: FILE, right: FILE }),
  node('src/igual.ts', 'same', { left: FILE, right: FILE }),
  node('src/nuevo.ts', 'leftOnly', { left: FILE }),
  node('src/lib', 'dirSame', { left: DIR, right: DIR }, [
    node('src/lib/b.ts', 'same', { left: FILE, right: FILE })
  ]),
  node('src/der.ts', 'rightOnly', { right: FILE })
])

const paths = (items: { relPath: string }[]): string[] => items.map((item) => item.relPath)

describe('listedItems', () => {
  it('baja por la carpeta y lleva cada cosa que existe en el origen', () => {
    expect(paths(listedItems([src], 'left', false))).toEqual([
      'src',
      'src/a.ts',
      'src/igual.ts',
      'src/nuevo.ts',
      'src/lib',
      'src/lib/b.ts'
    ])
  })

  it('con «Solo diferencias» deja fuera lo igual, como la tabla', () => {
    expect(paths(listedItems([src], 'left', true))).toEqual(['src', 'src/a.ts', 'src/nuevo.ts'])
  })

  it('desde la derecha solo lleva lo que esta a la derecha', () => {
    expect(paths(listedItems([src], 'right', true))).toEqual(['src', 'src/a.ts', 'src/der.ts'])
  })

  it('marca las carpetas como carpetas', () => {
    const items = listedItems([src], 'left', false)
    expect(items.find((item) => item.relPath === 'src/lib')?.isDir).toBe(true)
    expect(items.find((item) => item.relPath === 'src/a.ts')?.isDir).toBe(false)
  })

  it('un elemento seleccionado va aunque el filtro lo esconda', () => {
    const igual = src.children?.[1] as DirNode
    expect(paths(listedItems([igual], 'left', true))).toEqual(['src/igual.ts'])
  })

  it('no repite lo que cuelga de una carpeta tambien seleccionada', () => {
    const a = src.children?.[0] as DirNode
    const items = listedItems([a, src], 'left', true)
    expect(paths(items).sort()).toEqual(['src', 'src/a.ts', 'src/nuevo.ts'])
  })

  it('en un conflicto de tipos manda lo que hay en el lado de origen', () => {
    const conflict = node('x', 'typeConflict', { left: FILE, right: DIR })
    expect(listedItems([conflict], 'left', false)).toEqual([
      { relPath: 'x', isDir: false, from: 'left' }
    ])
    expect(listedItems([conflict], 'right', false)).toEqual([
      { relPath: 'x', isDir: true, from: 'right' }
    ])
  })
})
