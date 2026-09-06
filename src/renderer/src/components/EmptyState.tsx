import { FolderPlus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export function EmptyState() {
  const openNewProject = useAppStore((s) => s.openNewProject)
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <FolderPlus size={56} className="mb-5 text-muted/40" />
      <h2 className="mb-2 text-2xl font-semibold">Create your first project</h2>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-muted">
        A project keeps your ready-made commands, network profile and one-click terminal
        sessions together.
      </p>
      <button
        className="inline-flex items-center gap-2.5 rounded-lg border border-accent/40 bg-accent/15 px-7 py-3.5 text-base font-medium text-accent shadow-lg shadow-accent/10 hover:bg-accent/25"
        onClick={openNewProject}
      >
        <FolderPlus size={20} /> Create new project
      </button>
    </div>
  )
}
