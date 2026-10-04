import { IPC } from '@shared/ipc-channels'
import type { FileOpPlan, FileOpResult, FileOpProgress } from '@shared/types'
import { planFileOp, runFileOp } from '../services/fileOpsService'
import { asFileOpRequest, asString } from './validate'
import { handle } from './handle'

const cancelled = new Set<string>()

/** Operaciones en curso, para no acumular identificadores cancelados tarde. */
const running = new Set<string>()

export function registerFileOpsHandlers(): void {
  handle(IPC.planFileOp, (_e, raw: unknown): Promise<FileOpPlan> => {
    return planFileOp(asFileOpRequest(raw))
  })

  handle(IPC.runFileOp, async (event, raw: unknown): Promise<FileOpResult> => {
    const request = asFileOpRequest(raw)
    cancelled.delete(request.operationId)
    running.add(request.operationId)
    try {
      const result = await runFileOp(request, {
        isCancelled: () => cancelled.has(request.operationId),
        onProgress: (done, total, currentPath) => {
          if (event.sender.isDestroyed()) return
          event.sender.send(IPC.fileOpProgress, {
            operationId: request.operationId,
            done,
            total,
            currentPath
          } satisfies FileOpProgress)
        }
      })
      return { operationId: request.operationId, ...result }
    } finally {
      running.delete(request.operationId)
      cancelled.delete(request.operationId)
    }
  })

  handle(IPC.cancelFileOp, (_e, operationId: unknown) => {
    const id = asString(operationId, 'operationId')
    if (running.has(id)) cancelled.add(id)
  })
}
