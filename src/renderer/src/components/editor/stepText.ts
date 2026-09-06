import type { CommandDef, Project, ScriptStep, TerminalDef } from '@shared/types'
import { findCommand, countSteps } from '@shared/steps'
import { expandVariables } from '../../store/projectVariables'

/**
 * Adimlarin insan diline cevrilmis hali. Agactaki ipucu, komut ozeti ve
 * form editorundeki satirlar hep bu metinleri kullanir.
 */

export function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sn`
  return `${ms} ms`
}

/** Tek satirlik adim ozeti. */
export function stepSummary(step: ScriptStep, project: Project): string {
  switch (step.type) {
    case 'send':
      return expandVariables(step.text, project)
    case 'expect':
      return `Çıktıda "${step.pattern}" bekle${step.timeoutMs ? ` (en çok ${formatDuration(step.timeoutMs)})` : ''}`
    case 'wait':
      return `${formatDuration(step.ms)} bekle`
    case 'run': {
      const cmd = findCommand(project, step.command)
      const count = cmd ? countSteps(project, cmd.steps) : null
      return cmd
        ? `"${cmd.name}" komutunu çalıştır${count !== null ? ` (${count} adım)` : ''}`
        : `"${step.command}" komutu (bulunamadı)`
    }
  }
}

/** Komutun nerede calisacagi, insan diliyle. */
export function targetLabel(cmd: CommandDef, project: Project): string {
  if (cmd.target) {
    const def = project.terminals.find(
      (t) => t.name.toLowerCase() === cmd.target!.toLowerCase() || t.id === cmd.target
    )
    return def ? sessionLabel(def) : `${cmd.target} (oturum bulunamadı)`
  }
  if (cmd.shell === 'ssh') return 'Açık SSH oturumu'
  return cmd.shell === 'cmd' ? 'Yerel CMD' : 'Yerel PowerShell'
}

export function sessionLabel(def: TerminalDef): string {
  if (def.kind === 'ssh') return `${def.name} · ${def.username}@${def.host}`
  if (def.kind === 'web') return `${def.name} · ${def.url}`
  return `${def.name} · yerel`
}

/** Agacta uzerine gelince gorunen cok satirli aciklama. */
export function describeCommand(cmd: CommandDef, project: Project): string {
  const lines = [`${cmd.name} — ${targetLabel(cmd, project)}`]
  cmd.steps.forEach((s, i) => lines.push(`${i + 1}. ${stepSummary(s, project)}`))
  if (!cmd.steps.length) lines.push('(adım yok)')
  return lines.join('\n')
}

export function describeSession(def: TerminalDef, project: Project): string {
  const lines = [sessionLabel(def)]
  if (def.script?.length) {
    lines.push('Bağlanınca:')
    def.script.forEach((s, i) => lines.push(`${i + 1}. ${stepSummary(s, project)}`))
  }
  return lines.join('\n')
}
