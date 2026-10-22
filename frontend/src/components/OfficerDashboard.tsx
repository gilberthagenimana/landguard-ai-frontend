/**
 * Officer dashboard: verification workspace with workload summary, recent transactions,
 * fraud-risk warnings, pending case reviews and shortcuts to the existing officer pages.
 * Shows real API data only; empty states are shown instead of sample rows.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowLeftRight, CheckCircle, Clock, FileUp, MapPin, PlusCircle, Search, ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api, type CaseRecord, type CurrentUser, type DashboardStats, type TransactionRecord } from '../lib/api'
import RiskDonut from './RiskDonut'
import AddParcelModal from './AddParcelModal'
import {
  EmptyState, ErrorNote, LoadingRows, PageHeader, Panel, RiskBadge, StatCard, StatusBadge,
  formatDate, formatDateTime, formatMoney, humanize,
} from './ui'
import type { Tone } from './ui'

interface OfficerDashboardProps {
  stats: DashboardStats
  currentUser?: CurrentUser | null
  onNavigate: (page: string) => void
  onSelectTransaction?: (id: number) => void
  onSelectCase?: (id: number) => void
  onNewTransaction?: () => void
}

const OPEN_CASE = ['OPEN', 'UNDER_REVIEW', 'NEEDS_INFORMATION']

export default function OfficerDashboard({ stats, onNavigate, onNewTransaction }: OfficerDashboardProps) {
  const [txs, setTxs] = useState<TransactionRecord[]>([])
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string[]>([])
  const [showAddParcel, setShowAddParcel] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.allSettled([api.transactions(), api.cases()]).then(([t, c]) => {
      const problems: string[] = []
      if (t.status === 'fulfilled') setTxs(t.value); else problems.push('transactions')
      if (c.status === 'fulfilled') setCases(c.value); else problems.push('pending reviews')
      setFailed(problems)
      setLoading(false)
    })
  }, [])
  useEffect(() => { load() }, [load])

  const recent = useMemo(
    () => [...txs].sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? '')).slice(0, 6),
    [txs],
  )
  const warnings = useMemo(
    () => txs.filter((t) => t.latest_risk_level === 'HIGH' || (t.status ?? '').toUpperCase() === 'FLAGGED').slice(0, 4),
    [txs],
  )
  const openCases = cases.filter((c) => OPEN_CASE.includes(c.status)).slice(0, 4)
  const completed = txs.filter((t) => (t.status ?? '').toUpperCase() === 'COMPLETED').length
  const riskTotal = stats.low_risk_transactions + stats.medium_risk_transactions + stats.high_risk_transactions

  const actions: { icon: LucideIcon; tone: Tone; title: string; text: string; run: () => void }[] = [
    { icon: Search, tone: 'blue', title: 'Search parcel', text: 'Find a parcel by UPI', run: () => onNavigate('Search Parcel') },
    { icon: PlusCircle, tone: 'green', title: 'New transaction', text: 'Record a land transfer', run: () => (onNewTransaction ? onNewTransaction() : onNavigate('Transactions')) },
    { icon: MapPin, tone: 'amber', title: 'Add parcel', text: 'Register a new parcel', run: () => setShowAddParcel(true) },
    { icon: FileUp, tone: 'blue', title: 'Upload payment proof', text: 'Attach evidence to a transaction', run: () => onNavigate('Evidence') },
    { icon: ShieldCheck, tone: 'green', title: 'Run verification', text: 'Check ownership and rules', run: () => onNavigate('Verification') },
    { icon: Clock, tone: 'red', title: 'Pending reviews', text: 'Cases that need action', run: () => onNavigate('Pending Reviews') },
  ]

  return (
    <div className="lg-page">
      <PageHeader
        title="Officer dashboard"
        subtitle="Manage land transactions and verifications"
        actions={
          <>
            <button type="button" className="btn-secondary btn-sm" onClick={() => onNavigate('Search Parcel')}><Search size={15} /> Search parcel</button>
            <button type="button" className="btn-primary btn-sm" onClick={() => (onNewTransaction ? onNewTransaction() : onNavigate('Transactions'))}><PlusCircle size={15} /> New transaction</button>
          </>
        }
      />

      {failed.length > 0 && <ErrorNote message={`Could not load ${failed.join(' and ')}. Check that the backend is running.`} onRetry={load} />}

      <div className="lg-stats">
        <StatCard icon={ArrowLeftRight} tone="blue" label="Transactions" value={stats.total_transactions} hint="All recorded transactions" onClick={() => onNavigate('Transactions')} />
        <StatCard icon={Clock} tone="amber" label="Pending reviews" value={stats.transactions_under_review} hint="Open case reviews" onClick={() => onNavigate('Pending Reviews')} />
        <StatCard icon={AlertTriangle} tone="red" label="High-risk alerts" value={stats.high_risk_transactions} hint="Transactions at high risk" onClick={() => onNavigate('Pending Reviews')} />
        <StatCard icon={CheckCircle} tone="green" label="Completed" value={loading ? '–' : completed} hint="Finished transactions" onClick={() => onNavigate('Transactions')} />
      </div>

      <div className="lg-row lg-row--wide-left">
        <Panel title="Recent transactions" subtitle="Latest transfers and their verification status" action={<button type="button" className="lg-link" onClick={() => onNavigate('Transactions')}>All transactions</button>}>
          {loading ? <LoadingRows rows={5} /> : recent.length === 0 ? (
            <EmptyState title="No transactions yet" text="Use New transaction to record the first land transfer." />
          ) : (
            <div className="lg-table-wrap">
              <table className="lg-table">
                <thead><tr><th>Transaction</th><th>Parcel</th><th>Seller to buyer</th><th className="lg-num">Declared value</th><th>Status</th><th>Risk</th><th>Date</th></tr></thead>
                <tbody>
                  {recent.map((t) => (
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
          )}
        </Panel>

        <Panel title="Quick actions" subtitle="Jump straight into your daily work">
          <div className="lg-actions">
            {actions.map((a) => (
              <button type="button" key={a.title} className="lg-action" onClick={a.run}>
                <span className={`lg-stat__icon lg-tone--${a.tone}`}><a.icon size={17} aria-hidden="true" /></span>
                <span><strong>{a.title}</strong><span>{a.text}</span></span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="lg-row lg-row--even">
        <Panel title="Fraud-risk warnings" subtitle="High-risk or flagged transactions" action={<button type="button" className="lg-link" onClick={() => onNavigate('Verification')}>Verify</button>}>
          {loading ? <LoadingRows /> : warnings.length === 0 ? (
            <EmptyState title="No warnings right now" text="High-risk and flagged transactions will appear here." />
          ) : (
            <ul className="lg-list">
              {warnings.map((t) => (
                <li key={t.id}>
                  <span className="lg-list__dot lg-tone--red"><AlertTriangle size={15} aria-hidden="true" /></span>
                  <span className="lg-list__main"><strong>{t.transaction_code}</strong> on {t.parcel_code ?? `parcel #${t.parcel_id}`}
                    <small>{humanize(t.status)}{t.latest_risk_score != null ? `, risk score ${t.latest_risk_score}` : ''}</small></span>
                  <RiskBadge level={t.latest_risk_level} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Pending reviews" subtitle="Open case reviews" action={<button type="button" className="lg-link" onClick={() => onNavigate('Pending Reviews')}>All reviews</button>}>
          {loading ? <LoadingRows /> : openCases.length === 0 ? (
            <EmptyState title="No open reviews" text="You are all caught up." />
          ) : (
            <ul className="lg-list">
              {openCases.map((c) => (
                <li key={c.id}>
                  <span className="lg-list__dot lg-tone--amber"><Clock size={15} aria-hidden="true" /></span>
                  <span className="lg-list__main"><strong>{c.case_code}</strong>{c.parcel_code ? ` on ${c.parcel_code}` : ''}<small>Updated {formatDateTime(c.updated_at)}</small></span>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="lg-row lg-row--even">
        <Panel title="Recent verification activity" subtitle="Latest actions in the system">
          {stats.recent_verification_activity.length === 0 ? <EmptyState title="No activity recorded yet" /> : (
            <ul className="lg-list">
              {stats.recent_verification_activity.slice(0, 6).map((a, i) => (
                <li key={`${a.created_at}-${i}`}>
                  <span className="lg-list__dot lg-tone--blue"><Activity size={15} aria-hidden="true" /></span>
                  <span className="lg-list__main">{humanize(a.action)} on {a.entity} {a.entity_id ?? ''}</span>
                  <time dateTime={a.created_at}>{formatDateTime(a.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="AI risk analysis" subtitle="Latest risk level per transaction">
          {riskTotal === 0
            ? <EmptyState title="No risk analyses yet" text="Run a verification to generate risk levels." />
            : <RiskDonut low={stats.low_risk_transactions} medium={stats.medium_risk_transactions} high={stats.high_risk_transactions} total={riskTotal} />}
        </Panel>
      </div>

      <footer className="lg-note">
        <span>Decision support only. AI predictions do not replace official Rwandan land authorities.</span>
      </footer>

      {showAddParcel && <AddParcelModal onClose={() => setShowAddParcel(false)} onCreated={load} />}
    </div>
  )
}
