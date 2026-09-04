import { create } from 'zustand'
import { newId } from '@shared/types'
import type { Project } from '@shared/types'

export interface TermTab {
  id: string
  projectId: string
  title: string
  shell: 'powershell' | 'cmd'
  status: 'starting' | 'running' | 'exited'
  exitCode?: number
}

interface TerminalState {
  tabs: TermTab[]
  /** projectId -> aktif sekme id */
  activeByProject: Record<string, string>

  open(projectId: string, shell?: 'powershell' | 'cmd', title?: string): Promise<string>
  close(id: string): void
  setActive(projectId: string, id: string): void
  markRunning(id: string): void
  markExited(id: string, exitCode: number): void
  /** Komutu aktif sekmeye yazar; sekme yoksa acar. Enter ekler. */
  run(project: Project, text: string, opts: { newTab: boolean; shell: 'powershell' | 'cmd' }): Promise<void>
}

/** Tab yasam dongusu icin xterm bilesenleri buradan yardim alir. */
export const pendingInput = new Map<string, string[]>()

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeByProject: {},

  async open(projectId, shell = 'powershell', title) {
    const id = newId()
    const count = get().tabs.filter((t) => t.projectId === projectId).length + 1
    const tab: TermTab = {
      id,
      projectId,
      shell,
      title: title ?? `${shell === 'cmd' ? 'CMD' : 'PowerShell'} ${count}`,
      status: 'starting'
    }
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeByProject: { ...s.activeByProject, [projectId]: id }
    }))
    return id
  },

  close(id) {
    window.api.term.kill(id)
    pendingInput.delete(id)
    set((s) => {
      const tab = s.tabs.find((t) => t.id === id)
      const tabs = s.tabs.filter((t) => t.id !== id)
      const activeByProject = { ...s.activeByProject }
      if (tab && activeByProject[tab.projectId] === id) {
        const next = tabs.filter((t) => t.projectId === tab.projectId).at(-1)
        if (next) activeByProject[tab.projectId] = next.id
        else delete activeByProject[tab.projectId]
      }
      return { tabs, activeByProject }
    })
  },

  setActive(projectId, id) {
    set((s) => ({ activeByProject: { ...s.activeByProject, [projectId]: id } }))
  },

  markRunning(id) {
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, status: 'running' } : t)) }))
    // Baslamadan once kuyruga alinan girdiler simdi gonderilir.
    const queued = pendingInput.get(id)
    if (queued) {
      pendingInput.delete(id)
      // Kabugun prompt basmasi icin kisa bir sure bekle.
      setTimeout(() => queued.forEach((q) => window.api.term.write(id, q)), 400)
    }
  },

  markExited(id, exitCode) {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, status: 'exited', exitCode } : t))
    }))
  },

  async run(project, text, opts) {
    const line = text.endsWith('\r') ? text : text + '\r'
    const state = get()
    const activeId = state.activeByProject[project.id]
    const active = state.tabs.find((t) => t.id === activeId)
    const reuse =
      !opts.newTab && active && active.status !== 'exited' && active.shell === opts.shell
    if (reuse && active) {
      window.api.term.write(active.id, line)
      return
    }
    const id = await state.open(project.id, opts.shell)
    pendingInput.set(id, [line])
  }
}))

/** Komut metnindeki {{degisken}} alanlarini proje profilinden doldurur. */
export function expandVariables(text: string, project: Project): string {
  const n = project.network
  const vars: Record<string, string> = {
    ip: n.ip,
    prefix: String(n.prefixLength),
    mask: prefixToMask(n.prefixLength),
    gateway: n.gateway ?? '',
    dns: (n.dns ?? []).join(','),
    project: project.name
  }
  return text.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (m, key: string) => vars[key] ?? m)
}

export function prefixToMask(prefix: number): string {
  const bits = prefix <= 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return [24, 16, 8, 0].map((s) => (bits >>> s) & 255).join('.')
}
