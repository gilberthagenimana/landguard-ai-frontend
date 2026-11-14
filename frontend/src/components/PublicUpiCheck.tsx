/**
 * Public UPI Check Page — citizen-facing parcel status checker.
 * No authentication required. Shows only safe, non-sensitive information.
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Search, ShieldCheck, AlertTriangle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { api, type PublicParcelOut } from '../lib/api'

export default function PublicUpiCheck({ onBack }: { onBack: () => void }) {
  const [upi, setUpi] = useState('')
  const [lookupMode, setLookupMode] = useState<'upi' | 'parcel_code'>('upi')
  const [result, setResult] = useState<PublicParcelOut | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!upi.trim()) {
      setError(lookupMode === 'upi' ? 'Please enter a UPI' : 'Please enter a parcel code')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    setSearched(true)
    try {
      const data = lookupMode === 'upi'
        ? await api.publicParcelCheck(upi.trim())
        : await api.publicParcelByCode(upi.trim())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parcel not found')
    } finally {
      setLoading(false)
    }
  }

  const txStatus = result?.transaction_status ?? null
  const availability = result?.availability || (result?.has_pending_transaction ? 'UNAVAILABLE' : 'AVAILABLE')
  const pending = Boolean(result?.has_pending_transaction) && txStatus != null
  const bannerTitle = pending && txStatus ? (
    txStatus === 'PENDING_REVIEW' || txStatus === 'PENDING'
      ? 'PENDING TRANSACTION'
      : txStatus === 'UNDER_REVIEW'
        ? 'UNDER REVIEW'
        : txStatus === 'FLAGGED'
          ? 'FLAGGED'
          : txStatus === 'VERIFIED'
            ? 'VERIFIED'
            : txStatus === 'APPROVED'
              ? 'APPROVED'
              : txStatus === 'AWAITING_EVIDENCE'
                ? 'AWAITING EVIDENCE'
                : 'TRANSACTION IN PROGRESS'
  ) : null
  const bannerMessage = pending && txStatus ? (
    txStatus === 'PENDING_REVIEW' || txStatus === 'PENDING'
      ? 'PENDING TRANSACTION — NOT AVAILABLE FOR ANOTHER SALE.'
      : txStatus === 'UNDER_REVIEW'
        ? 'UNDER REVIEW — OWNERSHIP TRANSFER NOT YET CONFIRMED.'
        : txStatus === 'FLAGGED'
          ? 'FLAGGED — FURTHER INVESTIGATION REQUIRED. The parcel is restricted.'
          : txStatus === 'VERIFIED'
            ? 'VERIFIED — OWNERSHIP TRANSFER PENDING CONFIRMATION. The parcel remains unavailable until completion is confirmed.'
            : txStatus === 'APPROVED'
              ? 'APPROVED — OWNERSHIP TRANSFER PENDING FINAL CONFIRMATION. The parcel remains unavailable until completion is confirmed.'
              : txStatus === 'AWAITING_EVIDENCE'
                ? 'AWAITING EVIDENCE — OWNERSHIP TRANSFER NOT YET CONFIRMED. The parcel is not available for another sale.'
                : 'TRANSACTION IN PROGRESS — NOT AVAILABLE FOR ANOTHER SALE.'
  ) : null

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: '520px' }}>
        <div className="brand-row login-brand">
          <div className="brand-mark"><ShieldCheck size={18} /></div>
          <span>LandGuard AI</span>
        </div>
        <h1>Public Parcel Check</h1>
        <p className="login-subtitle">
          Check parcel status by UPI or parcel code
        </p>

        <form onSubmit={submit} className="login-form">
          <label>
            {lookupMode === 'upi' ? 'Enter UPI' : 'Enter parcel code'}
            <select value={lookupMode} onChange={(e) => setLookupMode(e.target.value as 'upi' | 'parcel_code')}>
              <option value="upi">Official UPI</option>
              <option value="parcel_code">Parcel code</option>
            </select>
            <input
              type="text"
              placeholder={lookupMode === 'upi' ? 'e.g. 1/02/03/04/567' : 'e.g. RW-10432'}
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              required
              autoFocus
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Check Parcel Status'}
          </button>
        </form>

        {result && (
          <div style={{ marginTop: '24px', textAlign: 'left' }}>
            <div className="detail-grid">
              <div className="detail-card">
                <span>UPI</span>
                <strong>{result.upi || 'UPI unavailable'}</strong>
              </div>
              <div className="detail-card">
                <span>Parcel Code</span>
                <strong>{result.parcel_code}</strong>
              </div>
              <div className="detail-card">
                <span>Location</span>
                <strong>{result.location}</strong>
              </div>
              <div className="detail-card">
                <span>District</span>
                <strong>{result.district}</strong>
              </div>
              <div className="detail-card">
                <span>Ownership Status</span>
                <strong>{result.status}</strong>
              </div>
              <div className="detail-card">
                <span>Availability</span>
                <strong>{availability}</strong>
              </div>
              <div className="detail-card">
                <span>Registered Owner</span>
                <strong>{result.registered_owner_name || 'Owner information unavailable'}</strong>
              </div>
              {result.transaction_status && (
                <div className="detail-card">
                  <span>Transaction Status</span>
                  <strong>{result.transaction_status}</strong>
                </div>
              )}
              {result.transaction_code && (
                <div className="detail-card">
                  <span>Transaction Reference</span>
                  <strong>{result.transaction_code}</strong>
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', background: result.has_pending_transaction ? '#2a1a1a' : '#1a2a1a', border: `1px solid ${result.has_pending_transaction ? '#5a2a2a' : '#2a5a2a'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {result.has_pending_transaction ? (
                  <AlertTriangle size={18} style={{ color: '#f87171' }} />
                ) : (
                  <CheckCircle size={18} style={{ color: '#4ade80' }} />
                )}
                <strong style={{ color: result.has_pending_transaction ? '#f87171' : '#4ade80' }}>
                  {result.has_pending_transaction ? (bannerTitle ?? 'Transaction Pending') : 'No Pending Transactions'}
                </strong>
              </div>
              {result.has_pending_transaction && bannerMessage && (
                <p style={{ margin: 0, fontSize: '13px', color: '#c5c5c5' }}>
                  {bannerMessage}
                </p>
              )}
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#c5c5c5' }}>
                Parcel Status: <strong>{result.status}</strong>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#c5c5c5' }}>
                Availability: <strong>{availability}</strong>
              </p>
            </div>

            {result.warning_message && (
              <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: '#2a1a1a', border: '1px solid #5a2a2a' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: '#fbbf24' }}>{result.warning_message}</p>
                </div>
              </div>
            )}

            <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: '#1a1a2a', border: '1px solid #2a2a5a' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#a0a0c0' }}>{result.public_notice}</p>
            </div>
          </div>
        )}

        {searched && !result && !error && !loading && (
          <p style={{ marginTop: '16px', color: '#888', fontSize: '13px' }}>
            No parcel found with UPI: {upi}
          </p>
        )}

        <button
          className="demo-button"
          onClick={onBack}
          style={{ marginTop: '20px' }}
        >
          <ArrowLeft size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Back to Login
        </button>

        <p className="login-note" style={{ marginTop: '16px' }}>
          This is a public information service.<br />
          For official verification, please visit your local land authority office.
        </p>
      </div>
    </div>
  )
}
