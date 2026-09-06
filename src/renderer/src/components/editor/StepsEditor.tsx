import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  CornerDownRight,
  Eye,
  ListOrdered,
  Plus,
  Terminal,
  Trash2
} from 'lucide-react'
import type { Project, ScriptStep } from '@shared/types'
import { findCommand } from '@shared/steps'
import { NumberField, TextField } from './fields'
import { formatDuration, stepSummary } from './stepText'

/**
 * Adim listesinin insan dilinde, formla duzenlenen hali. YAML yazmadan
 * "komut gonder / cikti bekle / sure bekle / baska komutu calistir" eklenir.
 */
export function StepsEditor({
  steps,
  project,
  onChange,
  excludeCommandId
}: {
  steps: ScriptStep[]
  project: Project
  onChange(steps: ScriptStep[]): void
  /** Komut kendi kendini cagirmasin diye listeden cikarilir. */
  excludeCommandId?: string
}) {
  const update = (i: number, step: ScriptStep): void =>
    onChange(steps.map((s, j) => (j === i ? step : s)))
  const remove = (i: number): void => onChange(steps.filter((_, j) => j !== i))
  const move = (i: number, dir: -1 | 1): void => {
    const j = i + dir
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const add = (step: ScriptStep): void => onChange([...steps, step])

  const otherCommands = project.commands.filter((c) => c.id !== excludeCommandId)

  return (
    <div>
      <ol className="space-y-1.5">
        {steps.length === 0 && (
          <li className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
            Henüz adım yok. Aşağıdan ekle.
          </li>
        )}
        {steps.map((step, i) => (
          <li key={i} className="group flex items-start gap-2 rounded-md border border-border bg-panel-2 px-2.5 py-2">
            <span className="mt-1 w-5 shrink-0 text-right font-mono text-[11px] text-muted">{i + 1}.</span>
            <StepIcon step={step} />
            <div className="min-w-0 flex-1">
              <StepBody
                step={step}
                project={project}
                onChange={(s) => update(i, s)}
                otherCommands={otherCommands}
              />
            </div>
            <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100">
              <button className="btn-icon h-6 w-6" title="Yukarı" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp size={12} />
              </button>
              <button
                className="btn-icon h-6 w-6"
                title="Aşağı"
                onClick={() => move(i, 1)}
                disabled={i === steps.length - 1}
              >
                <ArrowDown size={12} />
              </button>
              <button className="btn-icon h-6 w-6 hover:text-red-300" title="Adımı sil" onClick={() => remove(i)}>
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 flex items-center gap-1 text-muted">
          <Plus size={12} /> Adım ekle:
        </span>
        <button className="btn" onClick={() => add({ type: 'send', text: '' })}>
          <Terminal size={12} /> Komut gönder
        </button>
        <button className="btn" onClick={() => add({ type: 'expect', pattern: '', timeoutMs: 15000 })}>
          <Eye size={12} /> Çıktı bekle
        </button>
        <button className="btn" onClick={() => add({ type: 'wait', ms: 1000 })}>
          <Clock size={12} /> Süre bekle
        </button>
        {otherCommands.length > 0 && (
          <button
            className="btn"
            onClick={() => add({ type: 'run', command: otherCommands[0].name })}
            title="Başka bir komut dosyasını bu noktada çalıştır"
          >
            <ListOrdered size={12} /> Başka komutu çalıştır
          </button>
        )}
      </div>
    </div>
  )
}

function StepIcon({ step }: { step: ScriptStep }) {
  const cls = 'mt-1 shrink-0'
  if (step.type === 'send') return <Terminal size={13} className={`${cls} text-accent`} />
  if (step.type === 'expect') return <Eye size={13} className={`${cls} text-amber-300`} />
  if (step.type === 'wait') return <Clock size={13} className={`${cls} text-muted`} />
  return <ListOrdered size={13} className={`${cls} text-purple-300`} />
}

function StepBody({
  step,
  project,
  onChange,
  otherCommands
}: {
  step: ScriptStep
  project: Project
  onChange(step: ScriptStep): void
  otherCommands: Project['commands']
}) {
  switch (step.type) {
    case 'send':
      return (
        <div>
          <div className="mb-1 text-[11px] text-muted">Komut gönder</div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-muted">$</span>
            <TextField
              mono
              className="py-1 text-xs"
              value={step.text}
              placeholder="örn. cd /var/log   ({{ip}}, {{secret:su}} kullanılabilir)"
              onCommit={(text) => onChange({ type: 'send', text })}
            />
          </div>
          {/\{\{/.test(step.text) && (
            <div className="mt-1 pl-4 text-[11px] text-muted">→ {stepSummary(step, project)}</div>
          )}
        </div>
      )
    case 'expect':
      return (
        <div>
          <div className="mb-1 text-[11px] text-muted">Çıktıda şu görünene kadar bekle</div>
          <div className="flex items-center gap-2">
            <TextField
              mono
              className="py-1 text-xs"
              value={step.pattern}
              placeholder='örn. password:   veya   [$#] $'
              onCommit={(pattern) => onChange({ ...step, pattern })}
            />
            <span className="shrink-0 text-[11px] text-muted">en çok</span>
            <NumberField
              className="w-20 py-1 text-xs"
              value={Math.round((step.timeoutMs ?? 15000) / 1000)}
              min={1}
              onCommit={(sec) => onChange({ ...step, timeoutMs: sec * 1000 })}
            />
            <span className="shrink-0 text-[11px] text-muted">sn</span>
          </div>
        </div>
      )
    case 'wait':
      return (
        <div>
          <div className="mb-1 text-[11px] text-muted">Süre bekle</div>
          <div className="flex items-center gap-2">
            <NumberField
              className="w-24 py-1 text-xs"
              value={step.ms}
              onCommit={(ms) => onChange({ type: 'wait', ms })}
            />
            <span className="text-[11px] text-muted">ms ({formatDuration(step.ms)})</span>
          </div>
        </div>
      )
    case 'run':
      return <RunStep step={step} project={project} onChange={onChange} otherCommands={otherCommands} />
  }
}

/** Baska komutu cagiran adim: secim + icerigini acip gorme. */
function RunStep({
  step,
  project,
  onChange,
  otherCommands
}: {
  step: ScriptStep & { type: 'run' }
  project: Project
  onChange(step: ScriptStep): void
  otherCommands: Project['commands']
}) {
  const [expanded, setExpanded] = useState(false)
  const target = findCommand(project, step.command)
  return (
    <div>
      <div className="mb-1 text-[11px] text-muted">Başka komutu çalıştır</div>
      <div className="flex items-center gap-2">
        <select
          className="input w-auto py-1 text-xs"
          value={target?.name ?? step.command}
          onChange={(e) => onChange({ type: 'run', command: e.target.value })}
        >
          {!target && <option value={step.command}>{step.command} (bulunamadı)</option>}
          {otherCommands.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        {target && (
          <button className="btn py-1" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {target.steps.length} adım
          </button>
        )}
      </div>
      {expanded && target && (
        <ol className="mt-1.5 space-y-0.5 border-l border-border/60 pl-3 text-[11px] text-muted">
          {target.steps.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <CornerDownRight size={10} className="shrink-0 opacity-60" />
              <span className={s.type === 'send' ? 'font-mono' : ''}>
                {s.type === 'send' ? '$ ' : ''}
                {stepSummary(s, project)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
