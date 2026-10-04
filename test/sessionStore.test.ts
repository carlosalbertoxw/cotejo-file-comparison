import { describe, expect, it } from 'vitest'
import { hasUnsavedWork, samePath, titleFor, type Tab } from '@renderer/state/sessionStore'

describe('samePath', () => {
  it('da igual como se escriban las barras', () => {
    expect(samePath('C:\\datos\\notas.txt', 'C:/datos/notas.txt', false)).toBe(true)
  })

  it('ignora la barra final', () => {
    expect(samePath('C:/datos/', 'C:/datos', false)).toBe(true)
  })

  it('rutas distintas siguen siendo distintas', () => {
    expect(samePath('C:/datos/a.txt', 'C:/datos/b.txt', false)).toBe(false)
  })

  it('las mayusculas cuentan solo donde el sistema las distingue', () => {
    expect(samePath('/datos/Notas.txt', '/datos/notas.txt', true)).toBe(true)
    expect(samePath('/datos/Notas.txt', '/datos/notas.txt', false)).toBe(false)
  })

  it('dos lados vacios son el mismo lado vacio', () => {
    expect(samePath(null, null, false)).toBe(true)
    expect(samePath(null, 'C:/datos/a.txt', false)).toBe(false)
  })
})

describe('titleFor', () => {
  it('un solo nombre cuando los dos lados se llaman igual', () => {
    expect(titleFor('a/notas.txt', 'b/notas.txt')).toBe('notas.txt')
  })

  it('los dos nombres cuando difieren', () => {
    expect(titleFor('a/uno.txt', 'b/dos.txt')).toBe('uno.txt ↔ dos.txt')
  })

  it('sin rutas no hay titulo: lo pone quien renderiza, traducido', () => {
    expect(titleFor(null, null)).toBe('')
  })
})

describe('hasUnsavedWork', () => {
  const tab: Tab = {
    id: 'tab-1',
    kind: 'text',
    leftPath: null,
    rightPath: null,
    title: '',
    dirty: false
  }

  it('una pestana limpia se cierra sin preguntar', () => {
    expect(hasUnsavedWork(tab)).toBe(false)
    expect(hasUnsavedWork({ ...tab, scratch: false })).toBe(false)
  })

  it('pregunta si hay archivos con cambios', () => {
    expect(hasUnsavedWork({ ...tab, dirty: true })).toBe(true)
  })

  it('pregunta tambien por el texto escrito sin archivo, que no tiene donde guardarse', () => {
    expect(hasUnsavedWork({ ...tab, scratch: true })).toBe(true)
  })
})
