import type { ScriptStep } from './types'

/**
 * Senaryo metin bicimi (satir basina bir adim):
 *   send: enable
 *   expect: Password:            (regex; sonuna @5000 ile zaman asimi ms)
 *   send: {{secret:cihaz_pw}}     (kasadaki sifre; yalnizca main surecinde cozulur)
 *   wait: 500
 *   # yorum
 */
export function parseScript(text: string): ScriptStep[] {
  const steps: ScriptStep[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = /^(send|expect|wait)\s*:\s*(.*)$/i.exec(line)
    if (!m) continue
    const kind = m[1].toLowerCase()
    const val = m[2]
    if (kind === 'send') steps.push({ type: 'send', text: val })
    else if (kind === 'expect') {
      const t = /^(.*?)\s*@(\d+)$/.exec(val)
      steps.push(
        t ? { type: 'expect', pattern: t[1], timeoutMs: Number(t[2]) } : { type: 'expect', pattern: val }
      )
    } else if (kind === 'wait') steps.push({ type: 'wait', ms: Number(val) || 0 })
  }
  return steps
}

export function stringifyScript(steps: ScriptStep[] | undefined): string {
  return (steps ?? [])
    .map((s) =>
      s.type === 'send'
        ? `send: ${s.text}`
        : s.type === 'expect'
          ? `expect: ${s.pattern}${s.timeoutMs ? ` @${s.timeoutMs}` : ''}`
          : `wait: ${s.ms}`
    )
    .join('\n')
}
