import { create } from 'zustand'
import type { CommandDef, Project, ScriptStep, TerminalDef } from '@shared/types'
import { flattenSteps } from '@shared/steps'
import { planCommandRun, type CommandPlan } from './commandTargets'
import { createTab, isAlive, type OpenOptions, type TermTab } from './terminalTabs'

export type { TermTab } from './terminalTabs'
export { findTarget } from './commandTargets'
export { expandVariables, projectVars } from './projectVariables'

interface TerminalState {
  tabs: TermTab[]
  /** projectId -> aktif sekme id (terminal ya da editor sekmesi) */
  activeByProject: Record<string, string>

  open(projectId: string, opts?: OpenOptions): Promise<string>
  /**
   * Oturum tanimini acar. Ayni tanima ait calisan bir sekme varsa onu one getirir;
   * `fresh` ile her seferinde yeni sekme acilir. Web tanimi tarayicida acilir.
   */
  openDef(project: Project, def: TerminalDef, opts?: { fresh?: boolean }): Promise<string>
  close(id: string): void
  setActive(projectId: string, id: string): void
  markRunning(id: string): void
  markExited(id: string, exitCode: number): void
  /** Komut dosyasini hedef oturumda calistirir; oturum yoksa acar. */
  runCommand(project: Project, cmd: CommandDef): Promise<void>
}

/** Sekme baslamadan once kuyruga alinan senaryolar. */
const pendingScripts = new Map<string, ScriptStep[][]>()

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeByProject: {},

  async open(projectId, opts = {}) {
    if (opts.def?.kind === 'web') {
      await window.api.app.openExternal(opts.def.url ?? '')
      return ''
    }
    const index = get().tabs.filter((t) => t.projectId === projectId).length + 1
    const tab = createTab(projectId, opts, index)
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeByProject: { ...s.activeByProject, [projectId]: tab.id }
    }))
    return tab.id
  },

  async openDef(project, def, opts = {}) {
    const existing = opts.fresh
      ? undefined
      : get().tabs.find((t) => t.createOpts.defId === def.id && isAlive(t, project.id))
    if (existing) {
      get().setActive(project.id, existing.id)
      return existing.id
    }
    return get().open(project.id, { def, project })
  },

  close(id) {
    window.api.term.kill(id)
    pendingScripts.delete(id)
    set((s) => {
      const closed = s.tabs.find((t) => t.id === id)
      const tabs = s.tabs.filter((t) => t.id !== id)
      return { tabs, activeByProject: reassignActive(s.activeByProject, tabs, closed, id) }
    })
  },

  setActive(projectId, id) {
    set((s) => ({ activeByProject: { ...s.activeByProject, [projectId]: id } }))
  },

  markRunning(id) {
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, status: 'running' } : t)) }))
    flushPendingScripts(id)
  },

  markExited(id, exitCode) {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, status: 'exited', exitCode } : t))
    }))
  },

  async runCommand(project, cmd) {
    // Ic ice komut cagrilari (run) burada cozulur; motor yalnizca duz adimlari gorur.
    const steps = flattenSteps(project, cmd.steps)
    if (!steps.length) throw new Error('Komutta adım yok.')
    const state = get()
    const plan = planCommandRun(project, cmd, state.tabs, state.activeByProject[project.id])
    const tabId = await applyPlan(plan, project, state)

    const tab = get().tabs.find((t) => t.id === tabId)
    if (tab?.status === 'running') await window.api.term.runScript(tabId, steps)
    else queueScript(tabId, steps)
  }
}))

/** Plani uygular ve komutun yazilacagi sekmenin id'sini dondurur. */
function applyPlan(plan: CommandPlan, project: Project, state: TerminalState): Promise<string> {
  switch (plan.type) {
    case 'openDef':
      return state.openDef(project, plan.def, { fresh: plan.fresh })
    case 'useTab':
      state.setActive(project.id, plan.tabId)
      return Promise.resolve(plan.tabId)
    case 'openSsh':
      return state.open(project.id, { def: plan.def, project })
    case 'openLocal':
      return state.open(project.id, { shell: plan.shell, project })
  }
}

/** Kapanan sekme aktifse, ayni projedeki son sekme aktif olur. */
function reassignActive(
  activeByProject: Record<string, string>,
  remaining: TermTab[],
  closed: TermTab | undefined,
  closedId: string
): Record<string, string> {
  if (!closed || activeByProject[closed.projectId] !== closedId) return activeByProject
  const next = { ...activeByProject }
  const fallback = remaining.filter((t) => t.projectId === closed.projectId).at(-1)
  if (fallback) next[closed.projectId] = fallback.id
  else delete next[closed.projectId]
  return next
}

function queueScript(tabId: string, steps: ScriptStep[]): void {
  pendingScripts.set(tabId, [...(pendingScripts.get(tabId) ?? []), steps])
}

/** Sekme hazir olunca bekleyen senaryolar sirayla gonderilir. */
function flushPendingScripts(tabId: string): void {
  const queued = pendingScripts.get(tabId)
  if (!queued) return
  pendingScripts.delete(tabId)
  // Main tarafi oturum hazir olana kadar zaten bekletir; sira korunur.
  queued.forEach((steps) => void window.api.term.runScript(tabId, steps))
}
