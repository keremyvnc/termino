import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { useAppStore, type ToastTone } from '../store/useAppStore'

const TONE: Record<ToastTone, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'border-border bg-panel-2 text-fg', Icon: Info },
  success: { cls: 'border-success/40 bg-panel-2 text-fg', Icon: CheckCircle2 },
  error: { cls: 'border-danger/40 bg-panel-2 text-fg', Icon: AlertCircle }
}

const ICON_TONE: Record<ToastTone, string> = {
  info: 'text-accent',
  success: 'text-success',
  error: 'text-danger'
}

export function Toast() {
  const toast = useAppStore((s) => s.toast)
  if (!toast) return null
  const { cls, Icon } = TONE[toast.tone]
  return (
    <div
      role="status"
      className={`fade-in pointer-events-none fixed bottom-9 left-1/2 z-50 flex max-w-[60vw] -translate-x-1/2 items-start gap-2 rounded-md border px-3 py-2 text-xs shadow-xl ${cls}`}
    >
      <Icon size={14} className={`mt-px shrink-0 ${ICON_TONE[toast.tone]}`} />
      <span className="leading-relaxed">{toast.message}</span>
    </div>
  )
}
