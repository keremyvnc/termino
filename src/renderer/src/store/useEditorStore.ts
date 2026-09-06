import { create } from 'zustand'
import { useTerminalStore } from './useTerminalStore'

export type FileKind = 'session' | 'command'

/** Sekme cubugunda acik bir YAML dosyasi. Terminal sekmeleriyle ayni cubukta durur. */
export interface EditorTab {
  id: string
  projectId: string
  kind: FileKind
  defId: string
}

interface EditorState {
  tabs: EditorTab[]
  /** Kaydedilmemis degisikligi olan sekmeler */
  dirty: Record<string, boolean>

  /** Dosyayi acar (zaten aciksa one getirir) ve sekme id'sini dondurur. */
  open(projectId: string, kind: FileKind, defId: string): string
  close(id: string): void
  /** Tanim silinince ona ait sekme de kapanir. */
  closeForDef(defId: string): void
  setDirty(id: string, dirty: boolean): void
}

export function editorTabId(kind: FileKind, defId: string): string {
  return `${kind}:${defId}`
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  dirty: {},

  open(projectId, kind, defId) {
    const id = editorTabId(kind, defId)
    if (!get().tabs.some((t) => t.id === id)) {
      set((s) => ({ tabs: [...s.tabs, { id, projectId, kind, defId }] }))
    }
    useTerminalStore.getState().setActive(projectId, id)
    return id
  },

  close(id) {
    set((s) => {
      const dirty = { ...s.dirty }
      delete dirty[id]
      return { tabs: s.tabs.filter((t) => t.id !== id), dirty }
    })
  },

  closeForDef(defId) {
    get()
      .tabs.filter((t) => t.defId === defId)
      .forEach((t) => get().close(t.id))
  },

  setDirty(id, dirty) {
    set((s) => ({ dirty: { ...s.dirty, [id]: dirty } }))
  }
}))
