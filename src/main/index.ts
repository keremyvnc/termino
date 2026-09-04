import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { appendFileSync } from 'fs'
import { IPC } from '@shared/ipc'
import type { Project } from '@shared/types'
import { ProjectStore } from './projectStore'
import { listAdapters, watchAdapters } from './network'
import { TerminalManager } from './terminals'
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
const terminals = new TerminalManager(() => mainWindow?.webContents ?? null)
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
    if (ev.level === 'error') log('renderer error:', ev.message, ev.sourceId, ev.lineNumber)
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
  ipcMain.handle(IPC.projectsSave, (_e, p: Project) => store.save(p))
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
  ipcMain.handle(IPC.appVersion, () => app.getVersion())
  ipcMain.handle(IPC.appDataDir, () => store.directory)
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
