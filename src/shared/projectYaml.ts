import { parse, stringify } from 'yaml'
import type {
  CommandDef,
  NetworkProfile,
  Project,
  ScriptStep,
  ShellKind,
  TerminalDef,
  TerminalKind
} from './types'
import { newId, newProject } from './types'

/**
 * Proje dosyalarinin YAML bicimi. Hem main (disk) hem renderer (editor) ayni
 * fonksiyonlari kullanir; boylece editorde gorulen metin diske yazilanla birebirdir.
 *
 *   projects/<id>/project.yaml       proje ozeti + ag profili
 *   projects/<id>/sessions/<ad>.yaml oturum tanimi
 *   projects/<id>/commands/<ad>.yaml komut surusu
 */

const SHELLS: ShellKind[] = ['powershell', 'cmd', 'ssh']
const KINDS: TerminalKind[] = ['local', 'ssh', 'web']

const COMMAND_HEADER = `# Komut dosyasi. Adimlar sirayla calisir.
#   send: <komut>        komutu yazar, cikti durulana kadar bekler
#   expect: <regex>      desen gelene kadar bekler (timeout: ms)
#   wait: <ms>           bekler
#   run: <komut adi>     baska bir komut dosyasini bu noktada calistirir
# target: hedef oturumun adi (sessions/ altindaki dosya). Bos ise shell'e gore
# yerel terminal (powershell/cmd) ya da acik olan SSH sekmesi kullanilir.
# Degiskenler: {{ip}} {{gateway}} {{project}} {{secret:ad}}
`

const SESSION_HEADER = `# Oturum dosyasi. kind: ssh | local | web
# Sifre bu dosyaya yazilmaz; credentialRef kasadaki anahtari gosterir.
# script: baglanti sonrasi otomatik adimlar (send/expect/wait).
`

// ---------- Komut ----------

export function commandToYaml(cmd: CommandDef): string {
  const body: Record<string, unknown> = { name: cmd.name }
  if (cmd.target) body.target = cmd.target
  else body.shell = cmd.shell
  if (cmd.runInNewTab) body.newTab = true
  body.steps = cmd.steps.map(stepToYaml)
  return COMMAND_HEADER + stringify(body, { lineWidth: 0 })
}

/** Metni komuta cevirir. `base` id gibi dosyada olmayan alanlari saglar. */
export function commandFromYaml(text: string, base: Pick<CommandDef, 'id'>): CommandDef {
  const raw = asObject(parse(text))
  const name = str(raw.name)
  if (!name) throw new Error('"name" alanı zorunlu')
  const shell = str(raw.shell) as ShellKind
  const target = str(raw.target) || undefined
  return {
    id: base.id,
    name,
    target,
    shell: SHELLS.includes(shell) ? shell : target ? 'ssh' : 'powershell',
    runInNewTab: Boolean(raw.newTab ?? raw.runInNewTab),
    steps: stepsFromYaml(raw.steps)
  }
}

// ---------- Oturum ----------

export function sessionToYaml(def: TerminalDef): string {
  const body: Record<string, unknown> = { id: def.id, name: def.name, kind: def.kind }
  if (def.kind === 'ssh') {
    body.host = def.host ?? ''
    body.port = def.port ?? 22
    body.username = def.username ?? ''
    if (def.credentialRef) body.credentialRef = def.credentialRef
  }
  if (def.kind === 'web') body.url = def.url ?? ''
  if (def.secrets?.length) body.secrets = def.secrets
  if (def.script?.length) body.script = def.script.map(stepToYaml)
  return SESSION_HEADER + stringify(body, { lineWidth: 0 })
}

export function sessionFromYaml(text: string, base: Pick<TerminalDef, 'id'>): TerminalDef {
  const raw = asObject(parse(text))
  const name = str(raw.name)
  if (!name) throw new Error('"name" alanı zorunlu')
  const kind = str(raw.kind) as TerminalKind
  if (!KINDS.includes(kind)) throw new Error('"kind" ssh, local veya web olmalı')
  const def: TerminalDef = { id: str(raw.id) || base.id, name, kind }
  if (kind === 'ssh') {
    def.host = str(raw.host)
    def.port = Number(raw.port) || 22
    def.username = str(raw.username)
    if (!def.host || !def.username) throw new Error('SSH için "host" ve "username" gerekli')
    const ref = str(raw.credentialRef)
    if (ref) def.credentialRef = ref
  }
  if (kind === 'web') {
    def.url = str(raw.url)
    if (!def.url) throw new Error('Web için "url" gerekli')
  }
  if (Array.isArray(raw.secrets)) def.secrets = raw.secrets.map(String).filter(Boolean)
  const script = stepsFromYaml(raw.script)
  if (script.length) def.script = script
  return def
}

