import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import type { Logger } from './logger'

const BACKGROUND = '#0b0f14'

/**
 * Ana pencereyi olusturur ve icerigi yukler. Uygulama yasam dongusu
 * (izleyici baslatma, oturum kapatma) `index.ts` icindedir.
 */
export function createMainWindow(logger: Logger): BrowserWindow {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    backgroundColor: BACKGROUND,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: BACKGROUND, symbolColor: '#9ca3af', height: 36 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.on('ready-to-show', () => window.show())
  attachDiagnostics(window, logger)
  openLinksInBrowser(window)
  void loadRenderer(window)

  return window
}

/** Renderer sorunlari sessizce kaybolmasin: dosyaya loglanir. */
function attachDiagnostics(window: BrowserWindow, logger: Logger): void {
  const contents = window.webContents
  contents.on('did-finish-load', () => logger.log('renderer did-finish-load'))
  contents.on('render-process-gone', (_e, details) => logger.log('render-process-gone', details))
  contents.on('console-message', (event) => {
    if (event.level !== 'error' && event.level !== 'warning') return
    logger.log('renderer', event.level, event.message, event.sourceId, event.lineNumber)
  })
}

/** Uygulama icinde yeni pencere acilmaz; baglantilar varsayilan tarayiciya gider. */
function openLinksInBrowser(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
}

function loadRenderer(window: BrowserWindow): Promise<void> {
  const devServer = process.env['ELECTRON_RENDERER_URL']
  return devServer
    ? window.loadURL(devServer)
    : window.loadFile(join(__dirname, '../renderer/index.html'))
}
