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
  const [result, setResult] = useState<PublicParcelOut | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!upi.trim()) {
      setError('Please enter a UPI')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    setSearched(true)
    try {
      const data = await api.publicParcelCheck(upi.trim())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parcel not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: '520px' }}>
        <div className="brand-row login-brand">
          <div className="brand-mark"><ShieldCheck size={18} /></div>
          <span>LandGuard AI</span>
        </div>
        <h1>Public Parcel Check</h1>
        <p className="login-subtitle">
          Check parcel status by UPI (Unique Parcel Identifier)
        </p>

        <form onSubmit={submit} className="login-form">
          <label>
            Enter UPI
            <input
              type="text"
              placeholder="e.g., UPI-001"
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
            <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="detail-card">
                <span>UPI</span>
                <strong>{result.upi}</strong>
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
            </div>

            <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', background: result.has_pending_transaction ? '#2a1a1a' : '#1a2a1a', border: `1px solid ${result.has_pending_transaction ? '#5a2a2a' : '#2a5a2a'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {result.has_pending_transaction ? (
                  <AlertTriangle size={18} style={{ color: '#f87171' }} />
                ) : (
                  <CheckCircle size={18} style={{ color: '#4ade80' }} />
                )}
                <strong style={{ color: result.has_pending_transaction ? '#f87171' : '#4ade80' }}>
                  {result.has_pending_transaction ? 'Pending Transaction Detected' : 'No Pending Transactions'}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#c5c5c5' }}>
                Parcel Status: <strong>{result.status}</strong>
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
