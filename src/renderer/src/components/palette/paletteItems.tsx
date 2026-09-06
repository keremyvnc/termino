import { Globe, Play, Server, Terminal, Zap } from 'lucide-react'
import type { CommandDef, Project, TerminalDef } from '@shared/types'
import { expandVariables } from '../../store/projectVariables'

export type PaletteGroup = 'komut' | 'oturum' | 'eylem'

export interface PaletteItem {
  id: string
  group: PaletteGroup
  label: string
  hint: string
  icon: React.ReactNode
  run: () => void | Promise<unknown>
}

/** Paletin ihtiyac duydugu eylemler; bilesen bunlari store'dan saglar. */
export interface PaletteActions {
  runCommand(project: Project, cmd: CommandDef): Promise<void>
  openDef(project: Project, def: TerminalDef): Promise<string>
  openTerminal(projectId: string, opts: { project: Project; shell?: 'cmd' }): Promise<string>
  showToast(message: string): void
}

/** Palet listesini kurar: komutlar, oturumlar, hizli eylemler. */
export function buildPaletteItems(project: Project, actions: PaletteActions): PaletteItem[] {
  return [
    ...project.commands.map((cmd) => commandItem(project, cmd, actions)),
    ...project.terminals.map((def) => sessionItem(project, def, actions)),
    ...quickActions(project, actions)
  ]
}

export function filterPaletteItems(items: PaletteItem[], query: string): PaletteItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return items
  return items.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(needle))
}

function commandItem(project: Project, cmd: CommandDef, actions: PaletteActions): PaletteItem {
  return {
    id: `c:${cmd.id}`,
    group: 'komut',
    label: cmd.name,
    hint: commandHint(project, cmd),
    icon: <Play size={13} className="text-accent" />,
    run: () => actions.runCommand(project, cmd)
  }
}

/** Ilk send adimi + kalan adim sayisi; hedef oturum varsa onunla baslar. */
function commandHint(project: Project, cmd: CommandDef): string {
  const firstSend = cmd.steps.find((s) => s.type === 'send')
  const target = cmd.target ? `${cmd.target} · ` : ''
  const preview = firstSend ? expandVariables(firstSend.text, project) : ''
  const rest = cmd.steps.length > 1 ? ` (+${cmd.steps.length - 1})` : ''
  return `${target}${preview}${rest}`
}

function sessionItem(project: Project, def: TerminalDef, actions: PaletteActions): PaletteItem {
  return {
    id: `t:${def.id}`,
    group: 'oturum',
    label: def.name,
    hint: sessionHint(def),
    icon: sessionIcon(def),
    run: () => actions.openDef(project, def)
  }
}

function sessionHint(def: TerminalDef): string {
  if (def.kind === 'ssh') return `${def.username}@${def.host}:${def.port}`
  if (def.kind === 'web') return def.url ?? ''
  return 'yerel PowerShell'
}

function sessionIcon(def: TerminalDef): React.ReactNode {
  if (def.kind === 'ssh') return <Server size={13} className="text-accent" />
  if (def.kind === 'web') return <Globe size={13} className="text-accent" />
  return <Terminal size={13} className="text-muted" />
}

function quickActions(project: Project, actions: PaletteActions): PaletteItem[] {
  return [
    {
      id: 'a:ps',
      group: 'eylem',
      label: 'Yeni PowerShell',
      hint: 'Ctrl+Shift+T',
      icon: <Terminal size={13} className="text-muted" />,
      run: () => actions.openTerminal(project.id, { project })
    },
    {
      id: 'a:cmd',
      group: 'eylem',
      label: 'Yeni CMD',
      hint: '',
      icon: <Terminal size={13} className="text-muted" />,
      run: () => actions.openTerminal(project.id, { project, shell: 'cmd' })
    },
    {
      id: 'a:net',
      group: 'eylem',
      label: 'Ağ profilini uygula',
      hint: project.network.adapterMac
        ? `${project.network.ip}/${project.network.prefixLength}`
        : 'adaptör seçilmedi',
      icon: <Zap size={13} className="text-amber-400" />,
      run: async () => {
        const mac = project.network.adapterMac
        if (!mac) return actions.showToast('Önce Ağ sekmesinden adaptör seç.')
        const result = await window.api.network.apply(mac, project.network)
        actions.showToast(result.message)
      }
    }
  ]
}
