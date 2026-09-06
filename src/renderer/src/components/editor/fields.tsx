import { useEffect, useState } from 'react'

/**
 * Yazarken degil, alandan cikinca (veya Enter'da) kaydeden metin alani.
 * Her tus vurusunda diske yazmayi onler; formlar degeri dogrudan projeye yazar.
 */
export function TextField({
  value,
  onCommit,
  className = '',
  mono = false,
  placeholder,
  type = 'text',
  autoFocus,
  id
}: {
  value: string
  onCommit(value: string): void
  className?: string
  mono?: boolean
  placeholder?: string
  type?: 'text' | 'number'
  autoFocus?: boolean
  id?: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  const commit = (): void => {
    if (draft !== value) onCommit(draft)
  }

  return (
    <input
      id={id}
      className={`input ${mono ? 'font-mono' : ''} ${className}`}
      type={type}
      value={draft}
      placeholder={placeholder}
      autoFocus={autoFocus}
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setDraft(value)
      }}
    />
  )
}

export function NumberField({
  value,
  onCommit,
  className = '',
  min = 0
}: {
  value: number
  onCommit(value: number): void
  className?: string
  min?: number
}) {
  return (
    <TextField
      type="number"
      mono
      className={className}
      value={String(value)}
      onCommit={(v) => onCommit(Math.max(min, Number(v) || 0))}
    />
  )
}

export function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted/80">{hint}</p>}
    </div>
  )
}

/** Formdaki bir bolum: baslik, kisa aciklama ve icerik. */
export function FormSection({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="card p-4">
      <h3 className="card-title">{title}</h3>
      {description && <p className="mt-1 text-[11px] leading-relaxed text-muted/80">{description}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}
