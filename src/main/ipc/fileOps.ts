import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { FileOpPlan, FileOpRequest, FileOpResult, FileOpProgress } from '@shared/types'
import { planFileOp, runFileOp } from '../services/fileOpsService'

const cancelled = new Set<string>()

export function registerFileOpsHandlers(): void {
  ipcMain.handle(IPC.planFileOp, (_e, request: FileOpRequest): Promise<FileOpPlan> => {
    return planFileOp(request)
  })

  ipcMain.handle(IPC.runFileOp, async (event, request: FileOpRequest): Promise<FileOpResult> => {
    cancelled.delete(request.operationId)
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
      cancelled.delete(request.operationId)
    }
  })

  ipcMain.handle(IPC.cancelFileOp, (_e, operationId: string) => {
    cancelled.add(operationId)
  })
}