// ---------- Proje ozeti ----------

export function projectMetaToYaml(p: Project): string {
  const { commands: _c, terminals: _t, ...meta } = p
  return stringify(meta, { lineWidth: 0 })
}

export function projectMetaFromYaml(text: string, id: string): Omit<Project, 'commands' | 'terminals'> {
  const raw = asObject(parse(text))
  const base = newProject({ id })
  const net = asObject(raw.network)
  const network: NetworkProfile = {
    adapterMac: typeof net.adapterMac === 'string' ? net.adapterMac : null,
    ip: str(net.ip) || base.network.ip,
    prefixLength: Number(net.prefixLength) || base.network.prefixLength,
    gateway: str(net.gateway) || undefined,
    dns: Array.isArray(net.dns) ? net.dns.map(String) : undefined,
    autoApply: Boolean(net.autoApply)
  }
  return {
    id,
    name: str(raw.name) || id,
    description: str(raw.description),
    color: str(raw.color) || base.color,
    network,
    createdAt: str(raw.createdAt) || base.createdAt,
    updatedAt: str(raw.updatedAt) || base.updatedAt
  }
}

// ---------- Adimlar ----------

function stepToYaml(s: ScriptStep): Record<string, unknown> {
  if (s.type === 'send') return { send: s.text }
  if (s.type === 'wait') return { wait: s.ms }
  if (s.type === 'run') return { run: s.command }
  return s.timeoutMs ? { expect: s.pattern, timeout: s.timeoutMs } : { expect: s.pattern }
}

/** `- send: x`, `- expect: y` / `timeout: ms`, `- wait: ms`; duz metin `send` sayilir. */
export function stepsFromYaml(value: unknown): ScriptStep[] {
  if (!Array.isArray(value)) return []
  const steps: ScriptStep[] = []
  value.forEach((item, i) => {
    if (typeof item === 'string' || typeof item === 'number') {
      steps.push({ type: 'send', text: String(item) })
      return
    }
    const o = asObject(item)
    // Disa aktarilan JSON'daki {type, text|pattern|ms} bicimi de kabul edilir.
    if (o.type === 'send') steps.push({ type: 'send', text: str(o.text) })
    else if (o.type === 'expect') {
      const timeout = Number(o.timeoutMs)
      steps.push({ type: 'expect', pattern: str(o.pattern), ...(timeout ? { timeoutMs: timeout } : {}) })
    } else if (o.type === 'wait') steps.push({ type: 'wait', ms: Number(o.ms) || 0 })
    else if (o.type === 'run') steps.push({ type: 'run', command: str(o.command) })
    else if ('run' in o) steps.push({ type: 'run', command: str(o.run) })
    else if ('send' in o) steps.push({ type: 'send', text: str(o.send) })
    else if ('expect' in o) {
      const timeout = Number(o.timeout ?? o.timeoutMs)
      steps.push({ type: 'expect', pattern: str(o.expect), ...(timeout ? { timeoutMs: timeout } : {}) })
    } else if ('wait' in o) steps.push({ type: 'wait', ms: Number(o.wait) || 0 })
    else throw new Error(`adım ${i + 1}: send, expect, wait veya run olmalı`)
  })
  return steps
}

// ---------- Dosya adi ----------

const TR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u'
}

/** Ad → dosya adi (uzantisiz). Turkce harfler cevrilir, geri kalan tire olur. */
export function toSlug(name: string): string {
  const ascii = name.replace(/[çğıöşüÇĞİÖŞÜ]/g, (ch) => TR_MAP[ch] ?? ch)
  return ascii.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'adsiz'
}

/** Ayni ada sahip dosyalar catismasin: ikinciden itibaren -2, -3 ... eklenir. */
export function uniqueSlugs(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((n) => {
    const base = toSlug(n)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count + 1}`
  })
}

export function fileNameFor(name: string): string {
  return `${toSlug(name)}.yaml`
}

// ---------- Yardimcilar ----------

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function str(v: unknown): string {
  return v === undefined || v === null ? '' : String(v).trim()
}

export { newId }
