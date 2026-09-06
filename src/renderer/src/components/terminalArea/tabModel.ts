import type { Project } from '@shared/types'
import type { EditorTab } from '../../store/useEditorStore'
import type { TermTab } from '../../store/useTerminalStore'

/** Sekme cubugunda terminal ve editor sekmeleri ayni bicimde gosterilir. */
export interface AreaTab {
  id: string
  title: string
  icon: 'file' | 'ssh' | 'local'
  status?: TermTab['status']
}

/** Once terminaller, sonra dosyalar; sira Alt+1..9 kisayolunu belirler. */
export function buildAreaTabs(
  project: Project,
  terminals: TermTab[],
  files: EditorTab[]
): AreaTab[] {
  return [
    ...terminals.map(
      (t): AreaTab => ({ id: t.id, title: t.title, icon: t.kind, status: t.status })
    ),
    ...files.map((f): AreaTab => ({ id: f.id, title: fileTitle(project, f), icon: 'file' }))
  ]
}

export function fileTitle(project: Project, tab: EditorTab): string {
  const def =
    tab.kind === 'session'
      ? project.terminals.find((t) => t.id === tab.defId)
      : project.commands.find((c) => c.id === tab.defId)
  return def ? def.name : '(deleted)'
}
