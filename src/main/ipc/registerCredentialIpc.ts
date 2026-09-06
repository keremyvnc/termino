import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import { logged } from '../logger'
import type { IpcContext } from './context'

/**
 * Kasa kanallari. Renderer yalnizca referanslarla konusur;
 * sifrenin kendisi hicbir zaman geri gonderilmez.
 */
export function registerCredentialIpc({ vault, logger }: IpcContext): void {
  ipcMain.handle(IPC.credSet, (_e, ref: string, secret: string) =>
    logged(logger, 'cred:set', async () => {
      await vault.set(ref, secret)
      return ref
    })
  )
  ipcMain.handle(IPC.credHas, (_e, ref: string) => vault.has(ref))
  ipcMain.handle(IPC.credRemove, (_e, ref: string) => vault.remove(ref))
  ipcMain.handle(IPC.credRemovePrefix, (_e, prefix: string) => vault.removePrefix(prefix))
  ipcMain.handle(IPC.credAvailable, () => vault.available())
}
