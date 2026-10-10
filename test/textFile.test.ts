import { chmod, link, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir, userInfo } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseIpcError } from '../src/shared/ipc-errors'
import {
  decodeText,
  detectEol,
  encodeText,
  isValidUtf8,
  looksBinary,
  readTextFile,
  writeTextFile
} from '../src/main/services/textFile'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cotejo-text-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('detectEol', () => {
  it('reconoce LF, CRLF y mezcla', () => {
    expect(detectEol('a\nb\n')).toBe('lf')
    expect(detectEol('a\r\nb\r\n')).toBe('crlf')
    expect(detectEol('a\r\nb\n')).toBe('mixed')
  })

  it('trata un archivo sin saltos de linea como LF', () => {
    expect(detectEol('una sola linea')).toBe('lf')
  })
})

describe('looksBinary', () => {
  it('detecta un byte nulo', () => {
    expect(looksBinary(Buffer.from([0x4d, 0x5a, 0x00, 0x01]))).toBe(true)
  })

  it('acepta texto normal, incluidos acentos y emojis', () => {
    expect(looksBinary(Buffer.from('función año 🚀', 'utf8'))).toBe(false)
  })
})

describe('decodeText / encodeText', () => {
  it('normaliza CRLF a LF al leer y lo restaura al escribir', () => {
    const decoded = decodeText(Buffer.from('a\r\nb\r\n', 'utf8'))
    expect(decoded.content).toBe('a\nb\n')
    expect(decoded.eol).toBe('crlf')
    expect(encodeText(decoded.content, decoded.eol, decoded.encoding)).toBe('a\r\nb\r\n')
  })

  it('quita el BOM al leer y lo vuelve a poner al escribir', () => {
    const decoded = decodeText(Buffer.from('﻿hola\n', 'utf8'))
    expect(decoded.content).toBe('hola\n')
    expect(decoded.encoding).toBe('utf8-bom')
    expect(encodeText(decoded.content, decoded.eol, decoded.encoding)).toBe('﻿hola\n')
  })

  it('deja intacto un archivo LF sin BOM', () => {
    const original = 'a\nb\n'
    const decoded = decodeText(Buffer.from(original, 'utf8'))
    expect(encodeText(decoded.content, decoded.eol, decoded.encoding)).toBe(original)
  })
})

describe('lectura y escritura sobre disco', () => {
  it('conserva los finales de linea CRLF despues de editar y guardar', async () => {
    const path = join(dir, 'crlf.txt')
    await writeFile(path, 'uno\r\ndos\r\ntres\r\n', 'utf8')

    const payload = await readTextFile(path)
    expect(payload.content).toBe('uno\ndos\ntres\n')
    expect(payload.eol).toBe('crlf')

    // El renderer edita en LF, como siempre.
    const edited = payload.content.replace('dos', 'DOS')
    await writeTextFile(path, edited, payload.eol, payload.encoding)

    expect(await readFile(path, 'utf8')).toBe('uno\r\nDOS\r\ntres\r\n')
  })

  it('conserva el BOM despues de editar y guardar', async () => {
    const path = join(dir, 'bom.txt')
    await writeFile(path, '﻿hola\nmundo\n', 'utf8')

    const payload = await readTextFile(path)
    await writeTextFile(path, `${payload.content}fin\n`, payload.eol, payload.encoding)

    expect(await readFile(path, 'utf8')).toBe('﻿hola\nmundo\nfin\n')
  })

  it('rechaza un archivo binario con un error codificado', async () => {
    const path = join(dir, 'binario.bin')
    await writeFile(path, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a]))
    const error = await readTextFile(path).then(
      () => null,
      (reason: Error) => reason
    )
    expect(error).toBeInstanceOf(Error)
    expect(parseIpcError((error as Error).message)).toMatchObject({
      code: 'binaryFile',
      params: { path }
    })
  })

  it('rechaza una carpeta con un error codificado', async () => {
    const error = await readTextFile(dir).then(
      () => null,
      (reason: Error) => reason
    )
    expect(error).toBeInstanceOf(Error)
    expect(parseIpcError((error as Error).message)).toMatchObject({
      code: 'notAFile',
      params: { path: dir }
    })
  })

  it('devuelve tamaño y fecha junto al contenido', async () => {
    const path = join(dir, 'a.txt')
    await writeFile(path, 'hola', 'utf8')
    const payload = await readTextFile(path)
    expect(payload.size).toBe(4)
    expect(payload.mtimeMs).toBeGreaterThan(0)
    expect(payload.path).toBe(path)
  })
})

