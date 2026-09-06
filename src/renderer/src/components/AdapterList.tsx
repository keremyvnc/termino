import { Cable, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useUiStore } from '../store/useUiStore'

export function statusColor(status: string): string {
  if (status === 'Up') return 'bg-success'
  if (status === 'Disconnected') return 'bg-warn'
  return 'bg-zinc-500'
}

/** Sol panelin altindaki canli adaptor listesi. Varsayilan olarak kapali; basligi ozet gosterir. */
export function AdapterList() {
  const adapters = useAppStore((s) => s.adapters)
  const refresh = useAppStore((s) => s.refreshAdapters)
  const projects = useAppStore((s) => s.projects)
  const expanded = useUiStore((s) => s.adaptersExpanded)
  const toggle = useUiStore((s) => s.toggleAdapters)

  const usedBy = (mac: string): string | undefined =>
    projects.find((p) => p.network.adapterMac === mac)?.name
  const up = adapters.filter((a) => a.status === 'Up').length

  return (
    <div className="flex max-h-72 shrink-0 flex-col border-t border-border">
      <div className="section-title pr-1">
        <button
          className="flex h-full flex-1 items-center gap-1.5 hover:text-fg"
          onClick={toggle}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Cable size={12} /> Adapters
          <span className="normal-case tracking-normal text-muted/70">
            {up}/{adapters.length} up
          </span>
        </button>
        {expanded && (
          <button className="btn-icon btn-icon-sm" title="Refresh adapters" onClick={() => void refresh()}>
            <RefreshCw size={12} />
          </button>
        )}
      </div>
      {expanded && (
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {adapters.length === 0 && (
            <li className="px-2 py-2 text-[11px] text-muted">No adapters found.</li>
          )}
          {adapters.map((a) => (
            <li
              key={a.mac || a.name}
              className="mb-0.5 rounded-md px-2 py-1 text-xs"
              title={`${a.description}\n${a.mac}`}
            >
              <div className="flex items-center gap-2">
                <span className={`dot ${statusColor(a.status)}`} />
                <span className="truncate">{a.name}</span>
                {usedBy(a.mac) && (
                  <span className="chip chip-accent ml-auto max-w-[45%] truncate">{usedBy(a.mac)}</span>
                )}
              </div>
              <div className="pl-4 font-mono text-[11px] text-muted">
                {a.ipv4[0] ?? (a.status === 'Up' ? '—' : a.status)}
                {a.dhcp && a.ipv4[0] ? ' · dhcp' : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
