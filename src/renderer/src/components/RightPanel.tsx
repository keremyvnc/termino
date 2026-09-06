import { Network, X } from 'lucide-react'
import type { Project } from '@shared/types'
import { useUiStore } from '../store/useUiStore'
import { NetworkPanel } from './network/NetworkPanel'

/** Sag panel: yalnizca ag profili. Komutlar ve oturumlar sol agacta YAML dosyasi olarak durur. */
export function RightPanel({ project }: { project: Project }) {
  const close = useUiStore((s) => s.setNetworkPanel)
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-panel">
      <div className="section-title pr-1">
        <span className="flex items-center gap-1.5">
          <Network size={12} /> Network profile
        </span>
        <button className="btn-icon btn-icon-sm" title="Hide panel" onClick={() => close(false)}>
          <X size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NetworkPanel project={project} />
      </div>
    </aside>
  )
}
