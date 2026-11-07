/**
 * Evidence Section — upload, view, and review transaction supporting documents.
 */
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Loader2,
} from 'lucide-react'
import { api, type EvidenceOut, type EvidenceReviewHistoryOut } from '../lib/api'

const DOCUMENT_TYPES = [
  { value: 'SALE_AGREEMENT', label: 'Sale Agreement' },
  { value: 'PAYMENT_RECEIPT', label: 'Payment Receipt' },
  { value: 'IDENTITY_DOCUMENT', label: 'Identity Document' },
  { value: 'OWNERSHIP_PROOF', label: 'Ownership Proof' },
  { value: 'SUPPORTING_DOCUMENT', label: 'Supporting Document' },
] as const

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  NOT_PROVIDED: { label: 'Not Provided', color: '#888', bg: '#f5f5f5', icon: XCircle },
  UPLOADED: { label: 'Uploaded', color: '#60a5fa', bg: '#eff6ff', icon: Upload },
  UNDER_REVIEW: { label: 'Under Review', color: '#fbbf24', bg: '#fffbeb', icon: Clock },
  VERIFIED_FOR_REVIEW: { label: 'Verified for Review', color: '#4ade80', bg: '#f0fdf4', icon: CheckCircle },
  NEEDS_CLARIFICATION: { label: 'Needs Clarification', color: '#f59e0b', bg: '#fffbeb', icon: AlertTriangle },
  INCONSISTENT: { label: 'Inconsistent', color: '#f87171', bg: '#fef2f2', icon: XCircle },
}

interface EvidenceSectionProps {
  transactionId: number
  canUpload: boolean
  canReview: boolean
}

