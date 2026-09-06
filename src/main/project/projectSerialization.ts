import { randomUUID } from 'crypto'
import { newProject } from '@shared/types'
import { stepsFromYaml } from '@shared/projectYaml'
import type { CommandDef, Project, ShellKind, TerminalDef } from '@shared/types'

const SHELLS: ShellKind[] = ['powershell', 'cmd', 'ssh']

/**
 * Disa/ice aktarmanin saf veri donusumleri. Dosya secme ve disk erisimi
 * `projectTransfer.ts` icindedir; buradaki fonksiyonlar yan etkisizdir.
 */

/** Sifre referanslarini cikarir: paylasilan dosya kasa anahtarlarini tasimasin. */
export function withoutCredentials(project: Project): Project {
  return {
    ...project,
    terminals: project.terminals.map((t) => ({ ...t, credentialRef: undefined }))
  }
}

/** Dosya adini disk icin guvenli hale getirir. */
export function toFileName(projectName: string): string {
  return projectName.replace(/[^\w\-]+/g, '_') || 'proje'
}

/**
 * Disaridan gelen JSON'u projeye cevirir. Id'ler yenilenir; adaptor baglantisi,
 * otomatik uygulama ve sifre referanslari sifirlanir.
 */
export function parseImportedProject(raw: unknown): Project {
  const source = raw as Record<string, unknown> | null
  if (!source || typeof source.name !== 'string') throw new Error('Geçersiz proje dosyası')

  const base = newProject()
  return {
    ...base,
    name: source.name,
    description: String(source.description ?? ''),
    color: typeof source.color === 'string' ? source.color : base.color,
    commands: toArray(source.commands).map(toCommand),
    network: {
      ...base.network,
      ...((source.network as object) ?? {}),
      adapterMac: null,
      autoApply: false
    },
    terminals: toArray(source.terminals).map(toTerminal)
  }
}

function toArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function toCommand(raw: Record<string, unknown>): CommandDef {
  const shell = String(raw.shell) as ShellKind
  // Eski bicimde `text` tek metindi; her satir bir send adimi olur.
  const steps = Array.isArray(raw.steps)
    ? stepsFromYaml(raw.steps)
    : String(raw.text ?? '')
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((l): CommandDef['steps'][number] => ({ type: 'send', text: l }))
  return {
    id: randomUUID(),
    name: String(raw.name ?? ''),
    target: typeof raw.target === 'string' ? raw.target : undefined,
    shell: SHELLS.includes(shell) ? shell : 'powershell',
    runInNewTab: Boolean(raw.runInNewTab),
    steps
  }
}

function toTerminal(raw: Record<string, unknown>): TerminalDef {
  return { ...(raw as unknown as TerminalDef), id: randomUUID(), credentialRef: undefined }
}
