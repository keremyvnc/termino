import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useConfirmStore } from '../store/useConfirmStore'

/** `confirmDialog()` ile sorulan sorunun gorunumu. App icinde bir kez baglanir. */
export function ConfirmDialog() {
  const pending = useConfirmStore((s) => s.pending)
  const answer = useConfirmStore((s) => s.answer)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!pending) return
    const t = setTimeout(() => confirmRef.current?.focus(), 0)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') answer(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [pending, answer])

  if (!pending) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-40"
      onMouseDown={() => answer(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="fade-in w-[400px] max-w-[90vw] overflow-hidden rounded-lg border border-border bg-panel shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          {pending.danger && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
              <AlertTriangle size={16} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{pending.title}</h2>
            {pending.message && (
              <p className="mt-1 text-xs leading-relaxed text-muted">{pending.message}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-2.5">
          <button className="btn" onClick={() => answer(false)}>
            {pending.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={confirmRef}
            className={`btn ${pending.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => answer(true)}
          >
            {pending.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
