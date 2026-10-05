import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_DIFF_OPTIONS,
  DEFAULT_FILTERS,
  type CompareMode,
  type DiffOptions,
  type ScanFilters
} from '@shared/types'
import { detectLanguage, LANGUAGES, type Language } from '../i18n/detect'

/** Lo que se guarda en `localStorage`: el estado sin las acciones. */
type PersistedSettings = Pick<
  SettingsState,
  'diffOptions' | 'compareMode' | 'filters' | 'onlyDifferences' | 'language'
>

const COMPARE_MODES: readonly CompareMode[] = ['quick', 'size', 'content']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Los campos de `saved` que tienen el mismo tipo que en `defaults`; el resto, de `defaults`. */
function mergeShape<T extends object>(defaults: T, saved: unknown): T {
  if (!isRecord(saved)) return defaults
  const merged: Record<string, unknown> = { ...(defaults as Record<string, unknown>) }
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = saved[key]
    const sameType = Array.isArray(fallback)
      ? Array.isArray(value) && value.every((item) => typeof item === 'string')
      : typeof value === typeof fallback
    if (sameType) merged[key] = value
  }
  return merged as T
}

/**
 * Junta los ajustes guardados con los de esta version.
 *
 * El merge por defecto de zustand/persist es superficial: un `filters` guardado
 * por una version anterior sustituye entero al actual, y un campo que se anada
 * despues llega como `undefined`. En `filters` eso no es un detalle: el proceso
 * principal exige todos sus campos (`asFilters` en `validate.ts`) y la
 * comparacion de carpetas fallaria hasta que el usuario borrase sus datos.
 * Aqui cada objeto se completa con sus valores por defecto, y lo que no tenga
 * el tipo esperado —o un idioma o un modo que ya no existan— se descarta.
 *
 * Si algun dia un cambio no se arregla completando campos (un renombre, un
 * cambio de tipo), toca subir `version` en el `persist` y escribir `migrate`:
 * zustand ya guarda `version: 0` con los datos de hoy.
 */
export function mergePersistedSettings<S extends PersistedSettings>(saved: unknown, current: S): S {
  if (!isRecord(saved)) return current
  return {
    ...current,
    diffOptions: mergeShape(current.diffOptions, saved.diffOptions),
    filters: mergeShape(current.filters, saved.filters),
    compareMode: COMPARE_MODES.includes(saved.compareMode as CompareMode)
      ? (saved.compareMode as CompareMode)
      : current.compareMode,
    onlyDifferences:
      typeof saved.onlyDifferences === 'boolean' ? saved.onlyDifferences : current.onlyDifferences,
    language: (LANGUAGES as readonly unknown[]).includes(saved.language)
      ? (saved.language as Language)
      : current.language
  }
}

interface SettingsState {
  diffOptions: DiffOptions
  compareMode: CompareMode
  filters: ScanFilters
  onlyDifferences: boolean
  language: Language
  setDiffOption: <K extends keyof DiffOptions>(key: K, value: DiffOptions[K]) => void
  setCompareMode: (mode: CompareMode) => void
  setFilters: (filters: ScanFilters) => void
  setOnlyDifferences: (value: boolean) => void
  setLanguage: (language: Language) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      diffOptions: DEFAULT_DIFF_OPTIONS,
      compareMode: 'quick',
      filters: DEFAULT_FILTERS,
      onlyDifferences: false,
      // Los settings guardados sin `language` heredan el idioma detectado
      // (`mergePersistedSettings`).
      language: detectLanguage(),
      setDiffOption: (key, value) =>
        set((state) => ({ diffOptions: { ...state.diffOptions, [key]: value } })),
      setCompareMode: (compareMode) => set({ compareMode }),
      setFilters: (filters) => set({ filters }),
      setOnlyDifferences: (onlyDifferences) => set({ onlyDifferences }),
      setLanguage: (language) => set({ language })
    }),
    { name: 'cotejo-settings', merge: mergePersistedSettings }
  )
)
