import { newId } from '@shared/types'
import type { Project, ScriptStep, TerminalDef } from '@shared/types'
import type { TermCreateOptions } from '@shared/ipc'
import { flattenSteps } from '@shared/steps'
import { projectVars } from './projectVariables'

export type LocalShell = 'powershell' | 'cmd'

export interface TermTab {
  id: string
  projectId: string
  title: string
  kind: 'local' | 'ssh'
  shell: LocalShell
  status: 'starting' | 'running' | 'exited'
  exitCode?: number
  /** Main surecine gonderilecek olusturma ayarlari (cols/rows haric) */
  createOpts: Omit<TermCreateOptions, 'id' | 'cols' | 'rows'>
}

export interface OpenOptions {
  shell?: LocalShell
  title?: string
  def?: TerminalDef
  project?: Project
}

/** Sekme bir projeye ait ve henuz kapanmamis mi? */
export function isAlive(tab: TermTab, projectId: string): boolean {
  return tab.projectId === projectId && tab.status !== 'exited'
}

/**
 * Acilacak sekmeyi ve main surecine gidecek ayarlari uretir.
 * Yeni bir tur eklenirse yalnizca bu dosya degisir.
 */
export function createTab(projectId: string, opts: OpenOptions, index: number): TermTab {
  return opts.def?.kind === 'ssh'
    ? createSshTab(projectId, opts, opts.def, index)
    : createLocalTab(projectId, opts, index)
}

function createSshTab(
  projectId: string,
  opts: OpenOptions,
  def: TerminalDef,
  index: number
): TermTab {
  return {
    id: newId(),
    projectId,
    kind: 'ssh',
    shell: 'powershell',
    title: opts.title ?? def.name ?? `SSH ${index}`,
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
      script: connectScript(def, opts.project),
      defId: def.id,
      vars: opts.project ? projectVars(opts.project) : undefined,
      net: opts.project ? netContext(opts.project) : undefined
    }
  }
}

function createLocalTab(projectId: string, opts: OpenOptions, index: number): TermTab {
  const shell = opts.shell ?? 'powershell'
  const def = opts.def
  return {
    id: newId(),
    projectId,
    kind: 'local',
    shell,
    title: opts.title ?? def?.name ?? `${shell === 'cmd' ? 'CMD' : 'PowerShell'} ${index}`,
    status: 'starting',
    createOpts: {
      kind: 'local',
      shell,
      script: def ? connectScript(def, opts.project) : undefined,
      defId: def?.id,
      vars: opts.project ? projectVars(opts.project) : undefined
    }
  }
}

/**
 * Baglanti sonrasi senaryo; `run` adimlari proje bilinince cozulur.
 * Proje verilmemisse (nadir) adimlar oldugu gibi gider.
 */
function connectScript(def: TerminalDef, project: Project | undefined): ScriptStep[] | undefined {
  if (!def.script?.length) return undefined
  return project ? flattenSteps(project, def.script) : def.script
}

/** Baglanti teshisi icin ag profili ozeti. */
function netContext(project: Project): TermCreateOptions['net'] {
  return {
    adapterMac: project.network.adapterMac,
    ip: project.network.ip,
    prefixLength: project.network.prefixLength
  }
}
