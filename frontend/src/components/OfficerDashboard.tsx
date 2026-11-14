/**
 * Officer dashboard: verification workspace.
 *
 * Layout (top to bottom):
 *  1. KPI overview
 *  2. Needs attention (high-risk / flagged transactions + open case reviews) and quick actions
 *  3. Recent transactions and risk distribution
 *  4. Recent parcels (searchable, expandable details, "View all parcels")
 *  5. Compact verification activity
 *
 * Shows real API data only; empty states are shown instead of sample rows.
 * Component-specific styles are self-contained (`od-*`) and layered on top of the
 * existing shared `./ui` components and `lg-*` / `btn-*` classes.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowLeftRight, ChevronRight, CheckCircle, Clock, FileUp, MapPin, PlusCircle, RotateCcw, Search, ShieldCheck,
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

interface AttentionItem {
  key: string
  kind: 'transaction' | 'case'
  id: number
  tone: Tone
  title: string
  context: string
  detail: string
  transaction?: TransactionRecord
  caseRecord?: CaseRecord
}

interface QuickAction {
  icon: LucideIcon
  tone: Tone
  title: string
  text: string
  run: () => void
}

const OPEN_CASE = ['OPEN', 'UNDER_REVIEW', 'NEEDS_INFORMATION']
const ATTENTION_LIMIT = 6
const RECENT_TX_LIMIT = 6
const PARCEL_PAGE_STEP = 5
const PARCEL_FETCH_SIZE = 100

const STYLES = `
.od-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.od-row{display:grid;gap:16px;grid-template-columns:minmax(0,1fr);align-items:start}
@media (min-width:1024px){
  .od-row--wide-left{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}
}
.od-panel-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}

/* Clickable list items (needs attention) */
.od-items{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.od-items>li+li{border-top:1px solid rgba(100,116,139,.18)}
.od-item{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:12px 8px;border-radius:8px;cursor:pointer}
.od-item:hover{background:rgba(100,116,139,.08)}
.od-item:focus-visible,.od-link-btn:focus-visible,.od-qa:focus-visible,.od-clickable:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.od-item__icon{flex:none;display:grid;place-items:center;width:32px;height:32px;border-radius:8px}
.od-item__main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.od-item__title{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.od-item__sub{font-size:.8125rem;opacity:.72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.od-item__end{flex:none;display:flex;align-items:center;gap:8px}
.od-more{margin:8px 8px 0;font-size:.8125rem;opacity:.8}

/* Quick actions */
.od-qas{display:grid;gap:8px;grid-template-columns:minmax(0,1fr)}
@media (min-width:560px) and (max-width:1023px){.od-qas{grid-template-columns:repeat(3,minmax(0,1fr))}}
.od-qa{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid rgba(100,116,139,.25);border-radius:8px;cursor:pointer;width:100%}
.od-qa:hover{background:rgba(100,116,139,.08)}
.od-qa__text{display:flex;flex-direction:column;gap:2px;min-width:0}
.od-qa__text strong{font-weight:600}
.od-qa__text span{font-size:.8125rem;opacity:.72}

/* Tables */
.od-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.od-table-wrap .lg-table{min-width:560px}
.od-clickable{cursor:pointer}
.od-clickable:hover{background:rgba(100,116,139,.07)}
.od-link-btn{all:unset;box-sizing:border-box;font-weight:600;cursor:pointer;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px;border-radius:4px}
.od-link-btn:hover{text-decoration-color:currentColor}
.od-nowrap{white-space:nowrap}
@media (max-width:767px){.od-hide-md{display:none}}
@media (max-width:559px){.od-hide-sm{display:none}}

/* Parcel filters */
.od-filters{display:grid;gap:8px;grid-template-columns:minmax(0,1fr);margin-bottom:12px}
@media (min-width:640px){.od-filters{grid-template-columns:minmax(0,1fr) 220px}}
.od-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.od-field input,.od-field select{width:100%;box-sizing:border-box}
.od-meta{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-top:12px;font-size:.8125rem}
.od-meta p{margin:0;opacity:.75}

/* Parcel detail grid */
.od-detail{display:grid;gap:12px 16px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin:0;padding:4px 0}
.od-detail div{display:flex;flex-direction:column;gap:2px;min-width:0}
.od-detail dt{font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;opacity:.65}
.od-detail dd{margin:0;font-weight:600;overflow-wrap:anywhere}

/* Activity timeline */
.od-activity{list-style:none;margin:0;padding:0;display:grid;gap:0;grid-template-columns:minmax(0,1fr)}
@media (min-width:900px){.od-activity{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px}}
.od-activity li{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(100,116,139,.18)}
.od-activity__main{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.od-activity time{flex:none;font-size:.8125rem;opacity:.7}
@media (max-width:559px){.od-activity time{display:none}}
`

function riskScoreOf(t: TransactionRecord): number {
  return Number(t.latest_risk_score ?? 0)
}

export default function OfficerDashboard({ stats, onNavigate, onSelectTransaction, onSelectCase, onNewTransaction }: OfficerDashboardProps) {
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
  const [expandedParcelId, setExpandedParcelId] = useState<number | null>(null)
  const [parcelLimit, setParcelLimit] = useState(PARCEL_PAGE_STEP)

  // Prevents state updates after the component has unmounted (e.g. user navigates away mid-load).
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    Promise.allSettled([api.transactions(), api.cases()]).then(([t, c]) => {
      if (!mounted.current) return
      const problems: string[] = []
      if (t.status === 'fulfilled') setTxs(t.value); else problems.push('transactions')
      if (c.status === 'fulfilled') setCases(c.value); else problems.push('pending reviews')
      setFailed(problems)
      setLoading(false)
    })
  }, [])

  const loadParcels = useCallback(() => {
    setParcelsLoading(true)
    api.parcels({ page: 1, page_size: PARCEL_FETCH_SIZE })
      .then((result) => {
        if (!mounted.current) return
        setParcels(Array.isArray(result) ? result : result.items)
        setParcelsFailed(false)
      })
      .catch(() => { if (mounted.current) setParcelsFailed(true) })
      .finally(() => { if (mounted.current) setParcelsLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadParcels() }, [loadParcels])

  /* ---------- Derived data ---------- */

  const recent = useMemo(
    () => [...txs].sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? '')).slice(0, RECENT_TX_LIMIT),
    [txs],
  )

  const warningsAll = useMemo(
    () => txs
      .filter((t) => t.latest_risk_level === 'HIGH' || (t.status ?? '').toUpperCase() === 'FLAGGED')
      .sort((a, b) => riskScoreOf(b) - riskScoreOf(a)),
    [txs],
  )
  const openCasesAll = useMemo(() => cases.filter((c) => OPEN_CASE.includes(c.status)), [cases])

  // High-risk / flagged transactions first (highest score first), then open case reviews.
  const attentionAll = useMemo<AttentionItem[]>(() => {
    const txItems: AttentionItem[] = warningsAll.map((t) => ({
      key: `tx-${t.id}`,
      kind: 'transaction',
      id: t.id,
      tone: 'red',
      title: t.transaction_code,
      context: `Transaction on ${t.parcel_code ?? `parcel #${t.parcel_id}`}`,
      detail: `${humanize(t.status)}${t.latest_risk_score != null ? `, risk score ${t.latest_risk_score}` : ''}`,
      transaction: t,
    }))
    const caseItems: AttentionItem[] = openCasesAll.map((c) => ({
      key: `case-${c.id}`,
      kind: 'case',
      id: c.id,
      tone: 'amber',
      title: c.case_code,
      context: `Case review${c.parcel_code ? ` on ${c.parcel_code}` : ''}`,
      detail: `Updated ${formatDateTime(c.updated_at)}`,
      caseRecord: c,
    }))
    return [...txItems, ...caseItems]
  }, [warningsAll, openCasesAll])

  const attention = attentionAll.slice(0, ATTENTION_LIMIT)
  const attentionHidden = attentionAll.length - attention.length

  const completed = txs.filter((t) => (t.status ?? '').toUpperCase() === 'COMPLETED').length
  const riskTotal = stats.low_risk_transactions + stats.medium_risk_transactions + stats.high_risk_transactions

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    parcels.forEach((p) => { const s = (p.status ?? '').toUpperCase(); if (s) values.add(s) })
    return ['ALL', ...Array.from(values)]
  }, [parcels])

  // Newest registered parcels first, then filter by status and by a single search box
  // (matches parcel code, UPI, location, district and owner).
  const filteredParcels = useMemo(() => {
    const q = parcelQuery.trim().toLowerCase()
    return [...parcels]
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
      .filter((p) => {
        if (statusFilter !== 'ALL' && (p.status ?? '').toUpperCase() !== statusFilter) return false
        if (!q) return true
        const owner = (p.current_owner_name ?? '').toLowerCase()
        return [p.parcel_code, p.upi ?? '', p.location, p.district, owner].some((v) => v.toLowerCase().includes(q))
      })
  }, [parcels, parcelQuery, statusFilter])

  const visibleParcels = filteredParcels.slice(0, parcelLimit)
  const remainingParcels = filteredParcels.length - visibleParcels.length

  /* ---------- Navigation helpers (existing callbacks, with safe fallbacks) ---------- */

  const startTransaction = () => (onNewTransaction ? onNewTransaction() : onNavigate('Transactions'))
  const openTransaction = (id: number) => (onSelectTransaction ? onSelectTransaction(id) : onNavigate('Transactions'))
  const openCase = (id: number) => (onSelectCase ? onSelectCase(id) : onNavigate('Pending Reviews'))
  const openAttention = (item: AttentionItem) => (item.kind === 'transaction' ? openTransaction(item.id) : openCase(item.id))

  const actions: QuickAction[] = [
    { icon: MapPin, tone: 'amber', title: 'Add parcel', text: 'Register a new parcel', run: () => setShowAddParcel(true) },
    { icon: FileUp, tone: 'blue', title: 'Upload payment proof', text: 'Attach evidence to a transaction', run: () => onNavigate('Evidence') },
    { icon: ShieldCheck, tone: 'green', title: 'Run verification', text: 'Check ownership and rules', run: () => onNavigate('Verification') },
  ]

  const recentActivity = stats.recent_verification_activity.slice(0, 6)

  return (
    <div className="lg-page">
      <style>{STYLES}</style>

      <PageHeader
        title="Officer dashboard"
        subtitle="Manage land transactions and verifications"
        actions={
          <>
            <button type="button" className="btn-secondary btn-sm" onClick={() => onNavigate('Search Parcel')}>
              <Search size={15} aria-hidden="true" /> Search parcel
            </button>
            <button type="button" className="btn-primary btn-sm" onClick={startTransaction}>
              <PlusCircle size={15} aria-hidden="true" /> New transaction
            </button>
          </>
        }
      />

      {failed.length > 0 && (
        <ErrorNote message={`Could not load ${failed.join(' and ')}. Check that the backend is running.`} onRetry={load} />
      )}

      {/* 1. KPI overview */}
      <div className="lg-stats">
        <StatCard icon={ArrowLeftRight} tone="blue" label="Transactions" value={stats.total_transactions} hint="All recorded transactions" onClick={() => onNavigate('Transactions')} />
        <StatCard icon={Clock} tone="amber" label="Pending reviews" value={stats.transactions_under_review} hint="Open case reviews" onClick={() => onNavigate('Pending Reviews')} />
        <StatCard icon={AlertTriangle} tone="red" label="High-risk alerts" value={stats.high_risk_transactions} hint="Transactions at high risk" onClick={() => onNavigate('Pending Reviews')} />
        <StatCard icon={CheckCircle} tone="green" label="Completed" value={loading ? '–' : completed} hint="Finished transactions" onClick={() => onNavigate('Transactions')} />
      </div>

      {/* 2. Needs attention + quick actions */}
      <div className="od-row od-row--wide-left">
        <Panel
          title="Needs attention"
          subtitle={
            loading
              ? 'Checking high-risk transactions and open reviews'
              : attentionAll.length === 0
                ? 'High-risk and flagged transactions, and open case reviews'
                : `${attentionAll.length} item${attentionAll.length === 1 ? '' : 's'} need your action, highest risk first`
          }
          action={
            <div className="od-panel-actions">
              <button type="button" className="lg-link" onClick={() => onNavigate('Verification')}>Verification</button>
              <button type="button" className="lg-link" onClick={() => onNavigate('Pending Reviews')}>All reviews</button>
            </div>
          }
        >
          {loading ? <LoadingRows rows={4} /> : attention.length === 0 ? (
            <EmptyState title="Nothing needs attention" text="High-risk or flagged transactions and open case reviews will appear here." />
          ) : (
            <>
              <ul className="od-items">
                {attention.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      className="od-item"
                      onClick={() => openAttention(item)}
                      aria-label={`${item.kind === 'transaction' ? 'Open transaction' : 'Open case'} ${item.title}. ${item.context}. ${item.detail}`}
                    >
                      <span className={`od-item__icon lg-tone--${item.tone}`}>
                        {item.kind === 'transaction' ? <AlertTriangle size={16} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}
                      </span>
                      <span className="od-item__main">
                        <span className="od-item__title">{item.title}</span>
                        <span className="od-item__sub">{item.context} · {item.detail}</span>
                      </span>
                      <span className="od-item__end">
                        {item.transaction && <RiskBadge level={item.transaction.latest_risk_level} />}
                        {item.caseRecord && <StatusBadge status={item.caseRecord.status} />}
                        <ChevronRight size={16} aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {attentionHidden > 0 && (
                <p className="od-more">
                  +{attentionHidden} more.{' '}
                  <button type="button" className="lg-link" onClick={() => onNavigate('Pending Reviews')}>View all reviews</button>
                </p>
              )}
            </>
          )}
        </Panel>

        <Panel title="Quick actions" subtitle="Jump straight into your daily work">
          <div className="od-qas">
            {actions.map((a) => (
              <button type="button" key={a.title} className="od-qa" onClick={a.run}>
                <span className={`lg-stat__icon lg-tone--${a.tone}`}><a.icon size={17} aria-hidden="true" /></span>
                <span className="od-qa__text"><strong>{a.title}</strong><span>{a.text}</span></span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {/* 3. Recent transactions + risk distribution */}
      <div className="od-row od-row--wide-left">
        <Panel
          title="Recent transactions"
          subtitle="Latest transfers and their verification status"
          action={<button type="button" className="lg-link" onClick={() => onNavigate('Transactions')}>All transactions</button>}
        >
          {loading ? <LoadingRows rows={5} /> : recent.length === 0 ? (
            <EmptyState title="No transactions yet" text="Use New transaction to record the first land transfer." />
          ) : (
            <div className="od-table-wrap">
              <table className="lg-table">
                <caption className="od-sr-only">Most recent land transactions</caption>
                <thead>
                  <tr>
                    <th scope="col">Transaction</th>
                    <th scope="col">Parcel</th>
                    <th scope="col" className="od-hide-md">Seller to buyer</th>
                    <th scope="col" className="lg-num">Declared value</th>
                    <th scope="col">Status</th>
                    <th scope="col">Risk</th>
                    <th scope="col" className="od-hide-sm">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t.id} className="od-clickable" onClick={() => openTransaction(t.id)}>
                      <td>
                        <button
                          type="button"
                          className="od-link-btn"
                          onClick={(e) => { e.stopPropagation(); openTransaction(t.id) }}
                          aria-label={`Open transaction ${t.transaction_code}`}
                        >
                          {t.transaction_code}
                        </button>
                      </td>
                      <td>{t.parcel_code ?? `Parcel #${t.parcel_id}`}</td>
                      <td className="od-hide-md">{t.seller_name ?? '—'} to {t.buyer_name ?? '—'}</td>
                      <td className="lg-num od-nowrap">{formatMoney(t.declared_value)}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><RiskBadge level={t.latest_risk_level} /></td>
                      <td className="od-hide-sm od-nowrap">{formatDate(t.transaction_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Risk distribution" subtitle="Latest AI risk level per transaction">
          {riskTotal === 0
            ? <EmptyState title="No risk analyses yet" text="Run a verification to generate risk levels." />
            : <RiskDonut low={stats.low_risk_transactions} medium={stats.medium_risk_transactions} high={stats.high_risk_transactions} total={riskTotal} />}
        </Panel>
      </div>

      {/* 4. Recent parcels */}
      <Panel
        title="Recent parcels"
        subtitle="Newest registered parcels from the active database"
        action={
          <div className="od-panel-actions">
            <button type="button" className="btn-secondary btn-sm" onClick={loadParcels}>
              <RotateCcw size={14} aria-hidden="true" /> Refresh
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => onNavigate('Search Parcel')}>
              View all parcels <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        }
      >
        <div className="od-filters" role="search" aria-label="Filter parcels">
          <div className="od-field">
            <label className="od-sr-only" htmlFor="od-parcel-search">Search parcels by code, UPI, location or owner</label>
            <input
              id="od-parcel-search"
              type="search"
              className="filter-input"
              placeholder="Search by parcel code, UPI, location or owner..."
              value={parcelQuery}
              onChange={(e) => { setParcelQuery(e.target.value); setParcelLimit(PARCEL_PAGE_STEP) }}
            />
          </div>
          <div className="od-field">
            <label className="od-sr-only" htmlFor="od-parcel-status">Filter parcels by status</label>
            <select
              id="od-parcel-status"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setParcelLimit(PARCEL_PAGE_STEP) }}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'Status: All' : humanize(s)}</option>
              ))}
            </select>
          </div>
        </div>

        {parcelsFailed ? (
          <ErrorNote message="Could not load parcels. Check that the backend is running and the database is reachable." onRetry={loadParcels} />
        ) : parcelsLoading ? (
          <LoadingRows rows={5} />
        ) : filteredParcels.length === 0 ? (
          <EmptyState title="No parcels found" text="Register a parcel or adjust the search and filter." />
        ) : (
          <>
            <div className="od-table-wrap">
              <table className="lg-table">
                <caption className="od-sr-only">Recently registered parcels</caption>
                <thead>
                  <tr>
                    <th scope="col">Parcel code</th>
                    <th scope="col" className="od-hide-md">UPI</th>
                    <th scope="col">Location</th>
                    <th scope="col" className="lg-num od-hide-sm">Size (ha)</th>
                    <th scope="col" className="od-hide-md">Owner</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="od-hide-sm">Registered</th>
                    <th scope="col"><span className="od-sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleParcels.map((p) => {
                    const expanded = expandedParcelId === p.id
                    const detailId = `od-parcel-detail-${p.id}`
                    return (
                      <Fragment key={p.id}>
                        <tr>
                          <td><strong>{p.parcel_code}</strong></td>
                          <td className="od-hide-md">{p.upi ?? '—'}</td>
                          <td>{p.location}</td>
                          <td className="lg-num od-hide-sm">{Number(p.area_ha ?? 0)}</td>
                          <td className="od-hide-md">{p.current_owner_name ?? '—'}</td>
                          <td><StatusBadge status={p.status} /></td>
                          <td className="od-hide-sm od-nowrap">{formatDateTime(p.created_at)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              aria-expanded={expanded}
                              aria-controls={detailId}
                              aria-label={`${expanded ? 'Hide' : 'Show'} details for parcel ${p.parcel_code}`}
                              onClick={() => setExpandedParcelId(expanded ? null : p.id)}
                            >
                              {expanded ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={8}>
                              <dl className="od-detail" id={detailId}>
                                <div><dt>UPI</dt><dd>{p.upi ?? '—'}</dd></div>
                                <div><dt>Owner</dt><dd>{p.current_owner_name ?? '—'}</dd></div>
                                <div><dt>Province</dt><dd>{p.province}</dd></div>
                                <div><dt>District</dt><dd>{p.district}</dd></div>
                                <div><dt>Sector</dt><dd>{p.sector}</dd></div>
                                <div><dt>Cell</dt><dd>{p.cell}</dd></div>
                                <div><dt>Village</dt><dd>{p.village}</dd></div>
                                <div><dt>Coordinates</dt><dd>{p.latitude != null && p.longitude != null ? `${p.latitude}, ${p.longitude}` : '—'}</dd></div>
                                <div><dt>Verification</dt><dd>{humanize(p.location_verification_status)}</dd></div>
                              </dl>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="od-meta">
              <p aria-live="polite">
                Showing {visibleParcels.length} of {filteredParcels.length} parcel{filteredParcels.length === 1 ? '' : 's'}
                {parcels.length >= PARCEL_FETCH_SIZE ? `. Only the first ${PARCEL_FETCH_SIZE} parcels are loaded here; use Search Parcel for the full registry.` : ''}
              </p>
              {remainingParcels > 0 && (
                <button type="button" className="btn-secondary btn-sm" onClick={() => setParcelLimit((n) => n + PARCEL_PAGE_STEP)}>
                  Show {Math.min(PARCEL_PAGE_STEP, remainingParcels)} more
                </button>
              )}
            </div>
          </>
        )}
      </Panel>

      {/* 5. Compact verification activity */}
      <Panel title="Recent verification activity" subtitle="Latest actions in the system">
        {recentActivity.length === 0 ? <EmptyState title="No activity recorded yet" /> : (
          <ul className="od-activity">
            {recentActivity.map((a, i) => (
              <li key={`${a.created_at}-${i}`}>
                <span className="lg-list__dot lg-tone--blue"><Activity size={15} aria-hidden="true" /></span>
                <span className="od-activity__main">{humanize(a.action)} on {a.entity} {a.entity_id ?? ''}</span>
                <time dateTime={a.created_at}>{formatDateTime(a.created_at)}</time>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <footer className="lg-note">
        <span>Decision support only. AI predictions do not replace official Rwandan land authorities.</span>
      </footer>

      {showAddParcel && <AddParcelModal onClose={() => setShowAddParcel(false)} onCreated={loadParcels} />}
    </div>
  )
}