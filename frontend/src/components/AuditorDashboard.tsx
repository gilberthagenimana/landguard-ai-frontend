/**
 * Auditor Dashboard — independent review of transactions, risk, verification, and audit trail.
 */
import { useEffect, useState } from 'react'
import { ClipboardCheck, FileText, FolderOpen, ShieldCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { api, type DashboardStats, type TransactionRecord, type CaseRecord, type AuditRecord } from '../lib/api'

export default function AuditorDashboard({ stats, onNavigate }: { stats: DashboardStats; onNavigate: (page: string) => void }) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.transactions(), api.cases(), api.audit()])
      .then(([t, c, a]) => { setTransactions(t); setCases(c); setAuditLogs(a) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const completed = transactions.filter(t => t.status === 'COMPLETED')
  const flagged = transactions.filter(t => t.status === 'FLAGGED')
  const highRisk = transactions.filter(t => t.latest_risk_level === 'HIGH')

  return (
    <div>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Republic of Rwanda — Land Administration</p>
          <h1>Cadastre Audit & Compliance Console</h1>
          <p className="heading-subtitle">Review historical transactions, verification rule outcomes, and compliance audit trails.</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Auditor metrics">
        <div className="metric-card" onClick={() => onNavigate('Transactions')}>
          <div className="metric-icon metric-icon--blue"><FileText size={17} /></div>
          <div className="metric-info"><span>Total Transactions</span><strong>{transactions.length}</strong></div>
        </div>
        <div className="metric-card" onClick={() => onNavigate('Transactions')}>
          <div className="metric-icon metric-icon--green"><CheckCircle size={17} /></div>
          <div className="metric-info"><span>Completed</span><strong>{completed.length}</strong></div>
        </div>
        <div className="metric-card" onClick={() => onNavigate('Transactions')}>
          <div className="metric-icon metric-icon--red"><AlertTriangle size={17} /></div>
          <div className="metric-info"><span>High Risk</span><strong>{highRisk.length}</strong></div>
        </div>
        <div className="metric-card" onClick={() => onNavigate('Audit logs')}>
          <div className="metric-icon metric-icon--violet"><ClipboardCheck size={17} /></div>
          <div className="metric-info"><span>Audit Entries</span><strong>{auditLogs.length}</strong></div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Risk Review</p>
              <h2>High-Risk Transactions</h2>
            </div>
          </div>
          {loading ? (
            <p style={{ color: '#888', fontSize: '12px' }}>Loading...</p>
          ) : (
            <div className="reference-table">
              <div className="reference-header">
                <span>TX CODE</span>
                <span>PARCEL</span>
                <span>RISK</span>
                <span>STATUS</span>
              </div>
              {highRisk.slice(0, 5).map((tx) => (
                <div className="reference-row" key={tx.id}>
                  <strong>{tx.transaction_code}</strong>
                  <span>{tx.parcel_code || `Parcel #${tx.parcel_id}`}</span>
                  <span className="risk-label risk-label--high">{tx.latest_risk_level}</span>
                  <span className="status-label">{tx.status}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Compliance Trail</p>
              <h2>Recent Audit Activity</h2>
            </div>
          </div>
          <div className="activity-list">
            {auditLogs.slice(0, 8).map((log, i) => (
              <div className="activity-item" key={i}>
                <div className="activity-icon activity-icon--green"><CheckCircle size={14} /></div>
                <span>{log.action} — {log.entity} {log.entity_id || ''}</span>
                <time>{new Date(log.created_at).toLocaleDateString()}</time>
              </div>
            ))}
          </div>
        </article>
      </section>

      <footer className="footer">
        <span><span className="live-dot" /> Connected to Backend (SQLite for development)</span>
        <span>Auditor access is read-only. All actions are recorded in immutable audit logs.</span>
      </footer>
    </div>
  )
}
