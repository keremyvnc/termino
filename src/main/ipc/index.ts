import type { IpcContext } from './context'
import { registerAppIpc } from './registerAppIpc'
import { registerCredentialIpc } from './registerCredentialIpc'
import { registerNetworkIpc } from './registerNetworkIpc'
import { registerProjectIpc } from './registerProjectIpc'
import { registerTerminalIpc } from './registerTerminalIpc'

export type { IpcContext } from './context'

/**
 * Tum IPC kanallarini kaydeder. Her alan kendi dosyasinda durur;
 * yeni bir alan eklemek icin buraya tek satir eklenir.
 */
export function registerIpcHandlers(context: IpcContext): void {
  registerProjectIpc(context)
  registerNetworkIpc(context)
  registerTerminalIpc(context)
  registerCredentialIpc(context)
  registerAppIpc(context)
}