describe('isValidUtf8', () => {
  it('acepta UTF-8 con acentos, eñes y emojis', () => {
    expect(isValidUtf8(Buffer.from('añoración 🌐', 'utf8'))).toBe(true)
  })

  it('rechaza bytes que no forman UTF-8', () => {
    // 0xF1 es «ñ» en Windows-1252; en UTF-8 anuncia una secuencia que no llega.
    expect(isValidUtf8(Buffer.from([0x61, 0xf1, 0x6f]))).toBe(false)
  })

  it('acepta un archivo vacio', () => {
    expect(isValidUtf8(Buffer.alloc(0))).toBe(true)
  })
})

describe('decodeText: codificacion con perdida', () => {
  it('marca como lossy lo que no era UTF-8', () => {
    const latin1 = Buffer.from([0x61, 0xf1, 0x6f]) // «año» en Windows-1252
    expect(decodeText(latin1).lossy).toBe(true)
  })

  it('no marca lo que si era UTF-8', () => {
    expect(decodeText(Buffer.from('año', 'utf8')).lossy).toBe(false)
  })
})

describe('readTextFile: codificacion', () => {
  it('un archivo en Windows-1252 se lee, pero avisando de la perdida', async () => {
    const path = join(dir, 'latin1.txt')
    await writeFile(path, Buffer.from([0x61, 0xf1, 0x6f, 0x0a]))

    const payload = await readTextFile(path)

    // Se puede comparar: el contenido llega, con los rombos de sustitucion.
    expect(payload.content).toContain('\uFFFD')
    // Y queda dicho que guardarlo escribiria esos rombos en el disco.
    expect(payload.lossy).toBe(true)
  })
})

describe('writeTextFile: cambios ajenos en el disco', () => {
  it('se niega a escribir si el archivo cambio desde que se leyo', async () => {
    const path = join(dir, 'a.txt')
    await writeFile(path, 'original\n', 'utf8')
    const payload = await readTextFile(path)

    // Otro programa lo modifica mientras estaba abierto.
    await writeFile(path, 'lo que escribio otro\n', 'utf8')

    const error = await writeTextFile(path, 'lo mio\n', payload.eol, payload.encoding, {
      mtimeMs: payload.mtimeMs,
      size: payload.size
    }).catch((e: Error) => e)

    expect(parseIpcError((error as Error).message)?.code).toBe('fileChangedOnDisk')
    // Y sobre todo: no se escribio nada.
    expect(await readFile(path, 'utf8')).toBe('lo que escribio otro\n')
  })

  it('escribe cuando el archivo sigue como estaba', async () => {
    const path = join(dir, 'a.txt')
    await writeFile(path, 'original\n', 'utf8')
    const payload = await readTextFile(path)

    await writeTextFile(path, 'editado\n', payload.eol, payload.encoding, {
      mtimeMs: payload.mtimeMs,
      size: payload.size
    })

    expect(await readFile(path, 'utf8')).toBe('editado\n')
  })

  it('sin estado esperado escribe igualmente: es el «guardar de todas formas»', async () => {
    const path = join(dir, 'a.txt')
    await writeFile(path, 'original\n', 'utf8')
    const payload = await readTextFile(path)
    await writeFile(path, 'de otro\n', 'utf8')

    await writeTextFile(path, 'a la fuerza\n', payload.eol, payload.encoding)

    expect(await readFile(path, 'utf8')).toBe('a la fuerza\n')
  })

  it('devuelve el tamaño y la fecha nuevos', async () => {
    const path = join(dir, 'a.txt')
    await writeFile(path, 'x\n', 'utf8')

    const info = await writeTextFile(path, 'mucho mas largo\n', 'lf', 'utf8')

    expect(info.size).toBe(Buffer.byteLength('mucho mas largo\n'))
    expect(info.mtimeMs).toBeGreaterThan(0)
  })
})

describe('writeTextFile: escritura atomica', () => {
  it('no deja archivos temporales por el camino', async () => {
    const path = join(dir, 'a.txt')
    await writeFile(path, 'original\n', 'utf8')

    await writeTextFile(path, 'editado\n', 'lf', 'utf8')

    expect(await readdir(dir)).toEqual(['a.txt'])
  })

  it('el archivo nunca queda a medias: o lo viejo o lo nuevo', async () => {
    const path = join(dir, 'a.txt')
    await writeFile(path, 'viejo\n', 'utf8')

    await writeTextFile(path, 'nuevo del todo\n', 'lf', 'utf8')

    const final = await readFile(path, 'utf8')
    expect(['viejo\n', 'nuevo del todo\n']).toContain(final)
    expect(final).toBe('nuevo del todo\n')
  })
})

