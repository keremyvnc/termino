import { ChevronDown, Plus, Server, Terminal as TerminalIcon, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Project } from '@shared/types'
import { useTerminalStore } from '../store/useTerminalStore'
import { XtermView } from './XtermView'

export function TerminalArea({ project }: { project: Project }) {
  const allTabs = useTerminalStore((s) => s.tabs)
  const activeId = useTerminalStore((s) => s.activeByProject[project.id])
  const open = useTerminalStore((s) => s.open)
  const close = useTerminalStore((s) => s.close)
  const setActive = useTerminalStore((s) => s.setActive)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const tabs = allTabs.filter((t) => t.projectId === project.id)

  useEffect(() => {
    if (!menu) return
    const onDoc = (e: MouseEvent): void => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menu])

  // Ctrl+Shift+T yeni sekme, Ctrl+Shift+W kapat, Alt+1..9 sekme sec
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.altKey && !e.ctrlKey && /^[1-9]$/.test(e.key)) {
        const t = tabs[Number(e.key) - 1]
        if (t) {
          e.preventDefault()
          setActive(project.id, t.id)
        }
        return
      }
      if (!e.ctrlKey || !e.shiftKey) return
      if (e.key === 'T') {
        e.preventDefault()
        void open(project.id, { project })
      } else if (e.key === 'W' && activeId) {
        e.preventDefault()
        close(activeId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [project.id, activeId, open, close, tabs, setActive])

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-bg">
      <div className="flex h-9 shrink-0 items-end gap-0.5 border-b border-border bg-panel px-2">
        <div className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.id === activeId
            return (
              <div
                key={t.id}
                onClick={() => setActive(project.id, t.id)}
                onAuxClick={(e) => e.button === 1 && close(t.id)}
                className={`group flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-xs ${
                  active
                    ? 'border-border bg-bg text-fg'
                    : 'border-transparent text-muted hover:bg-panel-2 hover:text-fg'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    t.status === 'running'
                      ? 'bg-emerald-400'
                      : t.status === 'exited'
                        ? 'bg-zinc-500'
                        : 'bg-amber-400'
                  }`}
                />
                {t.kind === 'ssh' && <Server size={11} className="text-accent" />}
                <span className="max-w-40 truncate">{t.title}</span>
                <button
                  className="ml-1 rounded p-0.5 text-muted opacity-0 hover:bg-border hover:text-fg group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    close(t.id)
                  }}
                  title="Kapat (Ctrl+Shift+W)"
                >
                  <X size={11} />
                </button>
              </div>
            )
          })}
        </div>
        <div ref={menuRef} className="relative mb-1 flex shrink-0 items-center">
          <button
            className="btn-icon rounded-r-none"
            title="Yeni PowerShell (Ctrl+Shift+T)"
            onClick={() => void open(project.id, { project })}
          >
            <Plus size={14} />
          </button>
          <button
            className="btn-icon w-5 rounded-l-none"
            onClick={() => setMenu((m) => !m)}
            title="Kabuk seç"
          >
            <ChevronDown size={12} />
          </button>
          {menu && (
            <div className="absolute right-0 top-8 z-20 w-40 rounded-md border border-border bg-panel-2 p-1 shadow-lg">
              {(['powershell', 'cmd'] as const).map((sh) => (
                <button
                  key={sh}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-border/60"
                  onClick={() => {
                    setMenu(false)
                    void open(project.id, { shell: sh, project })
                  }}
                >
                  <TerminalIcon size={12} className="text-muted" />
                  {sh === 'cmd' ? 'CMD' : 'PowerShell'}
                </button>
              ))}
              {project.terminals.length > 0 && <div className="my-1 border-t border-border" />}
              {project.terminals.map((d) => (
                <button
                  key={d.id}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-border/60"
                  onClick={() => {
                    setMenu(false)
                    void open(project.id, { def: d, project })
                  }}
                >
                  {d.kind === 'ssh' ? (
                    <Server size={12} className="text-accent" />
                  ) : (
                    <TerminalIcon size={12} className="text-muted" />
                  )}
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {tabs.map((t) => (
          <XtermView key={t.id} tab={t} visible={t.id === activeId} />
        ))}
        {tabs.length === 0 && (
          <div className="flex h-full items-center justify-center font-mono text-sm text-muted">
            <div className="text-center">
              <TerminalIcon size={36} className="mx-auto mb-3 opacity-40" />
              <p>Bu projede açık terminal yok.</p>
              <button className="btn btn-primary mt-4" onClick={() => void open(project.id, { project })}>
                <Plus size={12} /> PowerShell aç
              </button>
              <p className="mt-3 text-xs opacity-60">
                Ctrl+Shift+T yeni sekme · Ctrl+K komut paleti · Ctrl+F terminalde ara · Alt+1..9 sekme
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
