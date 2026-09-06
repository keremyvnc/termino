import { PanelRightClose, PanelRightOpen, Search, TerminalSquare } from 'lucide-react'
import { useSelectedProject } from '../store/useAppStore'
import { useUiStore } from '../store/useUiStore'

/**
 * Pencere basligi: surukleme alani, arama (Ctrl+K) ve sag panel dugmesi.
 * Sagda Windows pencere dugmeleri (titleBarOverlay) icin bosluk birakilir.
 */
export function TitleBar() {
  const project = useSelectedProject()
  const togglePalette = useUiStore((s) => s.togglePalette)
  const networkOpen = useUiStore((s) => s.networkPanelOpen)
  const toggleNetwork = useUiStore((s) => s.toggleNetworkPanel)

  return (
    <header className="drag flex h-9 shrink-0 items-center gap-3 border-b border-border bg-bg pl-3 pr-36">
      <div className="flex items-center gap-2">
        <TerminalSquare size={16} className="text-accent" />
        <span className="text-xs font-semibold tracking-wide">Termino</span>
      </div>

      <div className="flex flex-1 justify-center">
        <button
          className="no-drag flex h-7 w-[380px] max-w-full items-center gap-2 rounded-md border border-border bg-panel px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg disabled:opacity-40"
          onClick={togglePalette}
          disabled={!project}
          title="Search commands, sessions and actions (Ctrl+K)"
        >
          <Search size={13} />
          <span className="flex-1 truncate text-left">
            {project ? `Search in ${project.name}…` : 'Search…'}
          </span>
          <span className="kbd">Ctrl K</span>
        </button>
      </div>

      <button
        className={`no-drag btn-icon ${networkOpen ? 'text-fg' : ''}`}
        onClick={toggleNetwork}
        disabled={!project}
        title={networkOpen ? 'Hide network panel' : 'Show network panel'}
        aria-pressed={networkOpen}
      >
        {networkOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
      </button>
    </header>
  )
}
