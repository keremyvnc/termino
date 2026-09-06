import { app, ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc'
import type { Project } from '@shared/types'
import type { IpcContext } from './context'

const HAS_SCHEME = /^[a-z]+:\/\//i
const IS_HTTP = /^https?:\/\//i

/** Uygulama duzeyi kanallar: surum, veri klasoru, dis baglanti, dis/ic aktarma. */
export function registerAppIpc({ projects, transfer }: IpcContext): void {
  ipcMain.handle(IPC.appVersion, () => app.getVersion())
  ipcMain.handle(IPC.appDataDir, () => projects.directory)
  ipcMain.handle(IPC.appOpenDataDir, async () => {
    await shell.openPath(projects.directory)
  })

  ipcMain.handle(IPC.appOpenExternal, (_e, url: string) => shell.openExternal(toHttpUrl(url)))

  ipcMain.handle(IPC.appExportProject, (_e, project: Project) => transfer.exportToFile(project))
  ipcMain.handle(IPC.appImportProject, () => transfer.importFromFile())
}

/** Sema yazilmamissa http varsayilir; http/https disindaki semalar reddedilir. */
function toHttpUrl(url: string): string {
  const withScheme = HAS_SCHEME.test(url) ? url : `http://${url}`
  if (!IS_HTTP.test(withScheme)) throw new Error('Only http/https URLs can be opened')
  return withScheme
}
