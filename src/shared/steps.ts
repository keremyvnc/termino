import type { CommandDef, Project, ScriptStep } from './types'
import { toSlug } from './projectYaml'

/** Komutu adiyla, dosya adiyla ya da id ile bulur. */
export function findCommand(project: Project, ref: string): CommandDef | undefined {
  const name = ref.trim().replace(/\.ya?ml$/i, '')
  const slug = toSlug(name)
  return project.commands.find(
    (c) => c.id === ref || c.name.toLowerCase() === name.toLowerCase() || toSlug(c.name) === slug
  )
}

/**
 * `run` adimlarini hedef komutun adimlariyla degistirir (ic ice olabilir).
 * Senaryo motoru yalnizca send/expect/wait bilir; komut komutu cagirma burada cozulur.
 * Dongu (A -> B -> A) hata verir.
 */
export function flattenSteps(
  project: Project,
  steps: ScriptStep[],
  trail: string[] = []
): ScriptStep[] {
  const out: ScriptStep[] = []
  for (const step of steps) {
    if (step.type !== 'run') {
      out.push(step)
      continue
    }
    const cmd = findCommand(project, step.command)
    if (!cmd) throw new Error(`"${step.command}" adlı komut yok.`)
    if (trail.includes(cmd.id)) throw new Error(`"${cmd.name}" kendini dolaylı olarak çağırıyor.`)
    out.push(...flattenSteps(project, cmd.steps, [...trail, cmd.id]))
  }
  return out
}

/** Duzlestirilmis adim sayisi; ic ice komutlar dahil. Hata (dongu/eksik) olursa null. */
export function countSteps(project: Project, steps: ScriptStep[]): number | null {
  try {
    return flattenSteps(project, steps).length
  } catch {
    return null
  }
}
