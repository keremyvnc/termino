import type { Project, AdapterInfo, NetworkProfile } from './types'

export interface NetApplyResult {
  ok: boolean
  message: string
}

export interface NetBackup {
  mac: string
  adapterName: string
  takenAt: string
  dhcp: boolean
  ip?: string
  prefixLength?: number
  gateway?: string
  dns: string[]
}

/** Otomatik uygulama bildirimi */
export interface NetAutoEvent {
  projectId: string
  projectName: string
  adapterName: string
  result: NetApplyResult
}

export interface TermCreateOptions {
  id: string
  shell: 'powershell' | 'cmd'
  cwd?: string
  cols?: number
  rows?: number
}

export interface TermExitInfo {
  id: string
  exitCode: number
  signal?: number
}

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
    apply(mac: string, profile: NetworkProfile): Promise<NetApplyResult>
    dhcp(mac: string): Promise<NetApplyResult>
    restore(mac: string): Promise<NetApplyResult>
    backup(mac: string): Promise<NetBackup | null>
    onAutoApplied(cb: (ev: NetAutoEvent) => void): () => void
  }
  term: {
    create(opts: TermCreateOptions): Promise<string>
    write(id: string, data: string): void
    resize(id: string, cols: number, rows: number): void
    kill(id: string): void
    onData(cb: (id: string, data: string) => void): () => void
    onExit(cb: (info: TermExitInfo) => void): () => void
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
  netApply: 'net:apply',
  netDhcp: 'net:dhcp',
  netRestore: 'net:restore',
  netBackup: 'net:backup',
  netAutoApplied: 'net:autoApplied',
  termCreate: 'term:create',
  termWrite: 'term:write',
  termResize: 'term:resize',
  termKill: 'term:kill',
  termData: 'term:data',
  termExit: 'term:exit',
  appVersion: 'app:version',
  appDataDir: 'app:dataDir',
  appOpenDataDir: 'app:openDataDir'
} as const
