import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UpdateStatus = 'idle' | 'checking' | 'upToDate' | 'available' | 'error'

/**
 * Una vez al dia basta: la comprobacion sale a GitHub, y hacerla en cada
 * arranque solo gasta la cuota de la API para enterarse de lo mismo.
 */
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

interface UpdateState {
  status: UpdateStatus
  /** Etiqueta de la ultima release publicada. */
  latest: string | null
  /** Version instalada, tal y como la reporta el proceso principal. */
  current: string | null
  lastCheck: number
  /** Version cuyo aviso ya cerro el usuario; no se vuelve a ensenar. */
  dismissed: string | null
  /**
   * Si se comprueba sola una vez al dia. Es la unica conexion que hace
   * Cotejo, y en un equipo sin salida a internet, o para quien no quiere que
   * su IP llegue a GitHub, sobra. Buscar a mano desde «Acerca de» sigue
   * funcionando igual.
   */
  autoCheck: boolean
  check: (force?: boolean) => Promise<void>
  dismiss: () => void
  setAutoCheck: (enabled: boolean) => void
}

export const useUpdates = create<UpdateState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      latest: null,
      current: null,
      lastCheck: 0,
      dismissed: null,
      autoCheck: true,

      check: async (force = false) => {
        const state = get()
        if (state.status === 'checking') return
        if (!force && !state.autoCheck) return
        if (!force && Date.now() - state.lastCheck < CHECK_INTERVAL_MS) return

        set({ status: 'checking' })
        try {
          const result = await window.api.checkForUpdates()
          set({
            status: result.available ? 'available' : 'upToDate',
            latest: result.latest,
            current: result.current,
            lastCheck: result.checkedAt
          })
        } catch {
          // Quedarse sin red es lo normal, no una anomalia que merezca un
          // dialogo. El estado se guarda por si alguien abre «Acerca de», y
          // `lastCheck` no se toca para reintentar en el siguiente arranque.
          set({ status: 'error' })
        }
      },

      dismiss: () => set({ dismissed: get().latest }),

      setAutoCheck: (enabled) => set({ autoCheck: enabled })
    }),
    {
      name: 'cotejo-updates',
      // Del resto no hay nada que recordar: se recalcula al comprobar.
      partialize: (state) => ({
        lastCheck: state.lastCheck,
        dismissed: state.dismissed,
        autoCheck: state.autoCheck
      })
    }
  )
)
