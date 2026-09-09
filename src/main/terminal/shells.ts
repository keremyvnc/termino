import { existsSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { DEFAULT_SHELL, type ShellInfo } from '@shared/types'

/**
 * Sistemde gercekten var olan yerel kabuklari bulur. Arayuz sabit bir liste
 * gostermez; ne bulunduysa onu onerir. Windows'ta PowerShell/CMD, Linux ve
 * macOS'ta /etc/shells + PATH taramasi.
 *
 * Kabuk calistirma `LocalPtySession`, liste dagitimi IPC katmanidir; burasi
 * yalnizca "hangi kabuklar var, nasil baslatilir" sorusunu yanitlar.
 */

/** Kabuk tanimi. `ShellInfo` arayuze gider; `args` yalnizca main icinde kalir. */
export interface ShellSpec extends ShellInfo {
  args: string[]
  /** Acilista Clear-Host bekleyen kabuk (PowerShell ailesi): acilis ciktisi gizlenir. */
  hidesStartupOutput: boolean
}

/** Kabuk listesini veren kaynak. IPC ve oturum bu arayuze bakar (DIP). */
export interface ShellSource {
  list(): ShellInfo[]
  resolve(id?: string): ShellSpec
}

/**
 * Taramanin disariya bakan yuzu. Gercek sistem varsayilandir; testte sahte bir
 * dosya sistemi ve ortam verilerek Linux davranisi Windows uzerinde sinanabilir.
 */
export interface ShellProbe {
  platform: string
  env: Record<string, string | undefined>
  exists(path: string): boolean
  readFile(path: string): string | null
}

const systemProbe: ShellProbe = {
  platform: process.platform,
  env: process.env,
  exists: (path) => existsSync(path),
  readFile: (path) => {
    try {
      return readFileSync(path, 'utf8')
    } catch {
      return null
    }
  }
}

/** Kabuk adi -> arayuzde gorunen ad. Bilinmeyen ad oldugu gibi kullanilir. */
const LABELS: Record<string, string> = {
  powershell: 'Windows PowerShell',
  pwsh: 'PowerShell 7',
  cmd: 'Command Prompt',
  wsl: 'WSL',
  bash: 'Bash',
  zsh: 'Zsh',
  fish: 'fish',
  sh: 'sh',
  dash: 'dash',
  ksh: 'ksh',
  tcsh: 'tcsh',
  csh: 'csh'
}

/** PATH icinde aranan aday kabuklar (platforma gore). */
const WINDOWS_CANDIDATES = ['powershell.exe', 'pwsh.exe', 'cmd.exe', 'wsl.exe', 'bash.exe']
const POSIX_CANDIDATES = ['bash', 'zsh', 'fish', 'sh', 'dash', 'ksh', 'pwsh']

/** /etc/shells icinde kabuk olmayan satirlar da bulunur (tmux, screen, nologin). */
const NOT_A_SHELL = /(nologin|false|sync|shutdown|halt|tmux|screen)$/

let cache: ShellSpec[] | null = null

/** Bulunan kabuklar; ilk cagride taranir, sonra bellekten verilir. */
export function listShellSpecs(): ShellSpec[] {
  if (!cache) cache = discoverShells(systemProbe)
  return cache
}

/** Arayuze giden liste (calistirma ayrintilari disarida kalir). */
export function listShells(): ShellInfo[] {
  return listShellSpecs().map(({ args: _a, hidesStartupOutput: _h, ...info }) => info)
}

/**
 * Komut/oturum dosyasindaki kabuk kimligini calistirilabilir tanima cevirir.
 * Bilinmeyen kimlik (ornek: Windows'ta yazilmis `powershell` dosyasinin Linux'ta
 * acilmasi) sessizce sistemin varsayilan kabuguna duser.
 */
export function resolveShell(id?: string): ShellSpec {
  const shells = listShellSpecs()
  const wanted = (id ?? '').trim().toLowerCase()
  const found =
    wanted && wanted !== DEFAULT_SHELL
      ? shells.find((s) => s.id === wanted) ?? shells.find((s) => s.path.toLowerCase() === wanted)
      : undefined
  return found ?? shells.find((s) => s.isDefault) ?? shells[0] ?? fallbackSpec()
}

/** Varsayilan kaynak: sistemin gercek kabuklari. */
export const systemShells: ShellSource = { list: listShells, resolve: resolveShell }

// ---------- Tarama ----------

export function discoverShells(probe: ShellProbe): ShellSpec[] {
  const windows = probe.platform === 'win32'
  const paths = windows ? windowsPaths(probe) : posixPaths(probe)
  const specs: ShellSpec[] = []
  const seen = new Set<string>()

  for (const path of paths) {
    const spec = toSpec(path)
    // Ayni kabuk birden cok yoldan gorunur (/bin/bash ve /usr/bin/bash): bir kez listelenir.
    if (seen.has(spec.id) || seen.has(path.toLowerCase()) || !probe.exists(path)) continue
    seen.add(spec.id)
    seen.add(path.toLowerCase())
    specs.push(spec)
  }

  if (!specs.length) specs.push(fallbackSpec(windows))
  return markDefault(specs, probe)
}

/** Windows: System32 altindaki bilinen yollar + PATH taramasi. */
function windowsPaths(probe: ShellProbe): string[] {
  const root = probe.env['SystemRoot'] ?? 'C:\\Windows'
  return [
    ...envShells(probe),
    join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    probe.env['ComSpec'] ?? join(root, 'System32', 'cmd.exe'),
    ...found(WINDOWS_CANDIDATES, probe)
  ]
}

/** Linux/macOS: /etc/shells kaydi + kullanicinin kabugu + PATH taramasi. */
function posixPaths(probe: ShellProbe): string[] {
  return [...envShells(probe), ...etcShells(probe), ...found(POSIX_CANDIDATES, probe)]
}

function found(names: string[], probe: ShellProbe): string[] {
  return names.map((name) => which(name, probe)).filter((p): p is string => Boolean(p))
}

/** Kullanici kendi kabugunu dayatabilir: TERMINO_SHELL (TERMINO_PWSH eski ad). */
function envShells(probe: ShellProbe): string[] {
  const values = [probe.env['TERMINO_SHELL'], probe.env['TERMINO_PWSH'], probe.env['SHELL']]
  // Yalnizca tam yol verilenler listeye girer; kisa ad (`bash`) PATH taramasindan gelir.
  return values.filter((v): v is string => Boolean(v && /[\\/]/.test(v)))
}

function etcShells(probe: ShellProbe): string[] {
  const text = probe.readFile('/etc/shells')
  if (!text) return []
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('/') && !NOT_A_SHELL.test(line))
}

