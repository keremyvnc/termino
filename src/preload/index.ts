import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type TerminoApi } from '@shared/ipc'
import type { AdapterInfo, Project } from '@shared/types'

const api: TerminoApi = {
  projects: {
    list: () => ipcRenderer.invoke(IPC.projectsList),
    save: (p: Project) => ipcRenderer.invoke(IPC.projectsSave, p),
    remove: (id: string) => ipcRenderer.invoke(IPC.projectsRemove, id)
  },
  network: {
    listAdapters: () => ipcRenderer.invoke(IPC.netListAdapters),
    onAdaptersChanged: (cb) => {
      const handler = (_: unknown, adapters: AdapterInfo[]): void => cb(adapters)
      ipcRenderer.on(IPC.netAdaptersChanged, handler)
      return () => ipcRenderer.removeListener(IPC.netAdaptersChanged, handler)
    }
  },
  app: {
    version: () => ipcRenderer.invoke(IPC.appVersion),
    dataDir: () => ipcRenderer.invoke(IPC.appDataDir),
    openDataDir: () => ipcRenderer.invoke(IPC.appOpenDataDir)
  }
}

contextBridge.exposeInMainWorld('api', api)
