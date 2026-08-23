import { describe, expect, it } from 'vitest'
import { joinPath, separatorOf } from '../src/shared/paths'

describe('separatorOf', () => {
  it('respeta el separador que ya usa la raiz', () => {
    expect(separatorOf('C:\\datos', '/')).toBe('\\')
    expect(separatorOf('/home/carlos', '\\')).toBe('/')
  })

  it('la barra invertida manda si estan las dos', () => {
    expect(separatorOf('C:\\datos/sub', '/')).toBe('\\')
  })

  it('sin ninguna barra, el de la plataforma', () => {
    expect(separatorOf('datos', '\\')).toBe('\\')
    expect(separatorOf('', '/')).toBe('/')
  })
})

describe('joinPath', () => {
  it('une con el separador de la raiz', () => {
    expect(joinPath('C:\\datos', 'sub/a.txt', '\\')).toBe('C:\\datos\\sub\\a.txt')
    expect(joinPath('/home/carlos', 'sub/a.txt', '/')).toBe('/home/carlos/sub/a.txt')
  })

  it('una raiz escrita con barras normales en Windows no se mezcla', () => {
    // Es lo que se gana respecto a imponer el separador del sistema: la ruta
    // sigue leyendose como la escribio el usuario.
    expect(joinPath('C:/proyectos', 'sub/a.txt', '\\')).toBe('C:/proyectos/sub/a.txt')
  })

  it('no duplica la barra cuando la raiz ya termina en una', () => {
    expect(joinPath('C:\\datos\\', 'a.txt', '\\')).toBe('C:\\datos\\a.txt')
    expect(joinPath('/home/carlos//', 'a.txt', '/')).toBe('/home/carlos/a.txt')
  })

  it('una ruta relativa vacia devuelve la propia raiz', () => {
    expect(joinPath('C:\\datos', '', '\\')).toBe('C:\\datos')
  })

  it('convierte todos los tramos, no solo el primero', () => {
    expect(joinPath('C:\\d', 'a/b/c.txt', '\\')).toBe('C:\\d\\a\\b\\c.txt')
  })
})
