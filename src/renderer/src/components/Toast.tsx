import { useAppStore } from '../store/useAppStore'

export function Toast() {
  const toast = useAppStore((s) => s.toast)
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs shadow-lg">
      {toast}
    </div>
  )
}
