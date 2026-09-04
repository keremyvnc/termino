import type { Project, AdapterInfo, NetworkProfile, ScriptStep } from './types'

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
  kind: 'local' | 'ssh'
  shell: 'powershell' | 'cmd'
  cwd?: string
  cols?: number
  rows?: number
  ssh?: { host: string; port?: number; username: string; credentialRef?: string }
  /** Baglanti sonrasi otomasyon adimlari */
  script?: ScriptStep[]
  /** {{ip}} gibi degiskenler icin proje degerleri */
  vars?: Record<string, string>
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
  creds: {
    set(ref: string, secret: string): Promise<void>
    has(ref: string): Promise<boolean>
    remove(ref: string): Promise<void>
    available(): Promise<boolean>
  }
  app: {
    version(): Promise<string>
    dataDir(): Promise<string>
    openDataDir(): Promise<void>
    /** Projeyi JSON olarak disa aktarir (sifre referanslari cikarilir). Iptalde false. */
    exportProject(project: Project): Promise<boolean>
    /** Dosya secip projeyi okur; yeni id'lerle doner. Iptalde null. */
    importProject(): Promise<Project | null>
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
  credSet: 'cred:set',
  credHas: 'cred:has',
  credRemove: 'cred:remove',
  credAvailable: 'cred:available',
  appVersion: 'app:version',
  appDataDir: 'app:dataDir',
  appOpenDataDir: 'app:openDataDir',
  appExportProject: 'app:exportProject',
  appImportProject: 'app:importProject'
} as const
