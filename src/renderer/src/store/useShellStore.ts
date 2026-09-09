import { create } from 'zustand'
import { DEFAULT_SHELL, type ShellInfo } from '@shared/types'

/**
 * Sistemde bulunan yerel kabuklar. Liste main tarafinda uretilir; arayuz
 * sabit bir kabuk adi bilmez, ne varsa onu gosterir ve onerir.
 */
interface ShellState {
  shells: ShellInfo[]
  load(): Promise<void>
}

export const useShellStore = create<ShellState>((set) => ({
  shells: [],

  async load() {
    const shells = await window.api.term.shells().catch(() => [])
    set({ shells })
  }
}))

/** React disindan (saf modullerden) okumak icin. */
export function shellList(): ShellInfo[] {
  return useShellStore.getState().shells
}

/** Varsayilan kabuk; liste henuz gelmemisse undefined. */
export function defaultShell(): ShellInfo | undefined {
  const shells = shellList()
  return shells.find((s) => s.isDefault) ?? shells[0]
}

export function defaultShellId(): string {
  return defaultShell()?.id ?? DEFAULT_SHELL
}

/**
 * Dosyadaki kabuk kimligini bu makinede var olan bir kimlige cevirir.
 * Baska bir isletim sisteminde yazilmis proje (ornek: `shell: powershell`)
 * burada sistemin varsayilan kabuguna duser.
 */
export function resolveShellId(id?: string): string {
  if (!id || id === DEFAULT_SHELL) return defaultShellId()
  return shellList().some((s) => s.id === id) ? id : defaultShellId()
}

/** Arayuzde gosterilecek ad. Bilinmeyen kimlik icin varsayilanin adi. */
export function shellLabel(id?: string): string {
  const shells = shellList()
  if (!id || id === DEFAULT_SHELL) return defaultShell()?.label ?? 'Default shell'
  return shells.find((s) => s.id === id)?.label ?? defaultShell()?.label ?? id
}
