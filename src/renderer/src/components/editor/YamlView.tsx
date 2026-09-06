import { useMemo, useState } from 'react'
import { AlertTriangle, Save } from 'lucide-react'
import type { Project } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore, type EditorTab } from '../../store/useEditorStore'
import { findDef, patchFromYamlText, toYamlText } from './fileDocument'
import { useYamlEditor } from './useYamlEditor'

/**
 * Ham YAML gorunumu (istege bagli). Metin diskteki dosyayla birebirdir;
 * Ctrl+S ya da Kaydet ile tanima cevrilip projeye yazilir.
 */
export function YamlView({ project, tab, visible }: { project: Project; tab: EditorTab; visible: boolean }) {
  const updateProject = useAppStore((s) => s.updateProject)
  const setDirty = useEditorStore((s) => s.setDirty)
  const dirty = useEditorStore((s) => s.dirty[tab.id] ?? false)
  const [error, setError] = useState<string | null>(null)

  const def = findDef(project, tab)
  const diskText = useMemo(() => toYamlText(def, tab.kind), [def, tab.kind])

  const { hostRef, save } = useYamlEditor({
    tabId: tab.id,
    diskText,
    dirty,
    visible,
    onDirtyChange: (value) => setDirty(tab.id, value),
    onSave: (text) => {
      try {
        void updateProject(patchFromYamlText(project, tab, text))
        setError(null)
        setDirty(tab.id, false)
      } catch (e) {
        setError(String((e as Error).message ?? e))
      }
    }
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-panel-2/40 px-3 text-[11px] text-muted">
        <span>Raw file. Saved changes are reflected in the form view as well.</span>
        {dirty && <span className="text-amber-400">● unsaved</span>}
        <span className="flex-1" />
        <button className="btn py-0.5" disabled={!dirty} onClick={save} title="Save (Ctrl+S)">
          <Save size={12} /> Save
        </button>
      </div>
      {error && (
        <div className="flex shrink-0 items-center gap-2 border-b border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
          <AlertTriangle size={12} /> {error}
        </div>
      )}
      <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden" />
    </div>
  )
}