describe('writeTextFile: el temporal', () => {
  it('dos guardados a la vez en la misma carpeta no se pisan el temporal', async () => {
    // Con un temporal nombrado por la hora, dos guardados en el mismo
    // milisegundo compartian archivo y uno fallaba o mezclaba contenidos.
    const paths = Array.from({ length: 20 }, (_, index) => join(dir, `f${index}.txt`))
    await Promise.all(paths.map((path) => writeFile(path, 'viejo\n', 'utf8')))

    await Promise.all(
      paths.map((path, index) => writeTextFile(path, `nuevo ${index}\n`, 'lf', 'utf8'))
    )

    for (const [index, path] of paths.entries()) {
      expect(await readFile(path, 'utf8')).toBe(`nuevo ${index}\n`)
    }
    expect((await readdir(dir)).filter((name) => name.endsWith('.cotejo-tmp'))).toEqual([])
  })
})

describe('writeTextFile: lo que el archivo era además de su contenido', () => {
  // En Windows el modo solo refleja el atributo de solo lectura; los permisos
  // de verdad son ACL, y se comprueban aparte con las herramientas del sistema.
  const posix = process.platform !== 'win32'
  const windows = process.platform === 'win32'

  /** Las letras de atributo que `attrib` pone delante de la ruta. */
  function attributes(path: string): string {
    const line = execFileSync('attrib', [path], { encoding: 'utf8' })
    return line.slice(0, line.indexOf(path))
  }

  it.runIf(windows)('un archivo oculto sigue oculto después de guardarlo', async () => {
    const path = join(dir, '.env')
    await writeFile(path, 'CLAVE=vieja\n', 'utf8')
    execFileSync('attrib', ['+h', path])

    await writeTextFile(path, 'CLAVE=nueva\n', 'lf', 'utf8')

    expect(await readFile(path, 'utf8')).toBe('CLAVE=nueva\n')
    expect(attributes(path)).toContain('H')
    expect(await readdir(dir)).toEqual(['.env'])
  })

  it.runIf(windows)('un archivo restringido no hereda la ACL de la carpeta', async () => {
    const path = join(dir, 'privado.txt')
    await writeFile(path, 'viejo\n', 'utf8')
    // Sin herencia y con acceso solo para quien ejecuta la prueba.
    execFileSync('icacls', [path, '/inheritance:r', '/grant:r', `${userInfo().username}:(F)`])

    await writeTextFile(path, 'nuevo\n', 'lf', 'utf8')

    expect(await readFile(path, 'utf8')).toBe('nuevo\n')
    // `(I)` marca las entradas heredadas: no tiene que aparecer ninguna.
    expect(execFileSync('icacls', [path], { encoding: 'utf8' })).not.toContain('(I)')
  })

  it.runIf(windows)('un archivo de solo lectura no se guarda ni deja temporales', async () => {
    const path = join(dir, 'fijo.txt')
    await writeFile(path, 'viejo\n', 'utf8')
    execFileSync('attrib', ['+r', path])

    try {
      await expect(writeTextFile(path, 'nuevo\n', 'lf', 'utf8')).rejects.toMatchObject({
        code: 'EPERM'
      })
      expect(await readFile(path, 'utf8')).toBe('viejo\n')
      expect(await readdir(dir)).toEqual(['fijo.txt'])
    } finally {
      // Si no, `rm` del afterEach no puede borrarlo.
      execFileSync('attrib', ['-r', path])
    }
  })

  it.runIf(posix)('un script sigue siendo ejecutable después de guardarlo', async () => {
    const path = join(dir, 'deploy.sh')
    await writeFile(path, 'echo viejo\n', 'utf8')
    await chmod(path, 0o755)

    await writeTextFile(path, 'echo nuevo\n', 'lf', 'utf8')

    expect((await stat(path)).mode & 0o777).toBe(0o755)
  })

  it.runIf(posix)('un archivo privado no se vuelve legible para otros', async () => {
    const path = join(dir, '.env')
    await writeFile(path, 'CLAVE=vieja\n', 'utf8')
    await chmod(path, 0o600)

    await writeTextFile(path, 'CLAVE=nueva\n', 'lf', 'utf8')

    expect((await stat(path)).mode & 0o777).toBe(0o600)
  })

  it('los enlaces duros siguen compartiendo el contenido', async () => {
    const path = join(dir, 'a.txt')
    const other = join(dir, 'b.txt')
    await writeFile(path, 'viejo\n', 'utf8')
    await link(path, other)

    await writeTextFile(path, 'nuevo\n', 'lf', 'utf8')

    expect(await readFile(other, 'utf8')).toBe('nuevo\n')
    expect((await stat(path)).nlink).toBe(2)
    expect((await readdir(dir)).sort()).toEqual(['a.txt', 'b.txt'])
  })
})
