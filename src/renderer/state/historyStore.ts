import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { samePath, type TabKind } from './sessionStore'

/** Una comparacion que ya se abrio, tal y como se recuerda en la bienvenida. */
export interface HistoryEntry {
  kind: TabKind
  leftPath: string
  rightPath: string
  /** Ultima vez que se abrio, en epoch ms. */
  openedAt: number
}

/** Cuantas comparaciones se recuerdan; mas no caben en la pantalla de inicio. */
export const HISTORY_LIMIT = 12

/** Dos entradas son la misma comparacion si coinciden tipo y las dos rutas. */
export function sameComparison(a: HistoryEntry, b: HistoryEntry): boolean {
  return (
    a.kind === b.kind &&
    samePath(a.leftPath, b.leftPath) &&
    samePath(a.rightPath, b.rightPath)
  )
}

/**
 * Pone la comparacion a la cabeza del historial.
 *
 * Repetir una comparacion la sube en vez de duplicarla, asi que la lista es
 * siempre "lo ultimo primero" sin entradas repetidas.
 */
export function pushEntry(
  entries: HistoryEntry[],
  entry: HistoryEntry,
  limit = HISTORY_LIMIT
): HistoryEntry[] {
  return [entry, ...entries.filter((item) => !sameComparison(item, entry))].slice(0, limit)
}

interface HistoryState {
  entries: HistoryEntry[]
  record: (kind: TabKind, leftPath: string, rightPath: string) => void
  remove: (entry: HistoryEntry) => void
  clear: () => void
}

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],

      record: (kind, leftPath, rightPath) =>
        set((state) => ({
          entries: pushEntry(state.entries, {
            kind,
            leftPath,
            rightPath,
            openedAt: Date.now()
          })
        })),

      remove: (entry) =>
        set((state) => ({
          entries: state.entries.filter((item) => !sameComparison(item, entry))
        })),

      clear: () => set({ entries: [] })
    }),
    { name: 'cotejo-history' }
  )
)
