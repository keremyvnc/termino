import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import type { NetworkProfile } from '@shared/types'
import { logged } from '../logger'
import type { IpcContext } from './context'

/** Adaptor listesi ve profil uygulama kanallari. Yukseltme gerektirenler loglanir. */
export function registerNetworkIpc({ network, adapters, logger }: IpcContext): void {
  ipcMain.handle(IPC.netListAdapters, () => adapters.list())

  ipcMain.handle(IPC.netApply, (_e, mac: string, profile: NetworkProfile) =>
    logged(logger, 'net:apply', () => network.applyProfile(mac, profile))
  )
  ipcMain.handle(IPC.netDhcp, (_e, mac: string) =>
    logged(logger, 'net:dhcp', () => network.setDhcp(mac))
  )
  ipcMain.handle(IPC.netRestore, (_e, mac: string) =>
    logged(logger, 'net:restore', () => network.restoreBackup(mac))
  )
  ipcMain.handle(IPC.netBackup, (_e, mac: string) => network.getBackup(mac))
}
