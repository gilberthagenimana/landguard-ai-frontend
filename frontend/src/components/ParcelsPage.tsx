import { useCallback, useEffect, useState } from 'react'
import { Eye, RefreshCw, Search, X } from 'lucide-react'
import {
  api,
  type AuditRecord,
  type EvidenceOut,
  type OwnershipRecord,
  type ParcelPage as ParcelPageResult,
  type ParcelRecord,
  type TransactionRecord,
  type VerificationResult,
} from '../lib/api'
import AddParcelModal from './AddParcelModal'
import {
  EmptyState, ErrorNote, LoadingRows, PageHeader, Panel, RiskBadge, StatusBadge,
  formatDateTime, formatMoney, humanize,
} from './ui'

const PAGE_SIZE = 10

type ParcelsPageProps = { canCreate: boolean }
type ParcelDetails = {
  parcel: ParcelRecord
  ownership: OwnershipRecord[]
  transactions: TransactionRecord[]
  evidence: EvidenceOut[]
  verifications: VerificationResult[]
  audit: AuditRecord[]
}

export default function ParcelsPage({ canCreate }: ParcelsPageProps) {
  const [filters, setFilters] = useState({
    parcel_code: '', upi: '', owner_name: '', province: '', district: '', sector: '', status: '',
  })
  const [result, setResult] = useState<ParcelPageResult>({ items: [], total: 0, page: 1, page_size: PAGE_SIZE, pages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [details, setDetails] = useState<ParcelDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api.parcels({ ...filters, page, page_size: PAGE_SIZE, sort_by: 'parcel_code', sort_order: 'asc' })
      .then((response) => {
        const pageResult = Array.isArray(response)
          ? { items: response, total: response.length, page: 1, page_size: response.length || PAGE_SIZE, pages: 1 }
          : response
        setResult(pageResult)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load parcels.'))
      .finally(() => setLoading(false))
  }, [filters, page])

  useEffect(() => { load() }, [load])

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const openDetails = async (parcelId: number) => {
    setDetails(null)
    setDetailsError('')
    setDetailsLoading(true)
    try {
      const parcel = await api.parcel(parcelId)
      const [ownership, transactions] = await Promise.all([
        api.ownership(parcelId),
        api.parcelTransactions(parcelId),
      ])
      const audit = await api.audit().catch(() => [])
      const evidenceResults = await Promise.allSettled(
        transactions.map((transaction) => api.evidenceForTransaction(transaction.id)),
      )
      const verificationResults = await Promise.allSettled(
        transactions.map((transaction) => api.storedVerification(transaction.id)),
      )
      setDetails({
        parcel,
        ownership,
        transactions,
        evidence: evidenceResults.flatMap((item) => item.status === 'fulfilled' ? item.value : []),
        verifications: verificationResults.flatMap((item) => item.status === 'fulfilled' ? item.value : []),
        audit: audit.filter((item) => item.entity_id === parcel.parcel_code || item.entity_id === String(parcel.id)),
      })
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Unable to load parcel details.')
    } finally {
      setDetailsLoading(false)
    }
  }

  return (
    <div className="lg-page parcels-page">
      <PageHeader
        title="Parcels"
        subtitle={canCreate ? 'Register and manage parcels from the active database.' : 'Read-only parcel registry and ownership history.'}
        actions={canCreate ? <button type="button" className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>Add parcel</button> : undefined}
      />

      <Panel title="Parcel registry" subtitle="Search and filter live Supabase records.">
        <div className="parcel-filters">
          <label>Parcel code<input value={filters.parcel_code} onChange={(e) => updateFilter('parcel_code', e.target.value)} placeholder="Search parcel code" /></label>
          <label>UPI<input value={filters.upi} onChange={(e) => updateFilter('upi', e.target.value)} placeholder="Search UPI" /></label>
          <label>Owner name<input value={filters.owner_name} onChange={(e) => updateFilter('owner_name', e.target.value)} placeholder="Search owner" /></label>
          <label>Province<input value={filters.province} onChange={(e) => updateFilter('province', e.target.value)} /></label>
          <label>District<input value={filters.district} onChange={(e) => updateFilter('district', e.target.value)} /></label>
          <label>Sector<input value={filters.sector} onChange={(e) => updateFilter('sector', e.target.value)} /></label>
          <label>Status<select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="UNDER_REVIEW">Under review</option><option value="DISPUTED">Disputed</option><option value="ARCHIVED">Archived</option></select></label>
          <button type="button" className="btn-secondary btn-sm parcel-refresh" onClick={load}><RefreshCw size={15} /> Refresh</button>
        </div>
      </Panel>

      {error && <ErrorNote message={error} onRetry={load} />}
      <Panel title={`${result.total} parcel${result.total === 1 ? '' : 's'}`} subtitle={loading ? 'Loading live records…' : 'Registered parcel records'}>
        {loading ? <LoadingRows rows={6} /> : result.items.length === 0 ? (
          <EmptyState title="No parcels found" text="Adjust the filters or register a parcel to begin." />
        ) : (
          <>
            <div className="lg-table-wrap">
              <table className="lg-table parcels-table">
                <thead><tr><th>Parcel code</th><th>UPI</th><th>Location</th><th>Province</th><th>District</th><th>Sector</th><th className="lg-num">Area (ha)</th><th>Owner</th><th>Registered</th><th>Verification</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{result.items.map((parcel) => (
                  <tr key={parcel.id}>
                    <td><strong>{parcel.parcel_code}</strong></td>
                    <td>{parcel.upi ?? '—'}</td>
                    <td>{parcel.location}</td>
                    <td>{parcel.province}</td>
                    <td>{parcel.district}</td>
                    <td>{parcel.sector}</td>
                    <td className="lg-num">{parcel.area_ha}</td>
                    <td>{parcel.owner?.full_name ?? parcel.current_owner_name ?? 'Unassigned'}</td>
                    <td>{formatDateTime(parcel.created_at)}</td>
                    <td>{humanize(parcel.location_verification_status)}</td>
                    <td><StatusBadge status={parcel.status} /></td>
                    <td><button type="button" className="btn-secondary btn-sm" onClick={() => openDetails(parcel.id)}><Eye size={14} /> View details</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="parcel-pagination"><span>Page {result.page} of {result.pages}</span><button type="button" className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button type="button" className="btn-secondary btn-sm" disabled={page >= result.pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>
          </>
        )}
      </Panel>

      {detailsLoading && <Panel title="Parcel details"><LoadingRows rows={5} /></Panel>}
      {detailsError && <ErrorNote message={detailsError} onRetry={() => details && openDetails(details.parcel.id)} />}
      {details && !detailsLoading && (
        <Panel title={`Parcel details: ${details.parcel.parcel_code}`} subtitle="Live ownership, transaction, evidence, verification, and audit records.">
          <div className="parcel-detail-grid">
            <div><span>UPI</span><strong>{details.parcel.upi ?? 'Unavailable'}</strong></div>
            <div><span>Location</span><strong>{details.parcel.location}</strong></div>
            <div><span>Area</span><strong>{details.parcel.area_ha} ha</strong></div>
            <div><span>Owner</span><strong>{details.parcel.owner?.full_name ?? details.parcel.current_owner_name ?? 'Unassigned'}</strong></div>
            <div><span>Owner type</span><strong>{humanize(details.parcel.owner?.owner_type ?? details.parcel.current_owner_type)}</strong></div>
            <div><span>Organization</span><strong>{details.parcel.owner?.organization_name ?? details.parcel.current_organization_name ?? '—'}</strong></div>
            <div><span>Verification</span><strong>{humanize(details.parcel.location_verification_status)}</strong></div>
            <div><span>Status</span><strong>{humanize(details.parcel.status)}</strong></div>
          </div>
          <div className="parcel-detail-columns">
            <DetailList title="Ownership history" empty="No ownership history recorded." rows={details.ownership.map((item) => `${formatDateTime(item.transfer_date)} · ${item.new_owner_name ?? 'Unknown'} · ${humanize(item.reason_type)}`)} />
            <DetailList title="Related transactions" empty="No related transactions." rows={details.transactions.map((item) => `${item.transaction_code} · ${humanize(item.status)} · ${formatMoney(item.declared_value)}`)} />
            <DetailList title="Evidence documents" empty="No evidence documents." rows={details.evidence.map((item) => `${item.original_filename} · ${humanize(item.status)}`)} />
            <DetailList title="Verification records" empty="No verification records." rows={details.verifications.map((item) => `${item.rule_name} · ${humanize(item.status)}`)} />
            <DetailList title="Audit history" empty="No parcel-specific audit history." rows={details.audit.map((item) => `${formatDateTime(item.created_at)} · ${humanize(item.action)}`)} />
          </div>
          <button type="button" className="icon-button parcel-details-close" aria-label="Close parcel details" onClick={() => setDetails(null)}><X size={18} /></button>
        </Panel>
      )}

      {showAdd && <AddParcelModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); setPage(1); load() }} />}
    </div>
  )
}

function DetailList({ title, empty, rows }: { title: string; empty: string; rows: string[] }) {
  return <section className="parcel-detail-list"><h3>{title}</h3>{rows.length === 0 ? <p>{empty}</p> : <ul>{rows.map((row, index) => <li key={`${row}-${index}`}>{row}</li>)}</ul>}</section>
}
