import { useCallback, useRef, useState } from 'react'
import type { TextFilePayload } from '@shared/types'
import { parseIpcError } from '@shared/ipc-errors'
import { errorText } from '../../i18n/errorMessage'

/**
 * Un lado del comparador de texto: el archivo leido, lo que hay escrito ahora
 * en el panel, y las dos operaciones que tocan disco.
 *
 * Vive fuera del componente porque cargar y guardar no tienen nada que ver con
 * pintar, y porque el resultado de guardar necesita distinguir casos —no paso
 * nada, se guardo, el archivo cambio debajo— que dentro de un `void save()`
 * quedaban en nada.
 */

export type SaveOutcome =
  /** No habia archivo, o no habia cambios que guardar. */
  | { status: 'skipped' }
  | { status: 'saved' }
  /** El archivo cambio en el disco desde que se leyo; nadie ha escrito nada. */
  | { status: 'conflict' }
  | { status: 'error'; message: string }

interface SideState {
  payload: TextFilePayload | null
  content: string
  error: string | null
}

const EMPTY: SideState = { payload: null, content: '', error: null }

export interface SideFile {
  payload: TextFilePayload | null
  content: string
  error: string | null
  /** Hay cambios sin guardar respecto a lo que se leyo del disco. */
  dirty: boolean
  /**
   * El archivo no era UTF-8 valido: se puede mirar y comparar, pero guardarlo
   * escribiria los rombos de sustitucion encima del contenido de verdad.
   */
  lossy: boolean
  setContent: (value: string) => void
  load: (path: string) => Promise<void>
  /** `force` guarda aunque el archivo haya cambiado en el disco. */
  save: (force?: boolean) => Promise<SaveOutcome>
}

export function useSideFile(): SideFile {
  const [state, setState] = useState<SideState>(EMPTY)

  // `save` se registra en un atajo de teclado; leer el estado por referencia
  // evita reinstalar el listener a cada pulsacion.
  const stateRef = useRef(state)
  stateRef.current = state

  const setContent = useCallback((content: string): void => {
    setState((previous) => ({ ...previous, content }))
  }, [])

  /**
   * La ultima lectura pedida. Las lecturas no terminan en orden: si se elige un
   * archivo grande o en red y enseguida otro, el primero puede llegar despues y
   * dejar en el panel un contenido que no es el de la ruta que se ve, y que se
   * guardaria encima del primero.
   */
  const latestLoad = useRef(0)

  const load = useCallback(async (path: string): Promise<void> => {
    const request = ++latestLoad.current
    try {
      const payload = await window.api.readTextFile(path)
      if (request !== latestLoad.current) return
      setState({ payload, content: payload.content, error: null })
    } catch (error) {
      if (request !== latestLoad.current) return
      setState({ payload: null, content: '', error: errorText(error) })
    }
  }, [])

  const save = useCallback(async (force = false): Promise<SaveOutcome> => {
    const { payload, content } = stateRef.current
    if (!payload || content === payload.content) return { status: 'skipped' }
    if (payload.lossy) return { status: 'skipped' }

    try {
      const info = await window.api.writeTextFile(
        payload.path,
        content,
        payload.eol,
        payload.encoding,
        force ? undefined : { mtimeMs: payload.mtimeMs, size: payload.size }
      )
      setState((previous) => ({
        ...previous,
        payload: previous.payload ? { ...previous.payload, content, ...info } : previous.payload
      }))
      return { status: 'saved' }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (parseIpcError(message)?.code === 'fileChangedOnDisk') return { status: 'conflict' }
      return { status: 'error', message: errorText(error) }
    }
  }, [])

  return {
    payload: state.payload,
    content: state.content,
    error: state.error,
    dirty: state.payload !== null && state.content !== state.payload.content,
    lossy: state.payload?.lossy === true,
    setContent,
    load,
    save
  }
}
