import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Server, Terminal, Zap } from 'lucide-react'
import type { Project } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import { expandVariables, useTerminalStore } from '../store/useTerminalStore'

interface Item {
  id: string
  group: 'komut' | 'oturum' | 'eylem'
  label: string
  hint: string
  icon: React.ReactNode
  run: () => void | Promise<unknown>
}

/** Ctrl+K: komutlar, oturumlar ve hizli eylemler icin arama paleti. */
export function CommandPalette({ project, onClose }: { project: Project; onClose: () => void }) {
  const run = useTerminalStore((s) => s.run)
  const open = useTerminalStore((s) => s.open)
  const showToast = useAppStore((s) => s.showToast)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo<Item[]>(() => {
    const cmds: Item[] = project.commands.map((c) => ({
      id: 'c:' + c.id,
      group: 'komut',
      label: c.name,
      hint: expandVariables(c.text, project),
      icon: <Play size={13} className="text-accent" />,
      run: () =>
        run(project, expandVariables(c.text, project), { newTab: c.runInNewTab, shell: c.shell })
    }))
    const defs: Item[] = project.terminals.map((t) => ({
      id: 't:' + t.id,
      group: 'oturum',
      label: t.name,
      hint: t.kind === 'ssh' ? `${t.username}@${t.host}:${t.port}` : 'yerel PowerShell',
      icon:
        t.kind === 'ssh' ? (
          <Server size={13} className="text-accent" />
        ) : (
          <Terminal size={13} className="text-muted" />
        ),
      run: () => open(project.id, { def: t, project })
    }))
    const actions: Item[] = [
      {
        id: 'a:ps',
        group: 'eylem',
        label: 'Yeni PowerShell',
        hint: 'Ctrl+Shift+T',
        icon: <Terminal size={13} className="text-muted" />,
        run: () => open(project.id, { project })
      },
      {
        id: 'a:cmd',
        group: 'eylem',
        label: 'Yeni CMD',
        hint: '',
        icon: <Terminal size={13} className="text-muted" />,
        run: () => open(project.id, { shell: 'cmd', project })
      },
      {
        id: 'a:net',
        group: 'eylem',
        label: 'Ağ profilini uygula',
        hint: project.network.adapterMac
          ? `${project.network.ip}/${project.network.prefixLength}`
          : 'adaptör seçilmedi',
        icon: <Zap size={13} className="text-amber-400" />,
        run: async () => {
          if (!project.network.adapterMac) return showToast('Önce Ağ sekmesinden adaptör seç.')
          const r = await window.api.network.apply(project.network.adapterMac, project.network)
          showToast(r.message)
        }
      }
    ]
    const all = [...cmds, ...defs, ...actions]
    const needle = q.trim().toLowerCase()
    if (!needle) return all
    return all.filter((i) => (i.label + ' ' + i.hint).toLowerCase().includes(needle))
  }, [project, q, run, open, showToast])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  useEffect(() => setIdx(0), [q])

  const choose = (item: Item | undefined): void => {
    if (!item) return
    onClose()
    Promise.resolve(item.run()).catch((e) => showToast(String((e as Error).message ?? e)))
  }

  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIdx((i) => Math.min(items.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(items[idx])
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 pt-24"
      onMouseDown={onClose}
    >
      <div
        className="w-[560px] max-w-[90vw] overflow-hidden rounded-lg border border-border bg-panel shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted/60"
          placeholder="Komut, oturum veya eylem ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
        />
        <ul className="max-h-80 overflow-y-auto p-1">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted">Eşleşen bir şey yok</li>
          )}
          {items.map((it, i) => (
            <li key={it.id}>
              <button
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left ${
                  i === idx ? 'bg-panel-2' : 'hover:bg-panel-2/60'
                }`}
                onMouseEnter={() => setIdx(i)}
                onClick={() => choose(it)}
              >
                {it.icon}
                <span className="text-sm">{it.label}</span>
                <span className="ml-auto max-w-[50%] truncate font-mono text-[11px] text-muted">
                  {it.hint}
                </span>
                <span className="w-12 text-right text-[10px] uppercase text-muted/70">{it.group}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 border-t border-border px-3 py-1.5 text-[10px] text-muted">
          <span>↑↓ seç</span>
          <span>Enter çalıştır</span>
          <span>Esc kapat</span>
        </div>
      </div>
    </div>
  )
}
