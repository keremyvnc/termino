import type { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import { AutoApplier } from './autoApply'
import { CredentialVault } from './credentials'
import { FileLogger, type Logger } from './logger'
import { AdapterWatcher, NetworkConfigurator, systemAdapters } from './network'
import { ProjectStore } from './project/projectStore'
import { ProjectTransfer } from './project/projectTransfer'
import { TerminalManager } from './terminal'
import { WebContentsTerminalSink } from './ipc/terminalEventSink'
import type { IpcContext } from './ipc'

/** Uygulamanin calisirken kullandigi servisler. */
export interface Services {
  logger: Logger
  terminals: TerminalManager
  adapterWatcher: AdapterWatcher
  ipc: IpcContext
}

/**
 * Nesne grafigi tek yerde kurulur (composition root). Sinif ve moduller
 * birbirini `new` ile aramaz; bagimliliklarini disaridan alir.
 */
export function createServices(getWindow: () => BrowserWindow | null): Services {
  const logger = new FileLogger()
  const projects = new ProjectStore()
  const vault = new CredentialVault()
  const network = new NetworkConfigurator()
  const transfer = new ProjectTransfer(getWindow)

  const send = (channel: string, payload: unknown): void => {
    const window = getWindow()
    if (window && !window.isDestroyed()) window.webContents.send(channel, payload)
  }

  const terminals = new TerminalManager(
    new WebContentsTerminalSink(() => getWindow()?.webContents ?? null),
    vault,
    undefined,
    logger
  )

  const autoApplier = new AutoApplier(projects, network, (event) =>
    send(IPC.netAutoApplied, event)
  )
  const adapterWatcher = new AdapterWatcher((adapters) => {
    send(IPC.netAdaptersChanged, adapters)
    void autoApplier.onAdapters(adapters)
  })
  // YAML dosyalari disaridan (VS Code vb.) duzenlenirse arayuz kendini gunceller.
  projects.watch((list) => send(IPC.projectsChanged, list))

  return {
    logger,
    terminals,
    adapterWatcher,
    ipc: { logger, projects, vault, terminals, network, adapters: systemAdapters, transfer }
  }
}
