import { describe, expect, it } from 'vitest'
import { DEFAULT_DIFF_OPTIONS, DEFAULT_FILTERS } from '@shared/types'
import { mergePersistedSettings } from '@renderer/state/settingsStore'

const current = {
  diffOptions: DEFAULT_DIFF_OPTIONS,
  compareMode: 'quick' as const,
  filters: DEFAULT_FILTERS,
  onlyDifferences: false,
  language: 'es' as const,
  setLanguage: (): void => undefined
}

describe('mergePersistedSettings', () => {
  it('conserva lo que el usuario guardo', () => {
    const merged = mergePersistedSettings(
      {
        diffOptions: { ...DEFAULT_DIFF_OPTIONS, ignoreCase: true, tabSize: 2 },
        compareMode: 'content',
        filters: { exclude: ['*.log'], include: ['src/**'], includeHidden: true },
        onlyDifferences: true,
        language: 'fr'
      },
      current
    )
    expect(merged.diffOptions).toEqual({ ...DEFAULT_DIFF_OPTIONS, ignoreCase: true, tabSize: 2 })
    expect(merged.compareMode).toBe('content')
    expect(merged.filters).toEqual({ exclude: ['*.log'], include: ['src/**'], includeHidden: true })
    expect(merged.onlyDifferences).toBe(true)
    expect(merged.language).toBe('fr')
  })

  it('completa con los valores por defecto los campos que una version anterior no guardaba', () => {
    // Unos filtros guardados antes de que existiera `includeHidden`: con el merge
    // superficial llegaria `undefined` y el proceso principal rechazaria la
    // comparacion de carpetas.
    const merged = mergePersistedSettings(
      { filters: { exclude: ['*.log'], include: [] }, diffOptions: { ignoreCase: true } },
      current
    )
    expect(merged.filters).toEqual({ exclude: ['*.log'], include: [], includeHidden: false })
    expect(merged.diffOptions).toEqual({ ...DEFAULT_DIFF_OPTIONS, ignoreCase: true })
  })

  it('descarta lo que no tiene el tipo esperado o ya no existe', () => {
    const merged = mergePersistedSettings(
      {
        diffOptions: { tabSize: '4', ignoreCase: 'si' },
        filters: { exclude: [1, 2], include: 'src/**', includeHidden: 0 },
        compareMode: 'telepatia',
        onlyDifferences: 'no',
        language: 'tlh'
      },
      current
    )
    expect(merged.diffOptions).toEqual(DEFAULT_DIFF_OPTIONS)
    expect(merged.filters).toEqual(DEFAULT_FILTERS)
    expect(merged.compareMode).toBe('quick')
    expect(merged.onlyDifferences).toBe(false)
    expect(merged.language).toBe('es')
  })

  it('no pierde las acciones del estado actual', () => {
    const merged = mergePersistedSettings({ language: 'en' }, current)
    expect(merged.setLanguage).toBe(current.setLanguage)
  })

  it('sin nada guardado devuelve el estado actual', () => {
    expect(mergePersistedSettings(undefined, current)).toBe(current)
    expect(mergePersistedSettings('roto', current)).toBe(current)
  })
})
