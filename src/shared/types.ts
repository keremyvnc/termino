// Paylasilan veri modeli: hem main hem renderer bunu kullanir.

export type ShellKind = 'powershell' | 'cmd' | 'ssh'
export type TerminalKind = 'local' | 'ssh' | 'web'

/**
 * Komut dosyasi (commands/<ad>.yaml): sirayla calisan bir adim surusu.
 * Hedef bir oturum tanimiysa (`target`) o oturumda, degilse `shell`e gore
 * aktif/yeni yerel terminalde calisir.
 */
export interface CommandDef {
  id: string
  name: string
  /** Hedef oturum taniminin adi. Bos: `shell`e gore yerel terminal ya da aktif SSH. */
  target?: string
  shell: ShellKind
  /** true ise her seferinde yeni sekme acilir, false ise acik olan kullanilir */
  runInNewTab: boolean
  steps: ScriptStep[]
}

export interface NetworkProfile {
  /** Adaptorun MAC adresi (AA-BB-CC-DD-EE-FF). Isimler degisir, MAC degismez. */
  adapterMac: string | null
  ip: string
  prefixLength: number
  gateway?: string
  dns?: string[]
  /** Adaptor takildiginda profili otomatik uygula */
  autoApply: boolean
}

export interface TerminalDef {
  id: string
  name: string
  kind: TerminalKind
  host?: string
  port?: number
  username?: string
  /** kind=web: tarayicida acilacak adres */
  url?: string
  /** Sifre kasasindaki anahtar; sifrenin kendisi JSON'a yazilmaz */
  credentialRef?: string
  /** Senaryoda {{secret:ad}} ile kullanilan ek sifrelerin adlari (degerler kasada) */
  secrets?: string[]
  /** Baglanti sonrasi otomatik calisacak senaryo adimlari */
  script?: ScriptStep[]
}

export type ScriptStep =
  | { type: 'send'; text: string }
  | { type: 'expect'; pattern: string; timeoutMs?: number }
  | { type: 'wait'; ms: number }
  /** Baska bir komut dosyasini (adiyla) bu noktada calistirir; calistirmadan once duzlestirilir. */
  | { type: 'run'; command: string }

export interface Project {
  id: string
  name: string
  description: string
  color: string
  commands: CommandDef[]
  network: NetworkProfile
  terminals: TerminalDef[]
  createdAt: string
  updatedAt: string
}

export interface AdapterInfo {
  name: string
  description: string
  mac: string
  status: 'Up' | 'Down' | 'Disconnected' | string
  ipv4: string[]
  dhcp: boolean
}

export const PROJECT_COLORS = [
  '#f97316',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#eab308',
  '#14b8a6',
  '#ef4444'
]

export function newId(): string {
  return crypto.randomUUID()
}

export function newProject(partial: Partial<Project> = {}): Project {
  const now = new Date().toISOString()
  return {
    id: partial.id ?? newId(),
    name: partial.name ?? 'Yeni Proje',
    description: partial.description ?? '',
    color: partial.color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
    commands: partial.commands ?? [],
    network: partial.network ?? {
      adapterMac: null,
      ip: '192.168.1.10',
      prefixLength: 24,
      autoApply: false
    },
    terminals: partial.terminals ?? [],
    createdAt: partial.createdAt ?? now,
    updatedAt: now
  }
}
