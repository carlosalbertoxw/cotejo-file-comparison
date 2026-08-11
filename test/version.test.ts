import { describe, expect, it } from 'vitest'
import { formatVersion, isNewerVersion, parseVersion } from '../src/shared/version'

describe('parseVersion', () => {
  it('acepta la etiqueta del repositorio y la version de package.json', () => {
    expect(parseVersion('v1.2.3')).toEqual({ numbers: [1, 2, 3], prerelease: [] })
    expect(parseVersion('1.2.3')).toEqual({ numbers: [1, 2, 3], prerelease: [] })
  })

  it('separa el prelanzamiento y descarta los metadatos de build', () => {
    expect(parseVersion('1.0.0-rc.2')).toEqual({ numbers: [1, 0, 0], prerelease: ['rc', '2'] })
    expect(parseVersion('1.0.0+20260101')).toEqual({ numbers: [1, 0, 0], prerelease: [] })
  })

  it('rechaza lo que no es una version', () => {
    for (const value of ['', 'latest', '1.2', 'v1.2.3.4', 'uno.dos.tres']) {
      expect(parseVersion(value)).toBeNull()
    }
  })
})

describe('isNewerVersion', () => {
  it('compara numero a numero y no como texto', () => {
    expect(isNewerVersion('v0.2.0', '0.1.0')).toBe(true)
    expect(isNewerVersion('v0.10.0', '0.9.0')).toBe(true)
    expect(isNewerVersion('v1.0.1', '1.0.0')).toBe(true)
    expect(isNewerVersion('v0.1.0', '0.1.0')).toBe(false)
    expect(isNewerVersion('v0.1.0', '0.2.0')).toBe(false)
  })

  it('coloca el prelanzamiento antes de su version final', () => {
    expect(isNewerVersion('v1.0.0', '1.0.0-rc.1')).toBe(true)
    expect(isNewerVersion('v1.0.0-rc.1', '1.0.0')).toBe(false)
    expect(isNewerVersion('v1.0.0-rc.2', '1.0.0-rc.1')).toBe(true)
    expect(isNewerVersion('v1.0.0-rc.1', '1.0.0-rc.1.1')).toBe(false)
    expect(isNewerVersion('v1.0.0-beta', '1.0.0-alpha')).toBe(true)
  })

  // Una etiqueta rara no debe acabar en un aviso de actualizacion inventado.
  it('calla ante una version ilegible', () => {
    expect(isNewerVersion('nightly', '0.1.0')).toBe(false)
    expect(isNewerVersion('v9.9.9', 'desconocida')).toBe(false)
  })
})

describe('formatVersion', () => {
  it('escribe una sola forma venga de donde venga', () => {
    expect(formatVersion('0.1.0')).toBe('v0.1.0')
    expect(formatVersion('v0.1.0')).toBe('v0.1.0')
  })
})
