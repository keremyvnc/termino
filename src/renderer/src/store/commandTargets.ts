import type { CommandDef, Project, TerminalDef } from '@shared/types'
import { toSlug } from '@shared/projectYaml'
import { isAlive, type LocalShell, type TermTab } from './terminalTabs'

/** Komutun nerede calisacagi. Karar burada verilir, uygulama store'da yapilir. */
export type CommandPlan =
  /** Belirli bir oturum tanimi acilir (varsa one getirilir). */
  | { type: 'openDef'; def: TerminalDef; fresh: boolean }
  /** Zaten acik bir sekme kullanilir. */
  | { type: 'useTab'; tabId: string }
  /** Tanimdan yeni bir SSH sekmesi acilir. */
  | { type: 'openSsh'; def: TerminalDef }
  /** Yeni bir yerel kabuk sekmesi acilir. */
  | { type: 'openLocal'; shell: LocalShell }

/** Komutun hedef oturum tanimini bulur (ad, dosya adi veya id ile). */
export function findTarget(project: Project, target: string): TerminalDef | undefined {
  const name = target.trim().replace(/\.ya?ml$/i, '')
  const slug = toSlug(name)
  return project.terminals.find(
    (t) =>
      t.id === target || t.name.toLowerCase() === name.toLowerCase() || toSlug(t.name) === slug
  )
}

/**
 * Komutun hangi sekmede calisacagini secer:
 *  - `target:` verilmisse o oturum tanimi,
 *  - `shell: ssh` ise acik SSH sekmesi, yoksa projedeki ilk SSH tanimi,
 *  - degilse ayni kabugu kullanan aktif sekme, yoksa yeni sekme.
 */
export function planCommandRun(
  project: Project,
  cmd: CommandDef,
  tabs: TermTab[],
  activeTabId: string | undefined
): CommandPlan {
  const active = tabs.find((t) => t.id === activeTabId)

  if (cmd.target) {
    const def = findTarget(project, cmd.target)
    if (!def) throw new Error(`"${cmd.target}" adlı oturum tanımı yok.`)
    if (def.kind === 'web') throw new Error('Web oturumunda komut çalıştırılamaz.')
    return { type: 'openDef', def, fresh: cmd.runInNewTab }
  }

  if (cmd.shell === 'ssh') return planSshRun(project, cmd, tabs, active)

  const reusable =
    !cmd.runInNewTab &&
    active &&
    active.kind === 'local' &&
    isAlive(active, project.id) &&
    active.shell === cmd.shell
  return reusable ? { type: 'useTab', tabId: active.id } : { type: 'openLocal', shell: cmd.shell }
}

/** Aktif SSH sekmesi tercih edilir; yoksa projedeki ilk SSH tanimi acilir. */
function planSshRun(
  project: Project,
  cmd: CommandDef,
  tabs: TermTab[],
  active: TermTab | undefined
): CommandPlan {
  const openSshTab =
    active?.kind === 'ssh' && isAlive(active, project.id)
      ? active
      : tabs.find((t) => t.kind === 'ssh' && isAlive(t, project.id))

  if (openSshTab && !cmd.runInNewTab) return { type: 'useTab', tabId: openSshTab.id }

  const def = project.terminals.find((d) => d.kind === 'ssh')
  if (!def) throw new Error('Bu projede SSH oturum tanımı yok.')
  return { type: 'openSsh', def }
}
