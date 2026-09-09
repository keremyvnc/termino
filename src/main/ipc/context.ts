import type { Logger } from '../logger'
import type { CredentialVault } from '../credentials'
import type { ProjectStore } from '../project/projectStore'
import type { ProjectTransfer } from '../project/projectTransfer'
import type { AdapterSource, NetworkConfigurator } from '../network'
import type { ShellSource, TerminalManager } from '../terminal'

/**
 * IPC katmaninin ihtiyac duydugu servisler. Kayit fonksiyonlari modul seviyesindeki
 * tekil nesnelere degil bu pakete bakar; boylece bagimliliklar disaridan verilir (DIP).
 */
export interface IpcContext {
  logger: Logger
  projects: ProjectStore
  vault: CredentialVault
  terminals: TerminalManager
  shells: ShellSource
  network: NetworkConfigurator
  adapters: AdapterSource
  transfer: ProjectTransfer
}
