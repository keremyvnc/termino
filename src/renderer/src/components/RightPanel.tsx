import type { Project } from '@shared/types'
import { NetworkPanel } from './network/NetworkPanel'

/** Sag panel: yalnizca ag profili. Komutlar ve oturumlar sol agacta YAML dosyasi olarak durur. */
export function RightPanel({ project }: { project: Project }) {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-panel">
      <div className="flex h-9 shrink-0 items-center border-b border-border px-3 text-xs font-medium">
        Network profile
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NetworkPanel project={project} />
      </div>
    </aside>
  )
}
