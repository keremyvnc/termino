import type { CommandDef, Project, ScriptStep, TerminalDef } from '@shared/types'
import { findCommand, countSteps } from '@shared/steps'
import { expandVariables } from '../../store/projectVariables'

/**
 * Adimlarin insan diline cevrilmis hali. Agactaki ipucu, komut ozeti ve
 * form editorundeki satirlar hep bu metinleri kullanir.
 */

export function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} s`
  return `${ms} ms`
}

/** Tek satirlik adim ozeti. */
export function stepSummary(step: ScriptStep, project: Project): string {
  switch (step.type) {
    case 'send':
      return expandVariables(step.text, project)
    case 'expect':
      return `Wait for "${step.pattern}" in output${step.timeoutMs ? ` (up to ${formatDuration(step.timeoutMs)})` : ''}`
    case 'wait':
      return `Wait ${formatDuration(step.ms)}`
    case 'run': {
      const cmd = findCommand(project, step.command)
      const count = cmd ? countSteps(project, cmd.steps) : null
      return cmd
        ? `Run command "${cmd.name}"${count !== null ? ` (${count} step${count === 1 ? '' : 's'})` : ''}`
        : `Command "${step.command}" (not found)`
    }
  }
}

/** Komutun nerede calisacagi, insan diliyle. */
export function targetLabel(cmd: CommandDef, project: Project): string {
  if (cmd.target) {
    const def = project.terminals.find(
      (t) => t.name.toLowerCase() === cmd.target!.toLowerCase() || t.id === cmd.target
    )
    return def ? sessionLabel(def) : `${cmd.target} (session not found)`
  }
  if (cmd.shell === 'ssh') return 'Open SSH session'
  return cmd.shell === 'cmd' ? 'Local CMD' : 'Local PowerShell'
}

export function sessionLabel(def: TerminalDef): string {
  if (def.kind === 'ssh') return `${def.name} · ${def.username}@${def.host}`
  if (def.kind === 'web') return `${def.name} · ${def.url}`
  return `${def.name} · local`
}

/** Agacta uzerine gelince gorunen cok satirli aciklama. */
export function describeCommand(cmd: CommandDef, project: Project): string {
  const lines = [`${cmd.name} — ${targetLabel(cmd, project)}`]
  cmd.steps.forEach((s, i) => lines.push(`${i + 1}. ${stepSummary(s, project)}`))
  if (!cmd.steps.length) lines.push('(no steps)')
  return lines.join('\n')
}

export function describeSession(def: TerminalDef, project: Project): string {
  const lines = [sessionLabel(def)]
  if (def.script?.length) {
    lines.push('After connecting:')
    def.script.forEach((s, i) => lines.push(`${i + 1}. ${stepSummary(s, project)}`))
  }
  return lines.join('\n')
}
