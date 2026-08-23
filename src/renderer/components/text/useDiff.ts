import { useEffect, useRef, useState } from 'react'
import type { DiffOptions, DiffResult } from '@shared/types'
import type { DiffRequest, DiffResponse } from '../../diff/diff.worker'

const DEBOUNCE_MS = 150

/**
 * Un unico worker para toda la aplicacion.
 *
 * Antes se creaba uno por pestaña de texto, y las pestañas inactivas no se
 * desmontan —conservan su scroll y sus cambios sin guardar—, asi que diez
 * comparaciones abiertas eran diez contextos de JavaScript vivos, cada uno con
 * su copia de los dos documentos. El diff se calcula de uno en uno de todas
 * formas: lo unico que hacia falta era distinguir de quien es cada respuesta,
 * y para eso ya estaba el identificador de peticion.
 */
type Listener = (message: DiffResponse) => void

let worker: Worker | null = null
const listeners = new Set<Listener>()
let nextRequestId = 0

function sharedWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../../diff/diff.worker.ts', import.meta.url), {
      type: 'module'
    })
    worker.onmessage = (event: MessageEvent<DiffResponse>): void => {
      for (const listener of listeners) listener(event.data)
    }
  }
  return worker
}

/**
 * Calcula el diff en el worker, reintentando con debounce mientras el usuario
 * escribe. Las respuestas que llegan tarde se descartan comparando el id, para
 * que un diff viejo no pise a uno nuevo.
 */
export function useDiff(
  left: string | null,
  right: string | null,
  options: DiffOptions
): { result: DiffResult | null; pending: boolean; error: string | null } {
  const [result, setResult] = useState<DiffResult | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const latestRef = useRef(-1)

  useEffect(() => {
    const listener: Listener = (message) => {
      // Del worker salen las respuestas de todas las pestañas; esta solo
      // atiende a la ultima que pidio ella misma.
      if (message.id !== latestRef.current) return
      setPending(false)
      if (message.ok) {
        setResult(message.result)
        setError(null)
      } else {
        setError(message.error)
      }
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  useEffect(() => {
    if (left === null || right === null) {
      setResult(null)
      setPending(false)
      return
    }

    setPending(true)
    const timer = setTimeout(() => {
      const id = ++nextRequestId
      latestRef.current = id
      const request: DiffRequest = { id, left, right, options }
      sharedWorker().postMessage(request)
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [left, right, options])

  return { result, pending, error }
}
