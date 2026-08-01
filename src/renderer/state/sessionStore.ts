import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TabKind = 'text' | 'dir'

export interface Tab {
  id: string
  kind: TabKind
  leftPath: string | null
  rightPath: string | null
  title: string
  dirty: boolean
}

let counter = 0
const nextId = (): string => `tab-${++counter}`

function baseName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

/** Un solo nombre cuando los dos lados coinciden, y los dos cuando difieren. */
export function titleFor(kind: TabKind, left: string | null, right: string | null): string {
  const leftName = left ? baseName(left) : null
  const rightName = right ? baseName(right) : null
  if (!leftName && !rightName) return kind === 'text' ? 'Comparar texto' : 'Comparar carpetas'
  if (leftName && rightName) {
    return leftName === rightName ? leftName : `${leftName} ↔ ${rightName}`
  }
  return (leftName ?? rightName) as string
}

interface SessionState {
  tabs: Tab[]
  activeId: string | null
  openTab: (kind: TabKind, leftPath?: string | null, rightPath?: string | null) => string
  closeTab: (id: string) => void
  setActive: (id: string) => void
  updateTab: (id: string, patch: Partial<Omit<Tab, 'id'>>) => void
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeId: null,

      openTab: (kind, leftPath = null, rightPath = null) => {
        const id = nextId()
        const tab: Tab = {
          id,
          kind,
          leftPath,
          rightPath,
          title: titleFor(kind, leftPath, rightPath),
          dirty: false
        }
        set((state) => ({ tabs: [...state.tabs, tab], activeId: id }))
        return id
      },

      closeTab: (id) => {
        const { tabs, activeId } = get()
        const index = tabs.findIndex((tab) => tab.id === id)
        if (index === -1) return
        const remaining = tabs.filter((tab) => tab.id !== id)
        // Al cerrar la pestana activa, saltar a la vecina de la derecha si existe.
        const nextActive =
          activeId !== id ? activeId : (remaining[index]?.id ?? remaining[index - 1]?.id ?? null)
        set({ tabs: remaining, activeId: nextActive })
      },

      setActive: (activeId) => set({ activeId }),

      updateTab: (id, patch) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== id) return tab
            const merged = { ...tab, ...patch }
            // El titulo se deriva de las rutas salvo que lo fijen explicitamente.
            const pathChanged = patch.leftPath !== undefined || patch.rightPath !== undefined
            if (patch.title === undefined && pathChanged) {
              merged.title = titleFor(merged.kind, merged.leftPath, merged.rightPath)
            }
            return merged
          })
        }))
    }),
    {
      name: 'cotejo-session',
      // Se guardan las rutas, no el contenido: al reabrir se relee del disco.
      partialize: (state) => ({
        tabs: state.tabs.map((tab) => ({ ...tab, dirty: false })),
        activeId: state.activeId
      }),
      onRehydrateStorage: () => (state) => {
        // Los ids nuevos tienen que seguir a los restaurados para no chocar.
        for (const tab of state?.tabs ?? []) {
          const parsed = Number(tab.id.replace('tab-', ''))
          if (Number.isFinite(parsed)) counter = Math.max(counter, parsed)
        }
      }
    }
  )
)
