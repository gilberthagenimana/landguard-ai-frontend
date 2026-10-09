/**
 * Officer Dashboard — operational workflow, pending verifications, and case management.
 */
import { useEffect, useState } from 'react'
import { FileText, FolderOpen, ShieldCheck, Sparkles, AlertTriangle, Check, Clock } from 'lucide-react'
import { api, type DashboardStats, type TransactionRecord, type CaseRecord } from '../lib/api'

export default function OfficerDashboard({ stats, onNavigate }: { stats: DashboardStats; onNavigate: (page: string) => void }) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.transactions(), api.cases()])
      .then(([t, c]) => { setTransactions(t); setCases(c) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const pending = transactions.filter(t => t.status === 'PENDING')
  const flagged = transactions.filter(t => t.status === 'FLAGGED')
  const openCases = cases.filter(c => c.status === 'OPEN' || c.status === 'UNDER_REVIEW')

  return (
    <div>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Republic of Rwanda — Land Administration</p>
          <h1>Transaction Verification & Fraud-Risk Console</h1>
          <p className="heading-subtitle">Evaluate conveyance applications, trigger verification checks, and review AI risk indicators.</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Officer metrics">
        <div className="metric-card" onClick={() => onNavigate('Transactions')}>
          <div className="metric-icon metric-icon--amber"><FileText size={17} /></div>
          <div className="metric-info"><span>Pending Transactions</span><strong>{pending.length}</strong></div>
        </div>
        <div className="metric-card" onClick={() => onNavigate('Transactions')}>
          <div className="metric-icon metric-icon--red"><AlertTriangle size={17} /></div>
          <div className="metric-info"><span>Flagged</span><strong>{flagged.length}</strong></div>
        </div>
        <div className="metric-card" onClick={() => onNavigate('Cases')}>
          <div className="metric-icon metric-icon--blue"><FolderOpen size={17} /></div>
          <div className="metric-info"><span>Open Cases</span><strong>{openCases.length}</strong></div>
        </div>
        <div className="metric-card" onClick={() => onNavigate('Transactions')}>
          <div className="metric-icon metric-icon--violet"><Sparkles size={17} /></div>
          <div className="metric-info"><span>High Risk</span><strong>{stats.high_risk_transactions}</strong></div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Verification Queue</p>
              <h2>Pending Transactions</h2>
            </div>
            <button className="filter-button" onClick={() => onNavigate('Transactions')}>View All</button>
          </div>
          {loading ? (
            <p style={{ color: '#888', fontSize: '12px' }}>Loading...</p>
          ) : (
            <div className="reference-table">
              <div className="reference-header">
                <span>TX CODE</span>
                <span>PARCEL</span>
                <span>STATUS</span>
                <span>RISK</span>
              </div>
              {pending.slice(0, 5).map((tx) => (
                <div className="reference-row" key={tx.id}>
                  <strong>{tx.transaction_code}</strong>
                  <span>{tx.parcel_code || `Parcel #${tx.parcel_id}`}</span>
                  <span className="status-label">{tx.status}</span>
                  <span className={`risk-label risk-label--${(tx.latest_risk_level || 'LOW').toLowerCase()}`}>
                    {tx.latest_risk_level || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Action Required</p>
              <h2>Recent Alerts</h2>
            </div>
          </div>
          <div className="alerts-list">
            {stats.recent_alerts?.length ? (
              stats.recent_alerts.slice(0, 4).map((alert, i) => (
                <div className="alert-item" key={i}>
                  <div className={`alert-icon alert-icon--${(alert.risk || 'HIGH').toLowerCase()}`}>
                    {(alert.risk || 'HIGH') === 'HIGH' ? <AlertTriangle size={14} /> : <AlertTriangle size={14} />}
                  </div>
                  <div className="alert-copy">
                    <strong>{alert.id}</strong>
                    <span>{alert.title}</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#888', fontSize: '12px' }}>No recent alerts</p>
            )}
          </div>
        </article>
      </section>

      <footer className="footer">
        <span><span className="live-dot" /> Connected to Backend (SQLite for development)</span>
        <span>Decision support system only. AI predictions do not replace official Rwandan land authorities.</span>
      </footer>
    </div>
  )
}
