import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Flag,
  History,
  Info,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  User,
  X,
} from 'lucide-react'
import {
  api,
  type CurrentUser,
  type TransactionRecord,
  type TransactionReviewDetails,
} from '../lib/api'

interface Props {
  currentUser: CurrentUser | null
  onNavigateToParcel?: (parcelId: number) => void
  initialTxId?: number | null
}

type TabFilter =
  | 'ALL'
  | 'PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'FLAGGED'
  | 'AWAITING_EVIDENCE'
  | 'REJECTED'
  | 'COMPLETED'

export default function TransactionReviewCenter({ currentUser, initialTxId }: Props) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null)
  const [reviewDetails, setReviewDetails] = useState<TransactionReviewDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  // Review action modal state
  const [actionType, setActionType] = useState<string | null>(null)
  const [actionExplanation, setActionExplanation] = useState('')
  const [investigationFindings, setInvestigationFindings] = useState('')
  const [evidenceNotes, setEvidenceNotes] = useState('')
  const [transferRef, setTransferRef] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  const isAuditor = Boolean(currentUser?.roles?.includes('AUDITOR'))
  const isAdmin = Boolean(currentUser?.roles?.includes('ADMIN'))

  const loadTransactions = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.transactions()
      setTransactions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  const openReviewModal = async (txId: number) => {
    setSelectedTxId(txId)
    setReviewDetails(null)
    setLoadingDetails(true)
    setDetailsError('')
    setActionType(null)
    setActionExplanation('')
    setInvestigationFindings('')
    setEvidenceNotes('')
    setTransferRef('')
    setActionError('')
    try {
      const details = await api.transactionReviewDetails(txId)
      setReviewDetails(details)
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to load transaction review details')
    } finally {
      setLoadingDetails(false)
    }
  }

  useEffect(() => {
    if (initialTxId == null) return
    void openReviewModal(initialTxId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTxId])

  const handleDecisionSubmit = async () => {
    if (!selectedTxId || !actionType) return
    const explanation = actionExplanation.trim()
    if (!explanation) {
      setActionError('An explanation is mandatory for all review decisions.')
      return
    }

    if (actionType === 'RESOLVE_FLAG' && !investigationFindings.trim()) {
      setActionError('Investigation findings are required when resolving a flagged transaction.')
      return
    }

    setActionSubmitting(true)
    setActionError('')
    try {
      if (actionType === 'CONFIRM_TRANSFER') {
        const ref = transferRef.trim()
        if (!ref) {
          setActionError('An official transfer reference (e.g. Title Deed Number / Notary Certificate) is required.')
          setActionSubmitting(false)
          return
        }
        await api.confirmTransfer(selectedTxId, {
          supporting_reference: ref,
          notes: explanation,
        })
        setSuccessBanner(`Transaction TX-${selectedTxId} ownership transfer officially completed and recorded!`)
      } else {
        await api.submitReviewDecision(selectedTxId, {
          action: actionType,
          explanation: explanation,
          investigation_findings: investigationFindings.trim() || undefined,
          evidence_notes: evidenceNotes.trim() || undefined,
        })
        setSuccessBanner(`Decision recorded successfully for transaction TX-${selectedTxId}.`)
      }

      await loadTransactions()
      // Reload details
      const updatedDetails = await api.transactionReviewDetails(selectedTxId)
      setReviewDetails(updatedDetails)
      setActionType(null)
      setActionExplanation('')
      setTransferRef('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action submission failed')
    } finally {
      setActionSubmitting(false)
    }
  }

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    const status = (tx.status || '').toUpperCase()
    if (activeTab === 'PENDING_REVIEW' && status !== 'PENDING_REVIEW' && status !== 'PENDING') return false
    if (activeTab === 'UNDER_REVIEW' && status !== 'UNDER_REVIEW') return false
    if (activeTab === 'VERIFIED' && status !== 'VERIFIED' && status !== 'APPROVED') return false
    if (activeTab === 'FLAGGED' && status !== 'FLAGGED') return false
    if (activeTab === 'AWAITING_EVIDENCE' && status !== 'AWAITING_EVIDENCE') return false
    if (activeTab === 'REJECTED' && status !== 'REJECTED') return false
    if (activeTab === 'COMPLETED' && status !== 'COMPLETED') return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchCode = (tx.transaction_code || '').toLowerCase().includes(q)
      const matchParcel = (tx.parcel_code || '').toLowerCase().includes(q)
      const matchSeller = (tx.seller_name || '').toLowerCase().includes(q)
      const matchBuyer = (tx.buyer_name || '').toLowerCase().includes(q)
      if (!matchCode && !matchParcel && !matchSeller && !matchBuyer) return false
    }
    return true
  })

  const counts = {
    ALL: transactions.length,
    PENDING_REVIEW: transactions.filter((t) => ['PENDING_REVIEW', 'PENDING'].includes((t.status || '').toUpperCase())).length,
    UNDER_REVIEW: transactions.filter((t) => t.status === 'UNDER_REVIEW').length,
    VERIFIED: transactions.filter((t) => ['VERIFIED', 'APPROVED'].includes((t.status || '').toUpperCase())).length,
    FLAGGED: transactions.filter((t) => t.status === 'FLAGGED').length,
    AWAITING_EVIDENCE: transactions.filter((t) => t.status === 'AWAITING_EVIDENCE').length,
    REJECTED: transactions.filter((t) => t.status === 'REJECTED').length,
    COMPLETED: transactions.filter((t) => t.status === 'COMPLETED').length,
  }

  return (
    <div className="workspace-page transaction-review-center">
      <div className="page-heading">
        <div>
          <h2>Transaction Review Center</h2>
          <p>
            {isAuditor
              ? 'Auditor Oversight: Read-only verification, evidence inspection, and decision audit logs.'
              : 'Admin Operations: Automated checks, risk triage, verification review, and official ownership transfer.'}
          </p>
        </div>
        <button className="btn-secondary" onClick={loadTransactions} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {successBanner && (
        <div className="alert alert--success" style={{ marginBottom: '16px' }}>
          <CheckCircle size={18} />
          <span>{successBanner}</span>
          <button className="icon-button" onClick={() => setSuccessBanner(null)} style={{ marginLeft: 'auto' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && <div className="alert alert--error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Status Tabs Navigation */}
      <div className="filter-tabs-row" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
        {(
          [
            { id: 'ALL', label: 'All' },
            { id: 'PENDING_REVIEW', label: 'Pending Review' },
            { id: 'UNDER_REVIEW', label: 'Under Review' },
            { id: 'VERIFIED', label: 'Verified / Approved' },
            { id: 'FLAGGED', label: 'Flagged' },
            { id: 'AWAITING_EVIDENCE', label: 'Awaiting Evidence' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'COMPLETED', label: 'Completed' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            className={`btn-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              border: activeTab === tab.id ? '1px solid var(--blue)' : '1px solid #334155',
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeTab === tab.id ? '#60a5fa' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '10px',
                background: activeTab === tab.id ? '#2563eb' : '#1e293b',
                color: '#fff',
              }}
            >
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#64748b' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search by Transaction Code, Parcel UPI, Seller, or Buyer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <button className="btn-secondary" onClick={() => setSearchQuery('')}>
            Clear
          </button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>No transactions found matching this status or query.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Parcel / UPI</th>
                <th>Seller</th>
                <th>Buyer</th>
                <th>Declared Value</th>
                <th>Status</th>
                <th>AI Risk</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const s = (tx.status || 'PENDING_REVIEW').toUpperCase()
                const risk = tx.latest_risk_level || 'LOW'
                return (
                  <tr key={tx.id}>
                    <td>
                      <strong>{tx.transaction_code}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {new Date(tx.transaction_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div>{tx.parcel_code || `PARCEL-${tx.parcel_id}`}</div>
                    </td>
                    <td>{tx.seller_name || 'Recorded Owner'}</td>
                    <td>{tx.buyer_name || 'Conveyee'}</td>
                    <td>
                      <strong style={{ color: '#38bdf8' }}>
                        {Number(tx.declared_value || 0).toLocaleString()} RWF
                      </strong>
                    </td>
                    <td>
                      <span className={`status-badge status-${s.toLowerCase().replace(/_/g, '-')}`}>
                        {s.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-badge risk-${risk.toLowerCase()}`}>
                        {risk} {tx.latest_risk_score !== undefined && tx.latest_risk_score !== null ? `(${tx.latest_risk_score})` : ''}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => openReviewModal(tx.id)}
                      >
                        <ShieldCheck size={14} /> Review
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Modal Dialog */}
      {selectedTxId && (
        <div className="modal-overlay" onClick={() => setSelectedTxId(null)}>
          <div
            className="modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '960px', width: '92vw', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {loadingDetails ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
                <p>Loading transaction review package, automated checks, and audit history...</p>
              </div>
            ) : detailsError ? (
              <div style={{ padding: '24px' }}>
                <div className="alert alert--error">{detailsError}</div>
                <button className="btn-secondary" onClick={() => setSelectedTxId(null)} style={{ marginTop: '16px' }}>
                  Close
                </button>
              </div>
            ) : reviewDetails ? (
              <>
                {/* Modal Header */}
                <div className="modal-head" style={{ borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2>Review Transaction: {reviewDetails.transaction.transaction_code}</h2>
                      <span className={`status-badge status-${(reviewDetails.transaction.status || '').toLowerCase().replace(/_/g, '-')}`}>
                        {(reviewDetails.transaction.status || 'PENDING_REVIEW').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      Type: <strong>{reviewDetails.transaction.transaction_type}</strong> | Registered on{' '}
                      {new Date(reviewDetails.transaction.transaction_date).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="icon-button" onClick={() => setSelectedTxId(null)}>
                    <X size={18} />
                  </button>
                </div>

                {/* Review Body */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
                  {/* Status Banner Notices */}
                  {reviewDetails.transaction.status === 'VERIFIED' && (
                    <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle size={20} />
                      <div>
                        <strong>Transaction Verified / Approved</strong>
                        <p style={{ margin: 0, fontSize: '12px' }}>
                          This transaction has passed administrative review. Official ownership transfer confirmation can now be executed below.
                        </p>
                      </div>
                    </div>
                  )}

                  {reviewDetails.transaction.status === 'COMPLETED' && (
                    <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.15)', border: '1px solid #0284c7', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldCheck size={20} />
                      <div>
                        <strong>Ownership Transfer Finalized & Completed</strong>
                        <p style={{ margin: 0, fontSize: '12px' }}>
                          Official title transfer has been recorded in ownership history with reference: {reviewDetails.transaction.supporting_reference || 'CONFIRMED'}.
                        </p>
                      </div>
                    </div>
                  )}

                  {reviewDetails.transaction.status === 'FLAGGED' && (
                    <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertTriangle size={20} />
                      <div>
                        <strong>Flagged for Investigation</strong>
                        <p style={{ margin: 0, fontSize: '12px' }}>
                          Suspicious patterns or conflicts were flagged. An authorized investigation resolution with recorded findings is required to proceed.
                        </p>
                      </div>
                    </div>
                  )}

                  {reviewDetails.transaction.status === 'AWAITING_EVIDENCE' && (
                    <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #eab308', color: '#facc15', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={20} />
                      <div>
                        <strong>Awaiting Additional Evidence</strong>
                        <p style={{ margin: 0, fontSize: '12px' }}>
                          The administrator has requested further supporting documentation before proceeding with verification.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Section 1: Parties & Parcel Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {/* Parcel Details Card */}
                    <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#60a5fa' }}>
                        <MapPin size={18} />
                        <h4 style={{ margin: 0 }}>Target Parcel Details</h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#94a3b8' }}>UPI: </span>
                          <strong style={{ color: '#f8fafc' }}>{reviewDetails.parcel?.upi || 'N/A'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Parcel Code: </span>
                          <strong>{reviewDetails.parcel?.parcel_code || `PARCEL-${reviewDetails.transaction.parcel_id}`}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Location: </span>
                          <span>{reviewDetails.parcel?.location || `${reviewDetails.parcel?.district}, ${reviewDetails.parcel?.sector}`}</span>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Area: </span>
                          <span>{reviewDetails.parcel?.area_ha} ha</span>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Parcel Status: </span>
                          <span style={{ color: reviewDetails.parcel?.status === 'ACTIVE' ? '#4ade80' : '#f87171' }}>
                            {reviewDetails.parcel?.status || 'ACTIVE'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Parties (Seller & Buyer) Card */}
                    <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#60a5fa' }}>
                        <User size={18} />
                        <h4 style={{ margin: 0 }}>Parties to Conveyance</h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                        <div style={{ padding: '8px', borderRadius: '6px', background: '#0f172a' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Current Recorded Seller</span>
                          <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: '2px' }}>
                            {reviewDetails.seller?.full_name || reviewDetails.current_owner?.full_name || 'Recorded Owner'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            ID: {reviewDetails.seller?.identification_number || reviewDetails.current_owner?.identification_number || 'N/A'}
                          </div>
                        </div>

                        <div style={{ padding: '8px', borderRadius: '6px', background: '#0f172a' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Target Buyer / Conveyee</span>
                          <div style={{ fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>
                            {reviewDetails.buyer?.full_name || 'Conveyee'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            ID: {reviewDetails.buyer?.identification_number || 'N/A'}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#94a3b8' }}>Declared Amount: </span>
                          <strong style={{ color: '#38bdf8', fontSize: '15px' }}>
                            {Number(reviewDetails.transaction.declared_value || 0).toLocaleString()} RWF
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Automated Checks & AI Risk Assessment */}
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa' }}>
                        <ShieldCheck size={18} />
                        <h4 style={{ margin: 0 }}>Automated System Checks & AI Risk Assessment</h4>
                      </div>
                      {reviewDetails.ai_risk && (
                        <span className={`risk-badge risk-${reviewDetails.ai_risk.risk_level.toLowerCase()}`}>
                          {reviewDetails.ai_risk.risk_level} Risk ({reviewDetails.ai_risk.risk_score}/100)
                        </span>
                      )}
                    </div>

                    {/* AI Advisory Disclaimer */}
                    <div style={{ padding: '10px 14px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', fontSize: '12px', color: '#cbd5e1', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Info size={16} style={{ color: '#60a5fa', flexShrink: 0 }} />
                      <span>
                        <strong>AI Advisory Notice:</strong> {reviewDetails.ai_risk?.disclaimer || 'AI assessments provide advisory recommendations and decision support only; they do not make legally authoritative ownership decisions.'}
                      </span>
                    </div>

                    {/* Verification Rules Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                      {reviewDetails.verification_results.map((rule, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '10px',
                            borderRadius: '6px',
                            background: '#0f172a',
                            borderLeft: `4px solid ${rule.status === 'PASS' ? '#22c55e' : rule.status === 'WARNING' ? '#eab308' : '#ef4444'}`,
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong>{rule.rule_name}</strong>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: rule.status === 'PASS' ? '#14532d' : rule.status === 'WARNING' ? '#713f12' : '#7f1d1d',
                                color: rule.status === 'PASS' ? '#4ade80' : rule.status === 'WARNING' ? '#fde047' : '#fca5a5',
                              }}
                            >
                              {rule.status}
                            </span>
                          </div>
                          <p style={{ margin: 0, color: '#94a3b8' }}>{rule.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Supporting Evidence */}
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#60a5fa' }}>
                      <FileText size={18} />
                      <h4 style={{ margin: 0 }}>Supporting Evidence Documents ({reviewDetails.evidence.length})</h4>
                    </div>

                    {reviewDetails.evidence.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                        No supporting evidence files currently attached to this transaction.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {reviewDetails.evidence.map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              background: '#0f172a',
                              borderRadius: '6px',
                              fontSize: '13px',
                            }}
                          >
                            <div>
                              <strong>{ev.original_filename || 'Evidence Document'}</strong>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                Type: {ev.document_type} | Ref: {ev.payment_reference || 'N/A'} | Stated:{' '}
                                {ev.stated_payment_amount || 'N/A'}
                              </div>
                            </div>
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => api.downloadEvidence(ev.id)}
                            >
                              <Download size={13} /> Download
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 4: Chain of Title (Ownership History) */}
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#60a5fa' }}>
                      <History size={18} />
                      <h4 style={{ margin: 0 }}>Ownership History & Chain of Title</h4>
                    </div>
                    {reviewDetails.ownership_history.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>No prior recorded transfers.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {reviewDetails.ownership_history.map((h, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              background: '#0f172a',
                              borderRadius: '6px',
                              fontSize: '12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <span style={{ color: '#94a3b8' }}>{new Date(h.transfer_date).toLocaleDateString()}</span> —{' '}
                              <strong>{h.reason_type}</strong>: {h.previous_owner_name || 'Initial Registrar'} →{' '}
                              <strong style={{ color: '#4ade80' }}>{h.new_owner_name}</strong>
                            </div>
                            <span style={{ color: '#64748b' }}>Ref: {h.supporting_reference || 'N/A'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 5: Previous Review Decisions & Audit Logs */}
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#60a5fa' }}>
                      <Clock size={18} />
                      <h4 style={{ margin: 0 }}>Review Decisions & Audit Trail</h4>
                    </div>
                    {reviewDetails.review_decisions.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>No previous review decisions recorded.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {reviewDetails.review_decisions.map((d, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              background: '#0f172a',
                              borderRadius: '6px',
                              fontSize: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span>
                                {d.previous_status || 'CREATED'} → <strong>{d.new_status}</strong>
                              </span>
                              <span style={{ color: '#64748b' }}>
                                {d.created_at ? new Date(d.created_at).toLocaleString() : ''}
                              </span>
                            </div>
                            <div style={{ color: '#cbd5e1' }}>{d.reason}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 6: Administrative Decision Panel */}
                  {isAuditor ? (
                    <div
                      style={{
                        padding: '16px',
                        background: '#0f172a',
                        borderRadius: '10px',
                        border: '1px solid #334155',
                        color: '#94a3b8',
                        fontSize: '13px',
                        textAlign: 'center',
                      }}
                    >
                      <Shield size={20} style={{ margin: '0 auto 6px', color: '#60a5fa' }} />
                      <p style={{ margin: 0 }}>
                        <strong>Auditor Read-Only Oversight:</strong> You have full inspection privileges to audit all
                        transaction records, decisions, evidence, and logs. Decision submission is restricted to Administrators.
                      </p>
                    </div>
                  ) : !reviewDetails.can_review ? (
                    <div
                      style={{
                        padding: '16px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '10px',
                        border: '1px solid #ef4444',
                        color: '#fca5a5',
                        fontSize: '13px',
                      }}
                    >
                      <strong>Review Action Restricted:</strong> {reviewDetails.cannot_review_reason}
                    </div>
                  ) : (
                    <div
                      style={{
                        background: '#1e293b',
                        padding: '20px',
                        borderRadius: '10px',
                        border: '1px solid #3b82f6',
                      }}
                    >
                      <h4 style={{ margin: '0 0 12px', color: '#60a5fa' }}>Administrative Review Decision</h4>

                      {actionError && (
                        <div className="alert alert--error" style={{ marginBottom: '14px' }}>
                          {actionError}
                        </div>
                      )}

                      {!actionType ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {['PENDING_REVIEW', 'PENDING'].includes(reviewDetails.transaction.status) && (
                            <button
                              className="btn-primary"
                              onClick={() => setActionType('START_REVIEW')}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <ShieldCheck size={16} /> Start Review
                            </button>
                          )}

                          {reviewDetails.transaction.status === 'UNDER_REVIEW' && (
                            <>
                              <button
                                className="btn-primary"
                                style={{ background: '#16a34a' }}
                                onClick={() => setActionType('VERIFY')}
                              >
                                <CheckCircle size={16} /> Approve / Verify
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ color: '#eab308' }}
                                onClick={() => setActionType('REQUEST_EVIDENCE')}
                              >
                                <Upload size={16} /> Request More Evidence
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ color: '#f97316' }}
                                onClick={() => setActionType('FLAG')}
                              >
                                <Flag size={16} /> Flag for Investigation
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ color: '#ef4444' }}
                                onClick={() => setActionType('REJECT')}
                              >
                                <X size={16} /> Reject
                              </button>
                            </>
                          )}

                          {reviewDetails.transaction.status === 'AWAITING_EVIDENCE' && (
                            <button
                              className="btn-primary"
                              onClick={() => setActionType('RESUME_REVIEW')}
                            >
                              <RefreshCw size={16} /> Resume Review
                            </button>
                          )}

                          {reviewDetails.transaction.status === 'FLAGGED' && (
                            <>
                              <button
                                className="btn-primary"
                                onClick={() => setActionType('RESOLVE_FLAG')}
                              >
                                <CheckCircle size={16} /> Resolve Investigation & Return to Review
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ color: '#ef4444' }}
                                onClick={() => setActionType('REJECT')}
                              >
                                <X size={16} /> Confirm Fraud & Reject
                              </button>
                            </>
                          )}

                          {['VERIFIED', 'APPROVED'].includes(reviewDetails.transaction.status) && (
                            <button
                              className="btn-primary"
                              style={{ background: '#2563eb' }}
                              onClick={() => setActionType('CONFIRM_TRANSFER')}
                            >
                              <ShieldCheck size={16} /> Confirm Official Transfer
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#f8fafc' }}>
                              Action Selected: {actionType.replace(/_/g, ' ')}
                            </strong>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => setActionType(null)}
                            >
                              Cancel Action
                            </button>
                          </div>

                          {actionType === 'CONFIRM_TRANSFER' && (
                            <div className="form-group">
                              <label className="form-label">
                                Official Transfer Reference (Title Deed Number / Registrar Confirmation) *
                              </label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. DEED-REG-2026-8849"
                                value={transferRef}
                                onChange={(e) => setTransferRef(e.target.value)}
                                required
                              />
                            </div>
                          )}

                          {actionType === 'RESOLVE_FLAG' && (
                            <div className="form-group">
                              <label className="form-label">Investigation Findings & Resolution Summary *</label>
                              <textarea
                                className="form-input"
                                rows={2}
                                placeholder="Detail the results of the physical/cadastral investigation that resolved the flag..."
                                value={investigationFindings}
                                onChange={(e) => setInvestigationFindings(e.target.value)}
                                required
                              />
                            </div>
                          )}

                          {actionType === 'REQUEST_EVIDENCE' && (
                            <div className="form-group">
                              <label className="form-label">Evidence Requested & Requirements *</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Specify required bank confirmation, proof of funds, or affidavit..."
                                value={evidenceNotes}
                                onChange={(e) => setEvidenceNotes(e.target.value)}
                              />
                            </div>
                          )}

                          <div className="form-group">
                            <label className="form-label">Administrative Decision Explanation (Mandatory) *</label>
                            <textarea
                              className="form-input"
                              rows={3}
                              placeholder="Provide clear justification for this review decision. Recorded in official audit logs..."
                              value={actionExplanation}
                              onChange={(e) => setActionExplanation(e.target.value)}
                              required
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setActionType(null)}
                              disabled={actionSubmitting}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={handleDecisionSubmit}
                              disabled={actionSubmitting}
                            >
                              {actionSubmitting ? 'Recording Decision...' : 'Confirm Decision'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