export default function EvidenceSection({ transactionId, canUpload, canReview }: EvidenceSectionProps) {
  const [evidence, setEvidence] = useState<EvidenceOut[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)

  // Upload form state
  const [documentType, setDocumentType] = useState('SALE_AGREEMENT')
  const [file, setFile] = useState<File | null>(null)
  const [statedAmount, setStatedAmount] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [notes, setNotes] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadEvidence = async () => {
    setLoading(true)
    try {
      const data = await api.evidenceForTransaction(transactionId)
      setEvidence(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEvidence() }, [transactionId])

  const submitUpload = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }
    setUploading(true)
    setError('')
    setSuccess('')

    try {
      await api.uploadEvidence(transactionId, file, documentType, {
        statedPaymentAmount: statedAmount || undefined,
        paymentReference: paymentRef || undefined,
        notes: notes || undefined,
      })
      setSuccess('Evidence uploaded successfully')
      setFile(null)
      setStatedAmount('')
      setPaymentRef('')
      setNotes('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadEvidence()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const reviewEvidence = async (evidenceId: number, newStatus: string, reviewNotes: string) => {
    setError('')
    setSuccess('')
    try {
      await api.reviewEvidence(evidenceId, { status: newStatus, reviewNotes })
      setSuccess(`Evidence marked as ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`)
      await loadEvidence()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed')
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null)
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <p>Loading evidence...</p>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} />
          Transaction Evidence
        </h3>
        {canUpload && (
          <button className="btn-primary" onClick={() => setShowUploadForm(!showUploadForm)}>
            <Upload size={14} style={{ marginRight: '6px' }} />
            Upload Evidence
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#2a1a1a', border: '1px solid #5a2a2a', borderRadius: '6px', marginBottom: '12px', color: '#f877171', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px', background: '#1a2a1a', border: '1px solid #2a5a2a', borderRadius: '6px', marginBottom: '12px', color: '#4ade80', fontSize: '13px' }}>
          {success}
        </div>
      )}

      {showUploadForm && canUpload && (
        <form onSubmit={submitUpload} style={{ padding: '16px', background: '#1a1a1a', borderRadius: '8px', marginBottom: '16px', border: '1px solid #303731' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#a0a0a0', marginBottom: '4px' }}>
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#101310', border: '1px solid #303731', borderRadius: '4px', color: '#fff' }}
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#a0a0a0', marginBottom: '4px' }}>
              File (PDF, JPEG, PNG — max 10 MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ width: '100%', padding: '8px', background: '#101310', border: '1px solid #303731', borderRadius: '4px', color: '#fff' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#a0a0a0', marginBottom: '4px' }}>
                Stated Payment Amount (RWF)
              </label>
              <input
                type="text"
                placeholder="e.g., 15000000"
                value={statedAmount}
                onChange={(e) => setStatedAmount(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#101310', border: '1px solid #303731', borderRadius: '4px', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#a0a0a0', marginBottom: '4px' }}>
                Payment Reference
              </label>
              <input
                type="text"
                placeholder="e.g., PAY-2026-001"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#101310', border: '1px solid #303731', borderRadius: '4px', color: '#fff' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#a0a0a0', marginBottom: '4px' }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context about this document..."
              rows={2}
              style={{ width: '100%', padding: '8px', background: '#101310', border: '1px solid #303731', borderRadius: '4px', color: '#fff', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowUploadForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {evidence.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#888', background: '#1a1a1a', borderRadius: '8px', border: '1px dashed #303731' }}>
          <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No evidence uploaded for this transaction.</p>
          {canUpload && <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Click "Upload Evidence" to add supporting documents.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {evidence.map((ev) => {
            const statusCfg = STATUS_CONFIG[ev.status] || STATUS_CONFIG.NOT_PROVIDED
            const StatusIcon = statusCfg.icon
            return (
              <div key={ev.id} style={{ padding: '16px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #303731' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} />
                    <strong>{ev.original_filename || 'Document'}</strong>
                    <span style={{ fontSize: '11px', color: '#888', background: '#303731', padding: '2px 8px', borderRadius: '4px' }}>
                      {ev.document_type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: statusCfg.color }}>
                    <StatusIcon size={14} />
                    <span>{statusCfg.label}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '12px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ color: '#888' }}>File Size:</span>
                    <div>{(ev.file_size / 1024).toFixed(1)} KB</div>
                  </div>
                  {ev.stated_payment_amount && (
                    <div>
                      <span style={{ color: '#888' }}>Stated Amount:</span>
                      <div>{Number(ev.stated_payment_amount).toLocaleString()} RWF</div>
                    </div>
                  )}
                  {ev.payment_reference && (
                    <div>
                      <span style={{ color: '#888' }}>Payment Ref:</span>
                      <div>{ev.payment_reference}</div>
                    </div>
                  )}
                  <div>
                    <span style={{ color: '#888' }}>Uploaded:</span>
                    <div>{new Date(ev.created_at).toLocaleDateString()}</div>
                  </div>
                </div>

                {ev.notes && (
                  <div style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '12px', padding: '8px', background: '#101310', borderRadius: '4px' }}>
                    <span style={{ color: '#888' }}>Notes:</span> {ev.notes}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => { api.downloadEvidence(ev.id).catch(() => {}) }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#303731', borderRadius: '4px', color: '#fff', textDecoration: 'none', fontSize: '12px', cursor: 'pointer' }}
                  >
                    <Download size={12} />
                    Download
                  </button>
                  {canReview && (
                    <>
                      <button
                        className="btn-action btn-action--green"
                        onClick={() => reviewEvidence(ev.id, 'VERIFIED_FOR_REVIEW', 'Document reviewed and verified for transaction processing.')}
                      >
                        <CheckCircle size={12} />
                        Verify
                      </button>
                      <button
                        className="btn-action btn-action--purple"
                        onClick={() => reviewEvidence(ev.id, 'NEEDS_CLARIFICATION', 'Additional clarification required for this document.')}
                      >
                        <AlertTriangle size={12} />
                        Needs Clarification
                      </button>
                      <button
                        className="btn-action btn-action--red"
                        onClick={() => reviewEvidence(ev.id, 'INCONSISTENT', 'Document contains inconsistencies with transaction records.')}
                      >
                        <XCircle size={12} />
                        Inconsistent
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}