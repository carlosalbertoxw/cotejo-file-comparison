/**
 * La frontera de confianza del proceso principal: todo lo que llega por IPC
 * pasa por aqui antes de tocar el disco.
 *
 * Lo que importa probar son los rechazos. Que un mensaje bien formado pase ya
 * lo cubren, de rebote, las pruebas de los servicios; que uno mal formado no
 * pase no lo cubre nadie mas, y es justo lo que un cambio descuidado puede
 * aflojar sin que falle nada.
 */

import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseIpcError } from '../src/shared/ipc-errors'
import { DEFAULT_FILTERS } from '../src/shared/types'
import {
  asCloseGuard,
  asCompareRequest,
  asEnum,
  asExpectedState,
  asFileOpRequest,
  asPath,
  asString
} from '../src/main/ipc/validate'

/** El campo que se rechazo, o `null` si no se rechazo nada. */
function rejected(run: () => unknown): string | null {
  try {
    run()
    return null
  } catch (error) {
    const payload = parseIpcError((error as Error).message)
    expect(payload?.code).toBe('badRequest')
    return String(payload?.params?.['field'])
  }
}

describe('asString y asPath', () => {
  it('rechazan lo que no es una cadena', () => {
    for (const value of [undefined, null, 42, {}, ['a'], true]) {
      expect(rejected(() => asString(value, 'x'))).toBe('x')
      expect(rejected(() => asPath(value, 'ruta'))).toBe('ruta')
    }
  })

  it('una ruta no puede estar vacia', () => {
    expect(rejected(() => asPath('', 'ruta'))).toBe('ruta')
  })

  it('una ruta no puede llevar un byte nulo', () => {
    // El sistema la cortaria ahi y abriria otro archivo del que parece.
    expect(rejected(() => asPath('secreto.txt\0.png', 'ruta'))).toBe('ruta')
  })

  it('una ruta absoluta pasa tal cual', () => {
    const absolute = resolve('datos', 'a.txt')
    expect(asPath(absolute, 'ruta')).toBe(absolute)
  })

  it('una ruta relativa se rechaza con su propio aviso', () => {
    // Se resolveria contra la carpeta de trabajo del proceso principal, que no
    // es nada que el usuario haya elegido.
    for (const path of ['a.txt', 'datos/a.txt', '../a.txt']) {
      let code: string | undefined
      try {
        asPath(path, 'ruta')
      } catch (error) {
        code = parseIpcError((error as Error).message)?.code
      }
      expect(code).toBe('pathNotAbsolute')
    }
  })
})

describe('asEnum', () => {
  it('solo acepta los valores de la lista', () => {
    expect(asEnum('lf', ['lf', 'crlf'], 'eol')).toBe('lf')
    expect(rejected(() => asEnum('cr', ['lf', 'crlf'], 'eol'))).toBe('eol')
    expect(rejected(() => asEnum(0, ['lf', 'crlf'], 'eol'))).toBe('eol')
  })
})

describe('asExpectedState', () => {
  it('sin estado no hay nada que comprobar', () => {
    expect(asExpectedState(undefined, 'expected')).toBeUndefined()
    expect(asExpectedState(null, 'expected')).toBeUndefined()
  })

  it('rechaza numeros que no son finitos', () => {
    // NaN nunca es igual a nada: la comprobacion de cambios en disco fallaria
    // siempre, o peor, dejaria de detectar nada segun como se escribiera.
    expect(rejected(() => asExpectedState({ mtimeMs: NaN, size: 1 }, 'e'))).toBe('e.mtimeMs')
    expect(rejected(() => asExpectedState({ mtimeMs: 1, size: Infinity }, 'e'))).toBe('e.size')
    expect(rejected(() => asExpectedState({ mtimeMs: '1', size: 1 }, 'e'))).toBe('e.mtimeMs')
  })
})

