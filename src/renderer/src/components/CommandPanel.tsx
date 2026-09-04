import { useState } from 'react'
import { Pencil, Play, Plus, Trash2, X } from 'lucide-react'
import type { CommandDef, Project, ShellKind } from '@shared/types'
import { newId } from '@shared/types'
import { useAppStore } from '../store/useAppStore'

const SHELLS: { id: ShellKind; label: string }[] = [
  { id: 'powershell', label: 'PowerShell' },
  { id: 'cmd', label: 'CMD' },
  { id: 'ssh', label: 'SSH' }
]

export function CommandPanel({ project }: { project: Project }) {
  const updateProject = useAppStore((s) => s.updateProject)
  const showToast = useAppStore((s) => s.showToast)
  const [editing, setEditing] = useState<CommandDef | null>(null)

  const save = (cmd: CommandDef): void => {
    const exists = project.commands.some((c) => c.id === cmd.id)
    const commands = exists
      ? project.commands.map((c) => (c.id === cmd.id ? cmd : c))
      : [...project.commands, cmd]
    void updateProject({ id: project.id, commands })
    setEditing(null)
  }
  const remove = (id: string): void => {
    void updateProject({ id: project.id, commands: project.commands.filter((c) => c.id !== id) })
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Hazır komutlar
        </span>
        <button
          className="btn"
          onClick={() =>
            setEditing({ id: newId(), name: '', shell: 'powershell', text: '', runInNewTab: false })
          }
        >
          <Plus size={12} /> Ekle
        </button>
      </div>

      {editing && <CommandEditor cmd={editing} onSave={save} onCancel={() => setEditing(null)} />}

      {project.commands.length === 0 && !editing && (
        <p className="py-6 text-center text-xs text-muted">
          Bu projede komut yok. Sık kullandığın komutları buraya ekle.
        </p>
      )}

      <ul className="space-y-1.5">
        {project.commands.map((c) => (
          <li
            key={c.id}
            className="group rounded-md border border-border bg-panel-2 px-2.5 py-2"
          >
            <div className="flex items-center gap-2">
              <button
                className="btn-icon h-6 w-6 text-accent"
                title="Çalıştır (Asama 2)"
                onClick={() => showToast('Terminal 2. aşamada geliyor: ' + c.text)}
              >
                <Play size={12} />
              </button>
              <span className="truncate text-sm">{c.name || '(adsız)'}</span>
              <span className="ml-auto rounded bg-bg px-1.5 py-0.5 text-[10px] uppercase text-muted">
                {c.shell}
              </span>
              <button
                className="btn-icon h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => setEditing(c)}
              >
                <Pencil size={12} />
              </button>
              <button
                className="btn-icon h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-red-300"
                onClick={() => remove(c.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <pre className="mt-1 truncate pl-8 font-mono text-[11px] text-muted">{c.text}</pre>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CommandEditor({
  cmd,
  onSave,
  onCancel
}: {
  cmd: CommandDef
  onSave: (c: CommandDef) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(cmd)
  return (
    <div className="mb-3 rounded-md border border-accent/40 bg-panel-2 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium">Komut</span>
        <button className="btn-icon h-6 w-6" onClick={onCancel}>
          <X size={12} />
        </button>
      </div>
      <label className="label">Ad</label>
      <input
        className="input mb-2"
        autoFocus
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        placeholder="örn. Cihaza ping at"
      />
      <label className="label">Komut metni</label>
      <textarea
        className="input mb-2 h-20 resize-none font-mono text-xs"
        value={draft.text}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        placeholder={'ping {{ip}}\n{{ip}} proje ağ profilinden gelir'}
      />
      <div className="mb-2 flex items-center gap-2">
        <select
          className="input w-auto"
          value={draft.shell}
          onChange={(e) => setDraft({ ...draft, shell: e.target.value as ShellKind })}
        >
          {SHELLS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={draft.runInNewTab}
            onChange={(e) => setDraft({ ...draft, runInNewTab: e.target.checked })}
          />
          Yeni sekmede
        </label>
      </div>
      <div className="flex justify-end gap-1">
        <button className="btn" onClick={onCancel}>
          Vazgeç
        </button>
        <button
          className="btn btn-primary"
          disabled={!draft.name.trim() || !draft.text.trim()}
          onClick={() => onSave(draft)}
        >
          Kaydet
        </button>
      </div>
    </div>
  )
}
