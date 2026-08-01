import { useEffect, useRef, useState } from 'react'
import type { DiffOptions, DiffResult } from '@shared/types'
import type { DiffRequest, DiffResponse } from '../../diff/diff.worker'

const DEBOUNCE_MS = 150

/**
 * Calcula el diff en un worker, reintentando con debounce mientras el usuario
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

  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)
  const latestRef = useRef(0)

  useEffect(() => {
    const worker = new Worker(new URL('../../diff/diff.worker.ts', import.meta.url), {
      type: 'module'
    })
    worker.onmessage = (event: MessageEvent<DiffResponse>): void => {
      const message = event.data
      if (message.id !== latestRef.current) return
      setPending(false)
      if (message.ok) {
        setResult(message.result)
        setError(null)
      } else {
        setError(message.error)
      }
    }
    workerRef.current = worker
    return () => {
      worker.terminate()
      workerRef.current = null
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
      const id = ++requestIdRef.current
      latestRef.current = id
      const request: DiffRequest = { id, left, right, options }
      workerRef.current?.postMessage(request)
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [left, right, options])

  return { result, pending, error }
}
