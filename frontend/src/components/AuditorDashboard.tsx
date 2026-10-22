/**
 * Auditor dashboard: read-only monitoring of transactions, verification outcomes,
 * high-risk cases and the audit trail. No create/edit actions are offered here;
 * the backend enforces the same read-only permissions.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, ClipboardCheck, Clock, Flag, ScrollText } from 'lucide-react'
import { api, type AuditRecord, type CaseRecord, type DashboardStats, type TransactionRecord } from '../lib/api'
import RiskDonut from './RiskDonut'
import {
  EmptyState, ErrorNote, LoadingRows, PageHeader, Panel, RiskBadge, StatCard, StatusBadge,
  formatDate, formatDateTime, formatMoney, humanize,
} from './ui'

const STATUSES = ['PENDING', 'UNDER_REVIEW', 'FLAGGED', 'APPROVED', 'REJECTED', 'COMPLETED']
const RISKS = ['LOW', 'MEDIUM', 'HIGH']
const CASE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'RESOLVED', 'CLOSED']
const dayOf = (t: TransactionRecord) => (t.transaction_date ?? '').slice(0, 10)

export default function AuditorDashboard({
  stats, onNavigate,
}: { stats: DashboardStats; onNavigate: (page: string) => void }) {
  const [txs, setTxs] = useState<TransactionRecord[]>([])
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [audit, setAudit] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string[]>([])
  const [status, setStatus] = useState('ALL')
  const [risk, setRisk] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.allSettled([api.transactions(), api.cases(), api.audit()]).then(([t, c, a]) => {
      const problems: string[] = []
      if (t.status === 'fulfilled') setTxs(t.value); else problems.push('transactions')
      if (c.status === 'fulfilled') setCases(c.value); else problems.push('case reviews')
      if (a.status === 'fulfilled') setAudit(a.value); else problems.push('audit records')
      setFailed(problems)
      setLoading(false)
    })
  }, [])
  useEffect(() => { load() }, [load])

  const count = (...s: string[]) => txs.filter((t) => s.includes((t.status ?? '').toUpperCase())).length
  const reviewed = count('APPROVED', 'COMPLETED', 'REJECTED')
  const awaiting = count('PENDING', 'UNDER_REVIEW')
  const suspicious = useMemo(
    () => txs.filter((t) => t.latest_risk_level === 'HIGH' || (t.status ?? '').toUpperCase() === 'FLAGGED'),
    [txs],
  )

  const filtered = useMemo(() => {
    return txs
      .filter((t) => status === 'ALL' || (t.status ?? '').toUpperCase() === status)
      .filter((t) => risk === 'ALL' || (t.latest_risk_level ?? '').toUpperCase() === risk)
      .filter((t) => !from || dayOf(t) >= from)
      .filter((t) => !to || dayOf(t) <= to)
      .sort((a, b) => dayOf(b).localeCompare(dayOf(a)))
  }, [txs, status, risk, from, to])

  const riskTotal = stats.low_risk_transactions + stats.medium_risk_transactions + stats.high_risk_transactions
  const caseCounts = CASE_STATUSES.map((s) => ({ status: s, n: cases.filter((c) => c.status === s).length }))
  const caseMax = Math.max(1, ...caseCounts.map((c) => c.n))
  const filtersActive = status !== 'ALL' || risk !== 'ALL' || from !== '' || to !== ''

  return (
    <div className="lg-page">
      <PageHeader title="Auditor dashboard" subtitle="Overview of audits and system activities (read-only)" />

      {failed.length > 0 && <ErrorNote message={`Could not load ${failed.join(', ')}. Check that the backend is running.`} onRetry={load} />}

      <div className="lg-stats">
        <StatCard icon={ScrollText} tone="blue" label="Audit records" value={loading ? '–' : audit.length} hint="Entries in the audit trail" onClick={() => onNavigate('Audit Logs')} />
        <StatCard icon={CheckCircle} tone="green" label="Reviewed" value={loading ? '–' : reviewed} hint="Approved, completed or rejected" onClick={() => onNavigate('Transactions Overview')} />
        <StatCard icon={Clock} tone="amber" label="Awaiting review" value={loading ? '–' : awaiting} hint="Pending or under review" onClick={() => onNavigate('Transactions Overview')} />
        <StatCard icon={Flag} tone="red" label="High-risk or flagged" value={loading ? '–' : suspicious.length} hint="Cases needing attention" onClick={() => onNavigate('Transactions Overview')} />
      </div>

      <div className="lg-row lg-row--wide-left">
        <Panel title="Transaction and verification history" subtitle="Filter by status, risk level and date" action={<button type="button" className="lg-link" onClick={() => onNavigate('Transactions Overview')}>Full overview</button>}>
          <div className="lg-filters">
            <label>Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ALL">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
              </select>
            </label>
            <label>Risk level
              <select value={risk} onChange={(e) => setRisk(e.target.value)}>
                <option value="ALL">All risk levels</option>
                {RISKS.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
              </select>
            </label>
            <label>From<input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>To<input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          {loading ? <LoadingRows rows={5} /> : filtered.length === 0 ? (
            <EmptyState
              title={filtersActive ? 'No transactions match these filters' : 'No transactions recorded yet'}
              text={filtersActive ? 'Clear a filter to see more results.' : undefined}
            />
          ) : (
            <>
              <div className="lg-table-wrap">
                <table className="lg-table">
                  <thead><tr><th>Transaction</th><th>Parcel</th><th>Seller to buyer</th><th className="lg-num">Declared value</th><th>Status</th><th>Risk</th><th>Date</th></tr></thead>
                  <tbody>
                    {filtered.slice(0, 8).map((t) => (
                      <tr key={t.id}>
                        <td><strong>{t.transaction_code}</strong></td>
                        <td>{t.parcel_code ?? `Parcel #${t.parcel_id}`}</td>
                        <td>{t.seller_name ?? '—'} to {t.buyer_name ?? '—'}</td>
                        <td className="lg-num">{formatMoney(t.declared_value)}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td><RiskBadge level={t.latest_risk_level} /></td>
                        <td>{formatDate(t.transaction_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="lg-stat__hint" style={{ marginTop: 26 }}>Showing {Math.min(8, filtered.length)} of {filtered.length} transactions</p>
            </>
          )}
        </Panel>

        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <Panel title="Risk distribution" subtitle="Latest AI risk level per transaction">
            {riskTotal === 0
              ? <EmptyState title="No risk analyses yet" />
              : <RiskDonut low={stats.low_risk_transactions} medium={stats.medium_risk_transactions} high={stats.high_risk_transactions} total={riskTotal} />}
          </Panel>
          <Panel title="Case review status" subtitle="All case reviews by stage">
            {loading ? <LoadingRows rows={3} /> : cases.length === 0 ? <EmptyState title="No case reviews yet" /> : (
              <ul className="lg-bars">
                {caseCounts.map((c) => (
                  <li key={c.status}>
                    <span>{humanize(c.status)}</span>
                    <b aria-hidden="true"><i style={{ width: `${(c.n / caseMax) * 100}%` }} /></b>
                    <em>{c.n}</em>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="lg-row lg-row--even">
        <Panel title="Suspicious activity" subtitle="High-risk or flagged transactions" action={<button type="button" className="lg-link" onClick={() => onNavigate('Evidence Review')}>Review evidence</button>}>
          {loading ? <LoadingRows /> : suspicious.length === 0 ? (
            <EmptyState title="No suspicious transactions" text="High-risk and flagged transactions will appear here." />
          ) : (
            <ul className="lg-list">
              {suspicious.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <span className="lg-list__dot lg-tone--red"><Flag size={15} aria-hidden="true" /></span>
                  <span className="lg-list__main"><strong>{t.transaction_code}</strong> on {t.parcel_code ?? `parcel #${t.parcel_id}`}
                    <small>{humanize(t.status)}{t.latest_risk_score != null ? `, risk score ${t.latest_risk_score}` : ''}</small></span>
                  <RiskBadge level={t.latest_risk_level} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Audit records" subtitle="Most recent entries" action={<button type="button" className="lg-link" onClick={() => onNavigate('Audit Logs')}>All audit logs</button>}>
          {loading ? <LoadingRows /> : audit.length === 0 ? <EmptyState title="No audit records yet" /> : (
            <ul className="lg-list">
              {audit.slice(0, 6).map((log) => (
                <li key={log.id}>
                  <span className="lg-list__dot lg-tone--blue"><ClipboardCheck size={15} aria-hidden="true" /></span>
                  <span className="lg-list__main">{humanize(log.action)} on {log.entity} {log.entity_id ?? ''}<small>{log.user_name ?? 'System'}</small></span>
                  <time dateTime={log.created_at}>{formatDateTime(log.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <footer className="lg-note">
        <span>Auditor access is read-only. Actions are recorded in the audit trail.</span>
        <span>Decision support only. AI predictions do not replace official Rwandan land authorities.</span>
      </footer>
    </div>
  )
}
