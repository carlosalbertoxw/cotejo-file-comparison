import { ipcMain, type WebContents } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { CompareRequest, CompareResponse, CompareProgress } from '@shared/types'
import { scanDirectory } from '../services/scanner'
import { compareTrees } from '../services/compareTree'

/** Comparaciones en curso, para poder cancelarlas desde el renderer. */
const cancelled = new Set<string>()

/** Emitir progreso en cada archivo saturaria el IPC; agrupamos por tiempo. */
function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let last = 0
  return (...args: A) => {
    const now = Date.now()
    if (now - last < ms) return
    last = now
    fn(...args)
  }
}

async function runCompare(
  sender: WebContents,
  requestId: string,
  request: CompareRequest
): Promise<CompareResponse> {
  const isCancelled = (): boolean => cancelled.has(requestId)

  const emit = throttle((progress: CompareProgress) => {
    if (sender.isDestroyed()) return
    sender.send(IPC.compareProgress, progress)
  }, 100)

  let scanned = 0
  const onEntry = (currentPath: string): void => {
    scanned++
    emit({ requestId, phase: 'scanning', scanned, hashed: 0, total: 0, currentPath })
  }

  const [left, right] = await Promise.all([
    scanDirectory(request.leftRoot, request.filters, { onEntry, isCancelled }),
    scanDirectory(request.rightRoot, request.filters, { onEntry, isCancelled })
  ])

  const { root, stats, errors } = await compareTrees(
    request.leftRoot,
    request.rightRoot,
    left.index,
    right.index,
    request.mode,
    {
      isCancelled,
      onHashProgress: (hashed, total, currentPath) =>
        emit({ requestId, phase: 'hashing', scanned, hashed, total, currentPath })
    }
  )

  if (!sender.isDestroyed()) {
    sender.send(IPC.compareProgress, {
      requestId,
      phase: 'done',
      scanned,
      hashed: 0,
      total: 0,
      currentPath: ''
    } satisfies CompareProgress)
  }

  return {
    requestId,
    leftRoot: request.leftRoot,
    rightRoot: request.rightRoot,
    mode: request.mode,
    root,
    stats,
    errors: [...left.errors, ...right.errors, ...errors]
  }
}

export function registerDirCompareHandlers(): void {
  ipcMain.handle(
    IPC.compareDirectories,
    async (event, requestId: string, request: CompareRequest) => {
      cancelled.delete(requestId)
      try {
        return await runCompare(event.sender, requestId, request)
      } finally {
        cancelled.delete(requestId)
      }
    }
  )

  ipcMain.handle(IPC.cancelCompare, (_e, requestId: string) => {
    cancelled.add(requestId)
  })
}
