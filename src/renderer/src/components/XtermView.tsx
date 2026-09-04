import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { useTerminalStore } from '../store/useTerminalStore'
import type { TermTab } from '../store/useTerminalStore'

const THEME = {
  background: '#0b0f14',
  foreground: '#e5e7eb',
  cursor: '#38bdf8',
  cursorAccent: '#0b0f14',
  selectionBackground: '#38bdf844',
  black: '#1f2a37',
  brightBlack: '#4b5563',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#e5e7eb',
  brightWhite: '#ffffff'
}

/**
 * Tek bir pty oturumunu gosteren xterm.js bileseni.
 * Terminal DOM'da kalir; sekme gizlenince yalnizca display:none olur,
 * boylece scrollback kaybolmaz.
 */
export function XtermView({ tab, visible }: { tab: TermTab; visible: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const markRunning = useTerminalStore((s) => s.markRunning)
  const markExited = useTerminalStore((s) => s.markExited)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const term = new Terminal({
      theme: THEME,
      fontFamily: '"Cascadia Code", "JetBrains Mono", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.15,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: true,
      windowsPty: { backend: 'conpty' }
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(host)
    fit.fit()
    termRef.current = term
    fitRef.current = fit

    let created = false
    const offData = window.api.term.onData((id, data) => {
      if (id === tab.id) term.write(data)
    })
    const offExit = window.api.term.onExit((info) => {
      if (info.id !== tab.id) return
      term.write(`\r\n\x1b[90m[oturum kapandı, kod ${info.exitCode}]\x1b[0m\r\n`)
      markExited(tab.id, info.exitCode)
    })

    void window.api.term
      .create({ ...tab.createOpts, id: tab.id, cols: term.cols, rows: term.rows })
      .then(() => {
        created = true
        markRunning(tab.id)
      })
      .catch((e) => term.write(`\x1b[31mTerminal açılamadı: ${String(e)}\x1b[0m\r\n`))

    const onInput = term.onData((d) => window.api.term.write(tab.id, d))
    const onResize = term.onResize(({ cols, rows }) => window.api.term.resize(tab.id, cols, rows))

    const ro = new ResizeObserver(() => {
      if (host.offsetParent !== null) {
        try {
          fit.fit()
        } catch {
          /* gizli iken olcum basarisiz olabilir */
        }
      }
    })
    ro.observe(host)

    return () => {
      ro.disconnect()
      onInput.dispose()
      onResize.dispose()
      offData()
      offExit()
      if (created) window.api.term.kill(tab.id)
      term.dispose()
    }
    // tab.id sabit; yeniden olusturma istemiyoruz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id])

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => {
        try {
          fitRef.current?.fit()
        } catch {
          /* yok say */
        }
        termRef.current?.focus()
      })
    }
  }, [visible])

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 p-2"
      style={{ display: visible ? 'block' : 'none' }}
    />
  )
}
