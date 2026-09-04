import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type TerminoApi, type TermCreateOptions, type TermExitInfo, type NetAutoEvent } from '@shared/ipc'
import type { AdapterInfo, NetworkProfile, Project } from '@shared/types'

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
    },
    apply: (mac: string, profile: NetworkProfile) => ipcRenderer.invoke(IPC.netApply, mac, profile),
    dhcp: (mac: string) => ipcRenderer.invoke(IPC.netDhcp, mac),
    restore: (mac: string) => ipcRenderer.invoke(IPC.netRestore, mac),
    backup: (mac: string) => ipcRenderer.invoke(IPC.netBackup, mac),
    onAutoApplied: (cb) => {
      const handler = (_: unknown, ev: NetAutoEvent): void => cb(ev)
      ipcRenderer.on(IPC.netAutoApplied, handler)
      return () => ipcRenderer.removeListener(IPC.netAutoApplied, handler)
    }
  },
  term: {
    create: (opts: TermCreateOptions) => ipcRenderer.invoke(IPC.termCreate, opts),
    write: (id, data) => ipcRenderer.send(IPC.termWrite, id, data),
    resize: (id, cols, rows) => ipcRenderer.send(IPC.termResize, id, cols, rows),
    kill: (id) => ipcRenderer.send(IPC.termKill, id),
    onData: (cb) => {
      const handler = (_: unknown, p: { id: string; data: string }): void => cb(p.id, p.data)
      ipcRenderer.on(IPC.termData, handler)
      return () => ipcRenderer.removeListener(IPC.termData, handler)
    },
    onExit: (cb) => {
      const handler = (_: unknown, info: TermExitInfo): void => cb(info)
      ipcRenderer.on(IPC.termExit, handler)
      return () => ipcRenderer.removeListener(IPC.termExit, handler)
    }
  },
  creds: {
    set: (ref, secret) => ipcRenderer.invoke(IPC.credSet, ref, secret),
    has: (ref) => ipcRenderer.invoke(IPC.credHas, ref),
    remove: (ref) => ipcRenderer.invoke(IPC.credRemove, ref),
    removePrefix: (prefix) => ipcRenderer.invoke(IPC.credRemovePrefix, prefix),
    available: () => ipcRenderer.invoke(IPC.credAvailable)
  },
  app: {
    version: () => ipcRenderer.invoke(IPC.appVersion),
    dataDir: () => ipcRenderer.invoke(IPC.appDataDir),
    openDataDir: () => ipcRenderer.invoke(IPC.appOpenDataDir),
    openExternal: (url: string) => ipcRenderer.invoke(IPC.appOpenExternal, url),
    exportProject: (p: Project) => ipcRenderer.invoke(IPC.appExportProject, p),
    importProject: () => ipcRenderer.invoke(IPC.appImportProject)
  }
}

contextBridge.exposeInMainWorld('api', api)
