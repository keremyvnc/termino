import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './ipc'
import { createServices } from './services'
import { createMainWindow } from './window'

/**
 * Uygulama giris noktasi: servisleri kurar, IPC'yi kaydeder ve pencere
 * yasam dongusunu yonetir. Is mantigi burada degil, ilgili modullerdedir.
 */

let mainWindow: BrowserWindow | null = null
const services = createServices(() => mainWindow)

function openWindow(): void {
  mainWindow = createMainWindow(services.logger)
  services.adapterWatcher.start()

  mainWindow.on('closed', () => {
    services.terminals.killAll()
    services.adapterWatcher.stop()
    mainWindow = null
  })
}

void app.whenReady().then(() => {
  registerIpcHandlers(services.ipc)
  openWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow()
  })
})

app.on('before-quit', () => services.terminals.killAll())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
