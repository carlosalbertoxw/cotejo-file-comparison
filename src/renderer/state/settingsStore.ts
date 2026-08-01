import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_DIFF_OPTIONS,
  DEFAULT_FILTERS,
  type CompareMode,
  type DiffOptions,
  type ScanFilters
} from '@shared/types'

interface SettingsState {
  diffOptions: DiffOptions
  compareMode: CompareMode
  filters: ScanFilters
  onlyDifferences: boolean
  setDiffOption: <K extends keyof DiffOptions>(key: K, value: DiffOptions[K]) => void
  setCompareMode: (mode: CompareMode) => void
  setFilters: (filters: ScanFilters) => void
  setOnlyDifferences: (value: boolean) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      diffOptions: DEFAULT_DIFF_OPTIONS,
      compareMode: 'quick',
      filters: DEFAULT_FILTERS,
      onlyDifferences: false,
      setDiffOption: (key, value) =>
        set((state) => ({ diffOptions: { ...state.diffOptions, [key]: value } })),
      setCompareMode: (compareMode) => set({ compareMode }),
      setFilters: (filters) => set({ filters }),
      setOnlyDifferences: (onlyDifferences) => set({ onlyDifferences })
    }),
    { name: 'cotejo-settings' }
  )
)
