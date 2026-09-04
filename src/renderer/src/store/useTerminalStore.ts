import { create } from 'zustand'
import { newId } from '@shared/types'
import type { Project, ScriptStep, TerminalDef } from '@shared/types'
import type { TermCreateOptions } from '@shared/ipc'

export interface TermTab {
  id: string
  projectId: string
  title: string
  kind: 'local' | 'ssh'
  shell: 'powershell' | 'cmd'
  status: 'starting' | 'running' | 'exited'
  exitCode?: number
  /** Main surecine gonderilecek olusturma ayarlari (cols/rows haric) */
  createOpts: Omit<TermCreateOptions, 'id' | 'cols' | 'rows'>
}

interface OpenOptions {
  shell?: 'powershell' | 'cmd'
  title?: string
  def?: TerminalDef
  project?: Project
}

interface TerminalState {
  tabs: TermTab[]
  /** projectId -> aktif sekme id */
  activeByProject: Record<string, string>

  open(projectId: string, opts?: OpenOptions): Promise<string>
  close(id: string): void
  setActive(projectId: string, id: string): void
  markRunning(id: string): void
  markExited(id: string, exitCode: number): void
  /** Komutu aktif sekmeye yazar; sekme yoksa acar. Enter ekler. */
  run(
    project: Project,
    text: string,
    opts: { newTab: boolean; shell: 'powershell' | 'cmd' | 'ssh' }
  ): Promise<void>
}

/** Sekme baslamadan once kuyruga alinan girdiler */
export const pendingInput = new Map<string, string[]>()

export function projectVars(project: Project): Record<string, string> {
  const n = project.network
  return {
    ip: n.ip,
    prefix: String(n.prefixLength),
    mask: prefixToMask(n.prefixLength),
    gateway: n.gateway ?? '',
    dns: (n.dns ?? []).join(','),
    project: project.name
  }
}

/** Komut metnindeki {{degisken}} alanlarini proje profilinden doldurur. */
export function expandVariables(text: string, project: Project): string {
  const vars = projectVars(project)
  return text.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (m, key: string) => vars[key] ?? m)
}

export function prefixToMask(prefix: number): string {
  const bits = prefix <= 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return [24, 16, 8, 0].map((s) => (bits >>> s) & 255).join('.')
}

function buildTab(projectId: string, opts: OpenOptions, count: number): TermTab {
  const id = newId()
  const def = opts.def
  if (def?.kind === 'ssh') {
    return {
      id,
      projectId,
      kind: 'ssh',
      shell: 'powershell',
      title: opts.title ?? def.name ?? `SSH ${count}`,
      status: 'starting',
      createOpts: {
        kind: 'ssh',
        shell: 'powershell',
        ssh: {
          host: def.host ?? '',
          port: def.port ?? 22,
          username: def.username ?? '',
          credentialRef: def.credentialRef
        },
        script: def.script as ScriptStep[] | undefined,
        defId: def.id,
        vars: opts.project ? projectVars(opts.project) : undefined,
        net: opts.project
          ? {
              adapterMac: opts.project.network.adapterMac,
              ip: opts.project.network.ip,
              prefixLength: opts.project.network.prefixLength
            }
          : undefined
      }
    }
  }
  const shell = opts.shell ?? 'powershell'
  return {
    id,
    projectId,
    kind: 'local',
    shell,
    title: opts.title ?? def?.name ?? `${shell === 'cmd' ? 'CMD' : 'PowerShell'} ${count}`,
    status: 'starting',
    createOpts: {
      kind: 'local',
      shell,
      script: def?.script as ScriptStep[] | undefined,
      defId: def?.id,
      vars: opts.project ? projectVars(opts.project) : undefined
    }
  }
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeByProject: {},

  async open(projectId, opts = {}) {
    const count = get().tabs.filter((t) => t.projectId === projectId).length + 1
    const tab = buildTab(projectId, opts, count)
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeByProject: { ...s.activeByProject, [projectId]: tab.id }
    }))
    return tab.id
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

    if (opts.shell === 'ssh') {
      // SSH komutlari: aktif SSH sekmesine yazilir; yoksa projedeki ilk SSH tanimi acilir.
      const target =
        active?.kind === 'ssh' && active.status !== 'exited'
          ? active
          : state.tabs.find(
              (t) => t.projectId === project.id && t.kind === 'ssh' && t.status !== 'exited'
            )
      if (target && !opts.newTab) {
        state.setActive(project.id, target.id)
        window.api.term.write(target.id, line)
        return
      }
      const def = project.terminals.find((d) => d.kind === 'ssh')
      if (!def) throw new Error('Bu projede SSH oturum tanımı yok.')
      const id = await state.open(project.id, { def, project })
      pendingInput.set(id, [line])
      return
    }

    const reuse =
      !opts.newTab &&
      active &&
      active.kind === 'local' &&
      active.status !== 'exited' &&
      active.shell === opts.shell
    if (reuse && active) {
      window.api.term.write(active.id, line)
      return
    }
    const id = await state.open(project.id, { shell: opts.shell, project })
    pendingInput.set(id, [line])
  }
}))
