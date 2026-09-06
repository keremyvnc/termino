import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import type { Project } from '@shared/types'
import type { IpcContext } from './context'

/** Proje CRUD kanallari. */
export function registerProjectIpc({ projects, logger }: IpcContext): void {
  ipcMain.handle(IPC.projectsList, () => projects.list())

  ipcMain.handle(IPC.projectsSave, async (_e, project: Project) => {
    const saved = await projects.save(project)
    logger.log('projects:save', saved.id, saved.terminals.length, 'oturum')
    return saved
  })

  ipcMain.handle(IPC.projectsRemove, (_e, id: string) => projects.remove(id))
}
