import type { CommandDef, Project, TerminalDef } from '@shared/types'
import {
  commandFromYaml,
  commandToYaml,
  sessionFromYaml,
  sessionToYaml
} from '@shared/projectYaml'
import type { EditorTab, FileKind } from '../../store/useEditorStore'

/** Editorde acilabilen tanimlar. */
export type FileDef = TerminalDef | CommandDef

/**
 * "Hangi dosya turu hangi donusumu kullanir" bilgisi tek yerde durur.
 * Yeni bir dosya turu eklendiginde bilesenler degil bu modul degisir.
 */

export function findDef(project: Project, tab: EditorTab): FileDef | undefined {
  return tab.kind === 'session'
    ? project.terminals.find((t) => t.id === tab.defId)
    : project.commands.find((c) => c.id === tab.defId)
}

/** Tanimin diskteki YAML metni. Editorde gorulen metinle birebir aynidir. */
export function toYamlText(def: FileDef | undefined, kind: FileKind): string {
  if (!def) return ''
  return kind === 'session'
    ? sessionToYaml(def as TerminalDef)
    : commandToYaml(def as CommandDef)
}

/**
 * Metni tanima cevirip projeye uygulanacak yamayi uretir.
 * YAML gecersizse hata firlatir; cagiran taraf bunu kullaniciya gosterir.
 */
export function patchFromYamlText(
  project: Project,
  tab: EditorTab,
  text: string
): Partial<Project> & { id: string } {
  if (tab.kind === 'session') {
    const next = sessionFromYaml(text, { id: tab.defId })
    return {
      id: project.id,
      terminals: project.terminals.map((t) => (t.id === tab.defId ? next : t))
    }
  }
  const next = commandFromYaml(text, { id: tab.defId })
  return {
    id: project.id,
    commands: project.commands.map((c) => (c.id === tab.defId ? next : c))
  }
}

export function folderLabel(kind: FileKind): string {
  return kind === 'session' ? 'sessions' : 'commands'
}
