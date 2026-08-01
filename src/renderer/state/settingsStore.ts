import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_DIFF_OPTIONS,
  DEFAULT_FILTERS,
  type CompareMode,
  type DiffOptions,
  type ScanFilters
} from '@shared/types'
import { detectLanguage, type Language } from '../i18n/detect'

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
      // gracias al merge superficial de zustand/persist.
      language: detectLanguage(),
      setDiffOption: (key, value) =>
        set((state) => ({ diffOptions: { ...state.diffOptions, [key]: value } })),
      setCompareMode: (compareMode) => set({ compareMode }),
      setFilters: (filters) => set({ filters }),
      setOnlyDifferences: (onlyDifferences) => set({ onlyDifferences }),
      setLanguage: (language) => set({ language })
    }),
    { name: 'cotejo-settings' }
  )
)
