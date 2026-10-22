/**
 * Shared building blocks for the role dashboards (Admin, Auditor, Officer).
 * Presentation only: no data fetching or business logic lives here.
 */
import type { ReactNode } from 'react'
import { AlertCircle, Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TransactionRecord } from '../lib/api'

export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'slate'

/* ---------- formatters ---------- */

export function humanize(value?: string | null) {
  if (!value) return '—'
  const text = value.replace(/_/g, ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function formatMoney(value?: string | number | null) {
  const n = Number(value)
  return value === null || value === undefined || Number.isNaN(n) ? '—' : `${n.toLocaleString('en-US')} RWF`
}

/* ---------- cards and panels ---------- */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <header className="lg-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions && <div className="lg-head__actions">{actions}</div>}
    </header>
  )
}

export function StatCard({
  icon: Icon, tone, label, value, hint, onClick,
}: { icon: LucideIcon; tone: Tone; label: string; value: ReactNode; hint?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className={`lg-stat__icon lg-tone--${tone}`}><Icon size={20} aria-hidden="true" /></span>
      <span className="lg-stat__text">
        <span className="lg-stat__label">{label}</span>
        <strong className="lg-stat__value">{value}</strong>
        {hint && <span className="lg-stat__hint">{hint}</span>}
      </span>
    </>
  )
  return onClick
    ? <button type="button" className="lg-stat lg-stat--link" onClick={onClick}>{body}</button>
    : <div className="lg-stat">{body}</div>
}

export function Panel({
  title, subtitle, action, children, className = '',
}: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`lg-panel ${className}`}>
      <div className="lg-panel__head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="lg-panel__body">{children}</div>
    </section>
  )
}

/* ---------- loading, empty and error states ---------- */

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="lg-skeleton" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <span key={i} />)}
    </div>
  )
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="lg-empty">
      <Inbox size={22} aria-hidden="true" />
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="lg-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{message}</span>
      {onRetry && <button type="button" onClick={onRetry}>Try again</button>}
    </div>
  )
}

/* ---------- status and risk badges (text always accompanies colour) ---------- */

const STATUS_TONE: Record<string, Tone> = {
  COMPLETED: 'green', APPROVED: 'green', VERIFIED: 'green', RESOLVED: 'green', ACTIVE: 'green', CLOSED: 'slate',
  UNDER_REVIEW: 'blue', OPEN: 'blue',
  PENDING: 'amber', NEEDS_INFORMATION: 'amber', NEEDS_CLARIFICATION: 'amber', UPLOADED: 'amber',
  FLAGGED: 'red', REJECTED: 'red', INCONSISTENT: 'red', DISPUTED: 'red', INACTIVE: 'red',
}

export function StatusBadge({ status }: { status?: string | null }) {
  const tone = STATUS_TONE[(status ?? '').toUpperCase()] ?? 'slate'
  return <span className={`lg-badge lg-badge--${tone}`}>{humanize(status)}</span>
}

const RISK_TONE: Record<string, Tone> = { LOW: 'green', MEDIUM: 'amber', HIGH: 'red' }

export function RiskBadge({ level }: { level?: string | null }) {
  if (!level) return <span className="lg-badge lg-badge--slate">Not analysed</span>
  return <span className={`lg-badge lg-badge--${RISK_TONE[level.toUpperCase()] ?? 'slate'}`}>{humanize(level)} risk</span>
}

/* ---------- monthly transactions chart ---------- */

export type MonthBucket = { label: string; completed: number; active: number; flagged: number }

/** Groups real transactions into the six months ending at the latest transaction date. */
export function monthlySeries(txs: TransactionRecord[], months = 6): MonthBucket[] {
  const times = txs.map((t) => new Date(t.transaction_date).getTime()).filter((n) => !Number.isNaN(n))
  const anchor = times.length ? new Date(Math.max(...times)) : new Date()
  const buckets: MonthBucket[] = []
  const index = new Map<number, MonthBucket>()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)
    const bucket = { label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), completed: 0, active: 0, flagged: 0 }
    buckets.push(bucket)
    index.set(d.getFullYear() * 12 + d.getMonth(), bucket)
  }
  for (const t of txs) {
    const d = new Date(t.transaction_date)
    const bucket = index.get(d.getFullYear() * 12 + d.getMonth())
    if (!bucket) continue
    const s = (t.status ?? '').toUpperCase()
    if (s === 'COMPLETED' || s === 'APPROVED') bucket.completed++
    else if (s === 'FLAGGED' || s === 'REJECTED') bucket.flagged++
    else bucket.active++
  }
  return buckets
}

const SERIES: { key: 'completed' | 'active' | 'flagged'; label: string; color: string }[] = [
  { key: 'completed', label: 'Completed or approved', color: '#10b981' },
  { key: 'active', label: 'Pending or under review', color: '#3b82f6' },
  { key: 'flagged', label: 'Flagged or rejected', color: '#ef4444' },
]

export function MonthlyChart({ data }: { data: MonthBucket[] }) {
  const max = Math.max(0, ...data.flatMap((b) => SERIES.map((s) => b[s.key])))
  if (max === 0) return <EmptyState title="No transactions in this period" text="The chart fills in as transactions are recorded." />

  const W = 560, H = 230, L = 34, R = 8, T = 10, B = 30
  const step = Math.ceil(max / 4), yMax = step * 4
  const innerW = W - L - R, innerH = H - T - B
  const groupW = innerW / data.length
  const barW = Math.min(18, (groupW - 14) / 3)
  const y = (v: number) => T + innerH - (v / yMax) * innerH
  const summary = data.map((b) => `${b.label}: ${b.completed} completed, ${b.active} in progress, ${b.flagged} flagged`).join('. ')

  return (
    <div className="lg-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Transactions per month. ${summary}`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(i * step)} y2={y(i * step)} stroke="#e2e8f0" />
            <text x={L - 6} y={y(i * step) + 4} textAnchor="end" fontSize="10" fill="#64748b">{i * step}</text>
          </g>
        ))}
        {data.map((b, i) => {
          const x0 = L + i * groupW + (groupW - (3 * barW + 4)) / 2
          return (
            <g key={b.label}>
              {SERIES.map((s, j) => (
                <rect key={s.key} x={x0 + j * (barW + 2)} y={y(b[s.key])} width={barW} height={T + innerH - y(b[s.key])} rx="2" fill={s.color}>
                  <title>{`${b.label} · ${s.label}: ${b[s.key]}`}</title>
                </rect>
              ))}
              <text x={L + i * groupW + groupW / 2} y={H - 10} textAnchor="middle" fontSize="10.5" fill="#475569">{b.label}</text>
            </g>
          )
        })}
      </svg>
      <ul className="lg-legend">
        {SERIES.map((s) => <li key={s.key}><i style={{ background: s.color }} />{s.label}</li>)}
      </ul>
    </div>
  )
}
