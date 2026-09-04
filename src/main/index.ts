import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { IPC } from '@shared/ipc'
import type { Project } from '@shared/types'
import { ProjectStore } from './projectStore'
import { listAdapters, watchAdapters } from './network'

const store = new ProjectStore()
let mainWindow: BrowserWindow | null = null
let stopWatch: (() => void) | null = null

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
  })
  mainWindow.on('closed', () => {
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
