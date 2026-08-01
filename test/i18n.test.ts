import { describe, expect, it } from 'vitest'
import es from '../src/renderer/i18n/locales/es.json'
import en from '../src/renderer/i18n/locales/en.json'
import fr from '../src/renderer/i18n/locales/fr.json'
import pt from '../src/renderer/i18n/locales/pt.json'

type Catalog = Record<string, unknown>

function flattenKeys(value: Catalog, prefix = '', out: string[] = []): string[] {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child !== null && typeof child === 'object') flattenKeys(child as Catalog, path, out)
    else out.push(path)
  }
  return out
}

const SOURCE_KEYS = flattenKeys(es).sort()

describe('catalogos de traduccion', () => {
  // La paridad total atrapa claves olvidadas y pares _one/_other incompletos.
  it.each([
    ['en', en],
    ['fr', fr],
    ['pt', pt]
  ] as const)('%s tiene exactamente las mismas claves que es', (_name, catalog) => {
    expect(flattenKeys(catalog as Catalog).sort()).toEqual(SOURCE_KEYS)
  })

  it('ninguna traduccion esta vacia', () => {
    for (const catalog of [es, en, fr, pt]) {
      const walk = (value: Catalog): void => {
        for (const child of Object.values(value)) {
          if (child !== null && typeof child === 'object') walk(child as Catalog)
          else expect(String(child).trim()).not.toBe('')
        }
      }
      walk(catalog as Catalog)
    }
  })
})
