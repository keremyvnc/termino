import { useEffect, useRef, useState } from 'react'
import { FolderPlus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

/** Yeni proje olustururken adini soran kucuk diyalog. */
export function NewProjectDialog() {
  const open = useAppStore((s) => s.newProjectOpen)
  const close = useAppStore((s) => s.closeNewProject)
  const createProject = useAppStore((s) => s.createProject)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setBusy(false)
    // Diyalog acilinca alana odaklan.
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  if (!open) return null

  const submit = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      await createProject(name)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 pt-32"
      onMouseDown={close}
    >
      <form
        className="w-[420px] max-w-[90vw] overflow-hidden rounded-lg border border-border bg-panel shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <FolderPlus size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">New project</h2>
        </div>
        <div className="px-4 py-4">
          <label className="label" htmlFor="new-project-name">
            Project name
          </label>
          <input
            id="new-project-name"
            ref={inputRef}
            className="input"
            placeholder="e.g. Field Test"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                close()
              }
            }}
          />
          <p className="mt-2 text-[11px] text-muted">Leave empty to use the name "New Project".</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-2.5">
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Create
          </button>
        </div>
      </form>
    </div>
  )
}
