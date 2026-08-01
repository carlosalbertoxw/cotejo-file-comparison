import type { DiffOptions, DiffResult } from '@shared/types'
import { computeDiff } from './align'

export interface DiffRequest {
  id: number
  left: string
  right: string
  options: DiffOptions
}

export type DiffResponse =
  | { id: number; ok: true; result: DiffResult }
  | { id: number; ok: false; error: string }

// El diff de un archivo grande bloquea el hilo varios cientos de ms; aqui fuera
// la UI sigue respondiendo mientras tanto.
self.onmessage = (event: MessageEvent<DiffRequest>): void => {
  const { id, left, right, options } = event.data
  try {
    const result = computeDiff(left, right, options)
    const response: DiffResponse = { id, ok: true, result }
    self.postMessage(response)
  } catch (error) {
    const response: DiffResponse = { id, ok: false, error: (error as Error).message }
    self.postMessage(response)
  }
}