/** PATH icinde calistirilabilir arar; bulamazsa null. */
function which(name: string, probe: ShellProbe): string | null {
  const separator = probe.platform === 'win32' ? ';' : ':'
  const dirs = (probe.env['PATH'] ?? '').split(separator).filter(Boolean)
  for (const dir of dirs) {
    const candidate = probe.platform === 'win32' ? join(dir, name) : `${dir}/${name}`
    if (probe.exists(candidate)) return candidate
  }
  return null
}

// ---------- Tanim uretimi ----------

function toSpec(path: string): ShellSpec {
  const id = basename(path).replace(/\.exe$/i, '').toLowerCase()
  const isPowerShell = id === 'powershell' || id === 'pwsh'
  return {
    id,
    label: LABELS[id] ?? id,
    path,
    hint: path,
    // Profil ciktisi (basibos ifadeler, hatalar) ekrana gelmesin: profil yuklenir,
    // ardindan ekran temizlenir. Diger kabuklarda boyle bir imkan yok.
    args: isPowerShell ? ['-NoLogo', '-NoExit', '-Command', 'Clear-Host'] : [],
    hidesStartupOutput: isPowerShell
  }
}

/**
 * Varsayilan kabuk: once kullanicinin dayattigi/oturum kabugu, sonra platformun
 * alisilmis kabugu. Liste varsayilan basta olacak sekilde siralanir.
 */
function markDefault(specs: ShellSpec[], probe: ShellProbe): ShellSpec[] {
  const preferred =
    probe.platform === 'win32'
      ? [probe.env['TERMINO_SHELL'], 'powershell', 'pwsh', 'cmd']
      : [probe.env['TERMINO_SHELL'], probe.env['SHELL'], 'bash', 'zsh', 'sh']

  const match = preferred
    .filter((v): v is string => Boolean(v))
    .map((value) => {
      const wanted = value.toLowerCase()
      return specs.find((s) => s.path.toLowerCase() === wanted || s.id === wanted)
    })
    .find(Boolean)

  const chosen = match ?? specs[0]
  const marked = specs.map((s) => ({ ...s, isDefault: s === chosen }))
  return [...marked].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
}

/** Hicbir sey bulunamazsa bile terminal acilabilsin. */
function fallbackSpec(windows = process.platform === 'win32'): ShellSpec {
  const path = windows ? 'powershell.exe' : '/bin/sh'
  return {
    ...toSpec(path),
    isDefault: true
  }
}
