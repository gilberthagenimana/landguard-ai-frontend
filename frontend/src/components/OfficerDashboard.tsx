/**
 * Officer dashboard: verification workspace with workload summary, recent transactions,
 * fraud-risk warnings, pending case reviews and shortcuts to the existing officer pages.
 * Shows real API data only; empty states are shown instead of sample rows.
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowLeftRight, CheckCircle, Clock, FileUp, MapPin, PlusCircle, RotateCcw, Search, ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api, type CaseRecord, type CurrentUser, type DashboardStats, type ParcelRecord, type TransactionRecord } from '../lib/api'
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

const PARCEL_PAGE_SIZE = 10

export default function OfficerDashboard({ stats, onNavigate, onNewTransaction }: OfficerDashboardProps) {
  const [txs, setTxs] = useState<TransactionRecord[]>([])
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string[]>([])
  const [showAddParcel, setShowAddParcel] = useState(false)
  const [parcels, setParcels] = useState<ParcelRecord[]>([])
  const [parcelsLoading, setParcelsLoading] = useState(true)
  const [parcelsFailed, setParcelsFailed] = useState(false)
  const [parcelQuery, setParcelQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [locationFilter, setLocationFilter] = useState('')
  const [expandedParcelId, setExpandedParcelId] = useState<number | null>(null)
  const [parcelPage, setParcelPage] = useState(1)

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

  const loadParcels = useCallback(() => {
    setParcelsLoading(true)
    api.parcels({ page: 1, page_size: 100 })
      .then((result) => { setParcels(Array.isArray(result) ? result : result.items); setParcelsFailed(false) })
      .catch(() => setParcelsFailed(true))
      .finally(() => setParcelsLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadParcels() }, [loadParcels])

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

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    parcels.forEach((p) => { const s = (p.status ?? '').toUpperCase(); if (s) values.add(s) })
    return ['ALL', ...Array.from(values)]
  }, [parcels])

  const filteredParcels = useMemo(() => {
    const q = parcelQuery.trim().toLowerCase()
    const location = locationFilter.trim().toLowerCase()
    return parcels.filter((p) => {
      if (statusFilter !== 'ALL' && (p.status ?? '').toUpperCase() !== statusFilter) return false
      if (location && !(p.location ?? '').toLowerCase().includes(location)) return false
      if (!q) return true
      const owner = (p.current_owner_name ?? '').toLowerCase()
      return [p.parcel_code, p.upi ?? '', p.location, p.district, owner].some((v) => v.toLowerCase().includes(q))
    })
  }, [parcels, parcelQuery, statusFilter, locationFilter])

  const parcelTotalPages = Math.max(1, Math.ceil(filteredParcels.length / PARCEL_PAGE_SIZE))
  const safeParcelPage = Math.min(parcelPage, parcelTotalPages)
  const paginatedParcels = filteredParcels.slice((safeParcelPage - 1) * PARCEL_PAGE_SIZE, safeParcelPage * PARCEL_PAGE_SIZE)

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

      <Panel
        title="Parcels"
        subtitle="Registered land parcels from the active database"
        action={<button type="button" className="btn-secondary btn-sm" onClick={loadParcels}><RotateCcw size={14} /> Refresh</button>}
      >
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            className="filter-input"
            placeholder="Search by parcel code, UPI or owner..."
            value={parcelQuery}
            onChange={(e) => { setParcelQuery(e.target.value); setParcelPage(1) }}
            style={{ flex: 1, minWidth: '180px' }}
          />
          <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setParcelPage(1) }}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'Status: All' : humanize(s)}</option>
            ))}
          </select>
          <input
            type="text"
            className="filter-input"
            placeholder="Filter by location..."
            value={locationFilter}
            onChange={(e) => { setLocationFilter(e.target.value); setParcelPage(1) }}
            style={{ flex: 1, minWidth: '180px' }}
          />
        </div>

        {parcelsFailed ? (
          <ErrorNote message="Could not load parcels. Check that the backend is running and the database is reachable." onRetry={loadParcels} />
        ) : parcelsLoading ? (
          <LoadingRows rows={6} />
        ) : filteredParcels.length === 0 ? (
          <EmptyState title="No parcels found" text="Register a parcel or adjust the search and filters." />
        ) : (
          <div className="lg-table-wrap">
            <table className="lg-table">
              <thead>
                <tr>
                  <th>Parcel code</th>
                  <th>UPI</th>
                  <th>Location</th>
                  <th className="lg-num">Size (ha)</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedParcels.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td><strong>{p.parcel_code}</strong></td>
                      <td>{p.upi ?? '—'}</td>
                      <td>{p.location}</td>
                      <td className="lg-num">{Number(p.area_ha ?? 0)}</td>
                      <td>{p.current_owner_name ?? '—'}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td>{formatDateTime(p.created_at)}</td>
                      <td><button type="button" className="btn-secondary btn-sm" onClick={() => setExpandedParcelId(expandedParcelId === p.id ? null : p.id)}>Details</button></td>
                    </tr>
                    {expandedParcelId === p.id && (
                      <tr>
                        <td colSpan={8}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                            <div><span>Province</span><strong>{p.province}</strong></div>
                            <div><span>District</span><strong>{p.district}</strong></div>
                            <div><span>Sector</span><strong>{p.sector}</strong></div>
                            <div><span>Cell</span><strong>{p.cell}</strong></div>
                            <div><span>Village</span><strong>{p.village}</strong></div>
                            <div><span>Coordinates</span><strong>{p.latitude != null && p.longitude != null ? `${p.latitude}, ${p.longitude}` : '—'}</strong></div>
                            <div><span>Verification</span><strong>{humanize(p.location_verification_status)}</strong></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredParcels.length > PARCEL_PAGE_SIZE && (
          <div className="pagination" style={{ marginTop: '12px' }}>
            <button type="button" className="page-btn" disabled={safeParcelPage <= 1} onClick={() => setParcelPage((p) => Math.max(1, p - 1))}>&lt;</button>
            <button type="button" className="page-btn page-btn--active">{safeParcelPage}</button>
            <button type="button" className="page-btn" disabled={safeParcelPage >= parcelTotalPages} onClick={() => setParcelPage((p) => Math.min(parcelTotalPages, p + 1))}>&gt;</button>
          </div>
        )}
      </Panel>

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

      {showAddParcel && <AddParcelModal onClose={() => setShowAddParcel(false)} onCreated={loadParcels} />}
    </div>
  )
}
