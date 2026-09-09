import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SEARCH_OPTIONS,
  findMatches,
  indexAtOrAfter,
  stepIndex,
  type SearchOptions
} from '@renderer/components/text/search'

function search(doc: string, query: string, options: Partial<SearchOptions> = {}) {
  return findMatches(doc, query, { ...DEFAULT_SEARCH_OPTIONS, ...options })
}

/** Los textos de las coincidencias, para leer los casos sin contar posiciones. */
function texts(doc: string, query: string, options: Partial<SearchOptions> = {}): string[] {
  return search(doc, query, options).matches.map((match) => doc.slice(match.from, match.to))
}

describe('findMatches', () => {
  it('sin consulta no busca nada', () => {
    expect(search('hola', '').matches).toEqual([])
  })

  it('devuelve las posiciones de cada coincidencia', () => {
    expect(search('ab-ab', 'ab').matches).toEqual([
      { from: 0, to: 2 },
      { from: 3, to: 5 }
    ])
  })

  it('ignora mayusculas por defecto y las respeta si se pide', () => {
    expect(texts('Casa casa', 'casa')).toEqual(['Casa', 'casa'])
    expect(texts('Casa casa', 'casa', { matchCase: true })).toEqual(['casa'])
  })

  it('trata la consulta como texto literal, no como expresion', () => {
    expect(texts('a.c abc', 'a.c')).toEqual(['a.c'])
    expect(texts('a.c abc', 'a.c', { regex: true })).toEqual(['a.c', 'abc'])
  })

  it('busca a traves de las lineas por posicion absoluta', () => {
    expect(search('uno\ndos\nuno', 'uno').matches).toEqual([
      { from: 0, to: 3 },
      { from: 8, to: 11 }
    ])
  })

  describe('palabra completa', () => {
    it('descarta lo que va pegado a otra letra', () => {
      expect(texts('casa casas encasa', 'casa', { wholeWord: true })).toEqual(['casa'])
    })

    // El caso que rompe con \b: el limite de palabra no existe cuando la
    // consulta empieza o acaba en algo que no es letra.
    it('encuentra consultas que empiezan o acaban en simbolo', () => {
      expect(texts('(x) a(x)b', '(x)', { wholeWord: true })).toEqual(['(x)'])
      expect(texts('leer .txt y .txtx', '.txt', { wholeWord: true })).toEqual(['.txt'])
    })
  })

  describe('expresiones regulares', () => {
    it('avisa de la que no compila en vez de reventar', () => {
      expect(search('abc', 'a(', { regex: true })).toEqual({
        matches: [],
        truncated: false,
        invalid: true
      })
    })

    it('no se queda colgada con una que casa la cadena vacia', () => {
      expect(texts('aXa', 'a*', { regex: true })).toEqual(['a', 'a'])
    })
  })

  it('corta al llegar al tope y lo dice', () => {
    const result = search('a'.repeat(6000), 'a')
    expect(result.matches).toHaveLength(5000)
    expect(result.truncated).toBe(true)
  })
})

describe('indexAtOrAfter', () => {
  const matches = [
    { from: 0, to: 1 },
    { from: 10, to: 11 },
    { from: 20, to: 21 }
  ]

  it('elige la primera que empieza en la posicion o despues', () => {
    expect(indexAtOrAfter(matches, 0)).toBe(0)
    expect(indexAtOrAfter(matches, 1)).toBe(1)
    expect(indexAtOrAfter(matches, 20)).toBe(2)
  })

  it('vuelve a la primera cuando ya no queda ninguna por delante', () => {
    expect(indexAtOrAfter(matches, 999)).toBe(0)
  })

  it('sin coincidencias no hay ninguna actual', () => {
    expect(indexAtOrAfter([], 0)).toBe(-1)
  })
})

describe('stepIndex', () => {
  it('avanza y retrocede dando la vuelta', () => {
    expect(stepIndex(3, 0, 1)).toBe(1)
    expect(stepIndex(3, 2, 1)).toBe(0)
    expect(stepIndex(3, 0, -1)).toBe(2)
  })

  it('desde ninguna, siguiente es la primera y anterior es la ultima', () => {
    expect(stepIndex(3, -1, 1)).toBe(0)
    expect(stepIndex(3, -1, -1)).toBe(1)
  })

  it('sin coincidencias no se mueve a ningun sitio', () => {
    expect(stepIndex(0, -1, 1)).toBe(-1)
  })
})
