import { DEFAULT_SHELL, newId, SSH_SHELL } from '@shared/types'
import type { CommandDef, Project, TerminalDef } from '@shared/types'
import type { FileKind } from '../../store/useEditorStore'

/** Yeni dosyanin id'si ve projeye uygulanacak yama. */
export interface NewFile {
  defId: string
  patch: Partial<Project> & { id: string }
}

/**
 * "Yeni dosya" dugmesinin urettigi varsayilan icerik.
 * Bilesenler bu kurallari bilmez; yalnizca sonucu projeye yazar.
 */
export function buildNewFile(kind: FileKind, project: Project): NewFile {
  const defId = newId()
  return kind === 'session'
    ? {
        defId,
        patch: {
          id: project.id,
          terminals: [...project.terminals, newSession(defId, project)]
        }
      }
    : {
        defId,
        patch: { id: project.id, commands: [...project.commands, newCommand(defId, project)] }
      }
}

function newSession(id: string, project: Project): TerminalDef {
  return {
    id,
    name: uniqueName('new-session', project.terminals),
    kind: 'ssh',
    host: project.network.ip,
    port: 22,
    username: 'root'
  }
}

/** Projede SSH oturumu varsa yeni komut varsayilan olarak onu hedefler. */
function newCommand(id: string, project: Project): CommandDef {
  const firstSsh = project.terminals.find((t) => t.kind === 'ssh')
  return {
    id,
    name: uniqueName('new-command', project.commands),
    target: firstSsh?.name,
    shell: firstSsh ? SSH_SHELL : DEFAULT_SHELL,
    runInNewTab: false,
    steps: []
  }
}

/** "yeni-oturum", "yeni-oturum-2", ... */
function uniqueName(base: string, existing: { name: string }[]): string {
  const taken = new Set(existing.map((item) => item.name))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
}