describe('asCompareRequest', () => {
  const valid = { leftRoot: '/a', rightRoot: '/b', mode: 'quick' }

  it('sin filtros usa los de por defecto', () => {
    expect(asCompareRequest(valid).filters).toEqual(DEFAULT_FILTERS)
  })

  it('rechaza un modo desconocido', () => {
    expect(rejected(() => asCompareRequest({ ...valid, mode: 'rapido' }))).toBe('request.mode')
  })

  it('rechaza raices que no son rutas', () => {
    expect(rejected(() => asCompareRequest({ ...valid, leftRoot: '' }))).toBe('request.leftRoot')
    expect(rejected(() => asCompareRequest({ ...valid, rightRoot: 7 }))).toBe('request.rightRoot')
  })

  it('pone tope a la cantidad de globs', () => {
    const filters = { exclude: Array(201).fill('*.log'), include: [], includeHidden: false }
    expect(rejected(() => asCompareRequest({ ...valid, filters }))).toBe('request.filters')
  })

  it('rechaza globs que no son cadenas', () => {
    const filters = { exclude: ['*.log', 3], include: [], includeHidden: false }
    expect(rejected(() => asCompareRequest({ ...valid, filters }))).toBe(
      'request.filters.exclude[1]'
    )
  })

  it('rechaza lo que no es un objeto', () => {
    expect(rejected(() => asCompareRequest(null))).toBe('request')
    expect(rejected(() => asCompareRequest([valid]))).toBe('request')
  })
})

describe('asFileOpRequest', () => {
  const item = { relPath: 'docs/a.md', isDir: false, from: 'left' }
  const valid = {
    operationId: 'op-1',
    kind: 'copy',
    leftRoot: '/a',
    rightRoot: '/b',
    items: [item]
  }

  it('acepta una operacion bien formada', () => {
    expect(asFileOpRequest(valid).items).toEqual([item])
  })

  it('rechaza una operacion desconocida', () => {
    expect(rejected(() => asFileOpRequest({ ...valid, kind: 'format' }))).toBe('request.kind')
  })

  it('rechaza rutas relativas vacias o con byte nulo', () => {
    for (const relPath of ['', 'a\0b']) {
      expect(rejected(() => asFileOpRequest({ ...valid, items: [{ ...item, relPath }] }))).toBe(
        'request.items[0].relPath'
      )
    }
  })

  it('rechaza un lado que no existe', () => {
    expect(
      rejected(() => asFileOpRequest({ ...valid, items: [{ ...item, from: 'center' }] }))
    ).toBe('request.items[0].from')
  })

  it('pone tope a la cantidad de elementos', () => {
    const items = Array(100_001).fill(item)
    expect(rejected(() => asFileOpRequest({ ...valid, items }))).toBe('request.items')
  })

  it('rechaza una lista de elementos que no es una lista', () => {
    expect(rejected(() => asFileOpRequest({ ...valid, items: item }))).toBe('request.items')
  })

  it('sin filtros usa los de por defecto, y los mal formados se rechazan', () => {
    expect(asFileOpRequest(valid).filters).toEqual(DEFAULT_FILTERS)
    const filters = { exclude: '*.log', include: [], includeHidden: false }
    expect(rejected(() => asFileOpRequest({ ...valid, filters }))).toBe('request.filters.exclude')
  })
})

describe('asCloseGuard', () => {
  const valid = {
    title: 'Cotejo',
    message: 'Hay trabajo sin guardar.',
    detail: 'Una pestaña tiene cambios.',
    discard: 'Cerrar sin guardar',
    cancel: 'Cancelar'
  }

  it('acepta null, que quita el aviso', () => {
    expect(asCloseGuard(null)).toBeNull()
  })

  it('reconstruye el aviso con solo los campos conocidos', () => {
    expect(asCloseGuard({ ...valid, extra: 'no' })).toEqual(valid)
  })

  it('rechaza un texto que falta o que no cabe en un dialogo', () => {
    expect(rejected(() => asCloseGuard({ ...valid, cancel: undefined }))).toBe('guard.cancel')
    expect(rejected(() => asCloseGuard({ ...valid, detail: 'x'.repeat(1001) }))).toBe(
      'guard.detail'
    )
  })
})
