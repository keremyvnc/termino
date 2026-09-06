import { FolderPlus, Import, Network, Play, Server } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

/** Hic proje yokken gorunen karsilama ekrani. */
export function EmptyState() {
  const openNewProject = useAppStore((s) => s.openNewProject)
  const importProject = useAppStore((s) => s.importProject)
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <FolderPlus size={30} />
      </span>
      <h2 className="mb-2 text-2xl font-semibold">Create your first project</h2>
      <p className="mb-6 max-w-md text-sm leading-relaxed text-muted">
        A project keeps everything for one device or test bench together, so the next time you
        sit down it is one click each:
      </p>
      <ul className="mb-8 grid max-w-lg grid-cols-3 gap-3 text-left text-xs text-muted">
        <li className="card p-3">
          <Network size={15} className="mb-1.5 text-accent" />
          <span className="font-medium text-fg">Network profile</span>
          <br />
          Set the adapter IP with one click.
        </li>
        <li className="card p-3">
          <Server size={15} className="mb-1.5 text-accent" />
          <span className="font-medium text-fg">Sessions</span>
          <br />
          SSH logins with saved passwords.
        </li>
        <li className="card p-3">
          <Play size={15} className="mb-1.5 text-accent" />
          <span className="font-medium text-fg">Commands</span>
          <br />
          Ready-made step lists to run.
        </li>
      </ul>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary btn-lg" onClick={openNewProject}>
          <FolderPlus size={16} /> Create new project
        </button>
        <button className="btn btn-lg" onClick={() => void importProject()}>
          <Import size={15} /> Import from JSON
        </button>
      </div>
    </div>
  )
}
