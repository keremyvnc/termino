import type { Project, AdapterInfo } from './types'

/** Renderer'a acilan API. Preload bunu window.api olarak koyar. */
export interface TerminoApi {
  projects: {
    list(): Promise<Project[]>
    save(project: Project): Promise<Project>
    remove(id: string): Promise<void>
  }
  network: {
    listAdapters(): Promise<AdapterInfo[]>
    onAdaptersChanged(cb: (adapters: AdapterInfo[]) => void): () => void
  }
  app: {
    version(): Promise<string>
    dataDir(): Promise<string>
    openDataDir(): Promise<void>
  }
}

export const IPC = {
  projectsList: 'projects:list',
  projectsSave: 'projects:save',
  projectsRemove: 'projects:remove',
  netListAdapters: 'net:listAdapters',
  netAdaptersChanged: 'net:adaptersChanged',
  appVersion: 'app:version',
  appDataDir: 'app:dataDir',
  appOpenDataDir: 'app:openDataDir'
} as const
