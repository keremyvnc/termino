import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { appendFileSync, promises as fsp } from 'fs'
import { randomUUID } from 'crypto'
import { newProject } from '@shared/types'
import { IPC } from '@shared/ipc'
import type { Project } from '@shared/types'
import { ProjectStore } from './projectStore'
import { listAdapters, watchAdapters } from './network'
import { TerminalManager } from './terminals'
import { CredentialVault } from './credentials'
import { applyProfile, getBackup, restoreBackup, setDhcp } from './netApply'
import { AutoApplier } from './autoApply'
import type { NetworkProfile } from '@shared/types'
import type { TermCreateOptions } from '@shared/ipc'

const store = new ProjectStore()
export function log(...parts: unknown[]): void {
  const line = `${new Date().toISOString()} ${parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')}
`
  try {
    appendFileSync(join(app.getPath('userData'), 'termino.log'), line)
  } catch {
    /* yoksay */
  }
}
let mainWindow: BrowserWindow | null = null
let stopWatch: (() => void) | null = null
const vault = new CredentialVault()
const terminals = new TerminalManager(() => mainWindow?.webContents ?? null, vault)
const autoApplier = new AutoApplier(store, (ev) => mainWindow?.webContents.send(IPC.netAutoApplied, ev))

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b0f14',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0b0f14', symbolColor: '#9ca3af', height: 36 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.on('did-finish-load', () => log('renderer did-finish-load'))
  mainWindow.webContents.on('render-process-gone', (_e, d) => log('render-process-gone', d))
  mainWindow.webContents.on('console-message', (ev) => {
    if (ev.level === 'error' || ev.level === 'warning') log('renderer', ev.level, ev.message, ev.sourceId, ev.lineNumber)
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  stopWatch = watchAdapters((adapters) => {
    mainWindow?.webContents.send(IPC.netAdaptersChanged, adapters)
    void autoApplier.onAdapters(adapters)
  })
  mainWindow.on('closed', () => {
    terminals.killAll()
    stopWatch?.()
    stopWatch = null
    mainWindow = null
  })
}

function registerIpc(): void {
  ipcMain.handle(IPC.projectsList, () => store.list())
  ipcMain.handle(IPC.projectsSave, (_e, p: Project) => store.save(p).then((r) => { log('projects:save', r.id, r.terminals.length, 'oturum'); return r }))
  ipcMain.handle(IPC.projectsRemove, (_e, id: string) => store.remove(id))
  ipcMain.handle(IPC.netListAdapters, () => listAdapters())
  const logged = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    log(name, 'start')
    try {
      const r = await fn()
      log(name, 'done', r)
      return r
    } catch (e) {
      log(name, 'error', String((e as Error).message ?? e))
      throw e
    }
  }
  ipcMain.handle(IPC.netApply, (_e, mac: string, p: NetworkProfile) => logged('net:apply', () => applyProfile(mac, p)))
  ipcMain.handle(IPC.netDhcp, (_e, mac: string) => logged('net:dhcp', () => setDhcp(mac)))
  ipcMain.handle(IPC.netRestore, (_e, mac: string) => logged('net:restore', () => restoreBackup(mac)))
  ipcMain.handle(IPC.netBackup, (_e, mac: string) => getBackup(mac))
  ipcMain.handle(IPC.termCreate, (_e, opts: TermCreateOptions) => terminals.create(opts))
  ipcMain.on(IPC.termWrite, (_e, id: string, data: string) => terminals.write(id, data))
  ipcMain.on(IPC.termResize, (_e, id: string, cols: number, rows: number) =>
    terminals.resize(id, cols, rows)
  )
  ipcMain.on(IPC.termKill, (_e, id: string) => terminals.kill(id))
  ipcMain.handle(IPC.credSet, (_e, ref: string, secret: string) => logged('cred:set', () => vault.set(ref, secret).then(() => ref)))
  ipcMain.handle(IPC.credHas, (_e, ref: string) => vault.has(ref))
  ipcMain.handle(IPC.credRemove, (_e, ref: string) => vault.remove(ref))
  ipcMain.handle(IPC.credAvailable, () => vault.available())
  ipcMain.handle(IPC.appVersion, () => app.getVersion())
  ipcMain.handle(IPC.appDataDir, () => store.directory)
  ipcMain.handle(IPC.appExportProject, async (_e, p: Project) => {
    if (!mainWindow) return false
    const safe = p.name.replace(/[^\w\-]+/g, '_') || 'proje'
    const r = await dialog.showSaveDialog(mainWindow, {
      title: 'Projeyi dışa aktar',
      defaultPath: `${safe}.termino.json`,
      filters: [{ name: 'Termino projesi', extensions: ['json'] }]
    })
    if (r.canceled || !r.filePath) return false
    const out: Project = {
      ...p,
      terminals: p.terminals.map((t) => ({ ...t, credentialRef: undefined }))
    }
    await fsp.writeFile(r.filePath, JSON.stringify(out, null, 2), 'utf8')
    return true
  })
  ipcMain.handle(IPC.appImportProject, async () => {
    if (!mainWindow) return null
    const r = await dialog.showOpenDialog(mainWindow, {
      title: 'Proje içe aktar',
      filters: [{ name: 'Termino projesi', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (r.canceled || !r.filePaths[0]) return null
    const raw = JSON.parse(await fsp.readFile(r.filePaths[0], 'utf8'))
    if (!raw || typeof raw.name !== 'string') throw new Error('Geçersiz proje dosyası')
    const base = newProject()
    const shells = ['powershell', 'cmd', 'ssh']
    const imported: Project = {
      ...base,
      name: raw.name,
      description: String(raw.description ?? ''),
      color: typeof raw.color === 'string' ? raw.color : base.color,
      commands: Array.isArray(raw.commands)
        ? raw.commands.map((c: Record<string, unknown>) => ({
            id: randomUUID(),
            name: String(c.name ?? ''),
            shell: (shells.includes(String(c.shell)) ? String(c.shell) : 'powershell') as Project['commands'][number]['shell'],
            text: String(c.text ?? ''),
            runInNewTab: Boolean(c.runInNewTab)
          }))
        : [],
      network: { ...base.network, ...(raw.network ?? {}), adapterMac: null, autoApply: false },
      terminals: Array.isArray(raw.terminals)
        ? raw.terminals.map((t: Record<string, unknown>) => ({
            ...(t as object),
            id: randomUUID(),
            credentialRef: undefined
          }) as Project['terminals'][number])
        : []
    }
    return imported
  })
  ipcMain.handle(IPC.appOpenDataDir, () => shell.openPath(store.directory).then(() => undefined))
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => terminals.killAll())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
