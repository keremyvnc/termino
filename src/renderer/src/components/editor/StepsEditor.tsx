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
            No steps yet — add one with the buttons below.
          </li>
        )}
        {steps.map((step, i) => (
          <li key={i} className="group flex items-start gap-2 rounded-md border border-border bg-panel-2 px-2.5 py-2 transition-colors hover:border-border-strong">
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
              <button className="btn-icon btn-icon-sm" title="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp size={12} />
              </button>
              <button
                className="btn-icon btn-icon-sm"
                title="Move down"
                onClick={() => move(i, 1)}
                disabled={i === steps.length - 1}
              >
                <ArrowDown size={12} />
              </button>
              <button className="btn-icon btn-icon-sm hover:text-danger" title="Delete step" onClick={() => remove(i)}>
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 flex items-center gap-1 text-muted">
          <Plus size={12} /> Add step:
        </span>
        <button className="btn" onClick={() => add({ type: 'send', text: '' })}>
          <Terminal size={12} /> Send command
        </button>
        <button className="btn" onClick={() => add({ type: 'expect', pattern: '', timeoutMs: 15000 })}>
          <Eye size={12} /> Wait for output
        </button>
        <button className="btn" onClick={() => add({ type: 'wait', ms: 1000 })}>
          <Clock size={12} /> Wait
        </button>
        {otherCommands.length > 0 && (
          <button
            className="btn"
            onClick={() => add({ type: 'run', command: otherCommands[0].name })}
            title="Run another command file at this point"
          >
            <ListOrdered size={12} /> Run another command
          </button>
        )}
      </div>
    </div>
  )
}

function StepIcon({ step }: { step: ScriptStep }) {
  const cls = 'mt-1 shrink-0'
  if (step.type === 'send') return <Terminal size={13} className={`${cls} text-accent`} />
  if (step.type === 'expect') return <Eye size={13} className={`${cls} text-warn`} />
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
          <div className="mb-1 text-[11px] text-muted">Send command</div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-muted">$</span>
            <TextField
              mono
              className="input-sm"
              value={step.text}
              placeholder="e.g. cd /var/log   ({{ip}}, {{secret:su}} can be used)"
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
          <div className="mb-1 text-[11px] text-muted">Wait until the output shows</div>
          <div className="flex items-center gap-2">
            <TextField
              mono
              className="input-sm"
              value={step.pattern}
              placeholder='e.g. password:   or   [$#] $'
              onCommit={(pattern) => onChange({ ...step, pattern })}
            />
            <span className="shrink-0 text-[11px] text-muted">up to</span>
            <NumberField
              className="input-sm w-20"
              value={Math.round((step.timeoutMs ?? 15000) / 1000)}
              min={1}
              onCommit={(sec) => onChange({ ...step, timeoutMs: sec * 1000 })}
            />
            <span className="shrink-0 text-[11px] text-muted">s</span>
          </div>
        </div>
      )
    case 'wait':
      return (
        <div>
          <div className="mb-1 text-[11px] text-muted">Wait</div>
          <div className="flex items-center gap-2">
            <NumberField
              className="input-sm w-24"
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
      <div className="mb-1 text-[11px] text-muted">Run another command</div>
      <div className="flex items-center gap-2">
        <select
          className="input input-sm w-auto"
          value={target?.name ?? step.command}
          onChange={(e) => onChange({ type: 'run', command: e.target.value })}
        >
          {!target && <option value={step.command}>{step.command} (not found)</option>}
          {otherCommands.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        {target && (
          <button className="btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {target.steps.length} {target.steps.length === 1 ? 'step' : 'steps'}
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
