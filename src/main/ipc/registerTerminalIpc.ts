import { ipcMain } from 'electron'
import { IPC, type TermCreateOptions } from '@shared/ipc'
import type { ScriptStep } from '@shared/types'
import type { IpcContext } from './context'

/** Terminal oturumu kanallari. Veri akisi ters yonde `TerminalEventSink` ile gider. */
export function registerTerminalIpc({ terminals, shells }: IpcContext): void {
  ipcMain.handle(IPC.termShells, () => shells.list())
  ipcMain.handle(IPC.termCreate, (_e, options: TermCreateOptions) => terminals.create(options))
  ipcMain.handle(IPC.termRunScript, (_e, id: string, steps: ScriptStep[]) =>
    terminals.runScript(id, steps)
  )
  ipcMain.on(IPC.termWrite, (_e, id: string, data: string) => terminals.write(id, data))
  ipcMain.on(IPC.termResize, (_e, id: string, cols: number, rows: number) =>
    terminals.resize(id, cols, rows)
  )
  ipcMain.on(IPC.termKill, (_e, id: string) => terminals.kill(id))
}
