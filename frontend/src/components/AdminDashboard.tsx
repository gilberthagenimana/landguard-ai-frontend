/**
 * Admin Dashboard — system overview, user management, and monitoring.
 */
import { useEffect, useState } from 'react'
import { Users, FileText, FolderOpen, Activity, ShieldCheck, UserCheck, UserX, AlertTriangle } from 'lucide-react'
import { api, type DashboardStats, type UserRecord, type AuditRecord } from '../lib/api'

export default function AdminDashboard({ stats, currentUser }: { stats: DashboardStats; currentUser: any }) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.users(), api.audit()])
      .then(([u, a]) => { setUsers(u); setAuditLogs(a.slice(0, 10)) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const activeUsers = users.filter(u => u.is_active).length
  const officers = users.filter(u => u.roles[0]?.name === 'OFFICER').length
  const auditors = users.filter(u => u.roles[0]?.name === 'AUDITOR').length

  return (
    <div>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Republic of Rwanda — Land Administration</p>
          <h1>Administration & Security Console</h1>
          <p className="heading-subtitle">Manage user authorizations, inspect system audit logs, and monitor cadastre operations.</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Admin metrics">
        <div className="metric-card">
          <div className="metric-icon metric-icon--blue"><Users size={17} /></div>
          <div className="metric-info"><span>Total Users</span><strong>{users.length}</strong></div>
        </div>
        <div className="metric-card">
          <div className="metric-icon metric-icon--green"><UserCheck size={17} /></div>
          <div className="metric-info"><span>Active Users</span><strong>{activeUsers}</strong></div>
        </div>
        <div className="metric-card">
          <div className="metric-icon metric-icon--violet"><ShieldCheck size={17} /></div>
          <div className="metric-info"><span>Officers</span><strong>{officers}</strong></div>
        </div>
        <div className="metric-card">
          <div className="metric-icon metric-icon--amber"><FileText size={17} /></div>
          <div className="metric-info"><span>Transactions</span><strong>{stats.total_transactions}</strong></div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">User Management</p>
              <h2>Authorized Personnel</h2>
            </div>
          </div>
          {loading ? (
            <p style={{ color: '#888', fontSize: '12px' }}>Loading users...</p>
          ) : (
            <div className="reference-table">
              <div className="reference-header">
                <span>USERNAME</span>
                <span>EMAIL</span>
                <span>ROLE</span>
                <span>STATUS</span>
              </div>
              {users.map((user) => (
                <div className="reference-row" key={user.id}>
                  <strong>{user.username}</strong>
                  <span>{user.email}</span>
                  <span className="status-label">{user.roles[0]?.name}</span>
                  <span className={user.is_active ? 'status-label risk-label--low' : 'status-label risk-label--high'}>
                    {user.is_active ? 'Active' : 'Revoked'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Recent Activity</p>
              <h2>Audit Trail</h2>
            </div>
          </div>
          <div className="activity-list">
            {auditLogs.map((log, i) => (
              <div className="activity-item" key={i}>
                <div className="activity-icon activity-icon--green"><Activity size={14} /></div>
                <span>{log.action} on {log.entity} {log.entity_id || ''}</span>
                <time>{new Date(log.created_at).toLocaleString()}</time>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="risk-row">
        <div className="risk-card risk-card--low">
          <div className="risk-card-top">
            <div><span>Low Risk</span><strong>{stats.low_risk_transactions}</strong></div>
            <div className="risk-card-icon"><ShieldCheck size={16} /></div>
          </div>
        </div>
        <div className="risk-card risk-card--medium">
          <div className="risk-card-top">
            <div><span>Medium Risk</span><strong>{stats.medium_risk_transactions}</strong></div>
            <div className="risk-card-icon"><AlertTriangle size={16} /></div>
          </div>
        </div>
        <div className="risk-card risk-card--high">
          <div className="risk-card-top">
            <div><span>High Risk</span><strong>{stats.high_risk_transactions}</strong></div>
            <div className="risk-card-icon"><AlertTriangle size={16} /></div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span><span className="live-dot" /> Connected to Backend (SQLite for development)</span>
        <span>Decision support system only. AI predictions do not replace official Rwandan land authorities.</span>
      </footer>
    </div>
  )
}
