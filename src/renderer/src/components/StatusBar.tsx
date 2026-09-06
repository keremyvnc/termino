import { Cable, FolderOpen, Unplug } from 'lucide-react'
import type { Project } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import { useUiStore } from '../store/useUiStore'
import { isProfileApplied } from './network/profileValidation'
import { statusColor } from './AdapterList'

const VERSION = 'v0.1.0'

/**
 * Alt durum cubugu: bagli adaptor ve profil durumu bir bakista gorunur;
 * tiklaninca ag paneli acilir. Sagda kisayol ipuclari ve veri klasoru.
 */
export function StatusBar({ project }: { project: Project | null }) {
  const adapters = useAppStore((s) => s.adapters)
  const setNetworkPanel = useUiStore((s) => s.setNetworkPanel)

  const profile = project?.network
  const bound = profile ? adapters.find((a) => a.mac === profile.adapterMac) : undefined
  const applied = profile ? isProfileApplied(bound, profile) : false

  return (
    <footer className="flex h-6 shrink-0 items-center gap-3 border-t border-border bg-panel px-2 text-[11px] text-muted">
      {project && (
        <button
          className="flex h-full items-center gap-1.5 rounded px-1.5 hover:bg-panel-3 hover:text-fg"
          onClick={() => setNetworkPanel(true)}
          title="Open network panel"
        >
          {!profile?.adapterMac ? (
            <>
              <Cable size={12} /> No adapter bound
            </>
          ) : !bound ? (
            <>
              <Unplug size={12} className="text-warn" /> Adapter not plugged in
            </>
          ) : (
            <>
              <span className={`dot ${statusColor(bound.status)}`} />
              <span className="font-medium text-fg">{bound.name}</span>
              <span className="font-mono">{bound.ipv4[0] ?? bound.status}</span>
              <span className={applied ? 'text-success' : 'text-warn'}>
                {applied ? '· profile applied' : `· profile ${profile?.ip} not applied`}
              </span>
            </>
          )}
        </button>
      )}

      <span className="flex-1" />

      <span className="hidden items-center gap-1 lg:flex">
        <span className="kbd">Ctrl K</span> search
      </span>
      <span className="hidden items-center gap-1 lg:flex">
        <span className="kbd">Ctrl Shift T</span> terminal
      </span>
      <span className="hidden items-center gap-1 lg:flex">
        <span className="kbd">Alt 1-9</span> tabs
      </span>
      <button
        className="flex h-full items-center gap-1 rounded px-1.5 hover:bg-panel-3 hover:text-fg"
        title="Open the data folder (YAML files)"
        onClick={() => void window.api.app.openDataDir()}
      >
        <FolderOpen size={12} /> Data folder
      </button>
      <span className="pr-1">{VERSION}</span>
    </footer>
  )
}
