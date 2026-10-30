/**
 * Admin dashboard: system overview, user management summary, fraud-risk summary and recent activity.
 * Data comes only from the existing API (users, audit logs, transactions, dashboard stats).
 */
import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, FileText, MapPin, Settings, ShieldAlert, UserCheck, UserPlus, Users } from 'lucide-react'
import { api, type AuditRecord, type CurrentUser, type DashboardStats, type TransactionRecord, type UserRecord } from '../lib/api'
import RiskDonut from './RiskDonut'
import AddParcelModal from './AddParcelModal'
import AddUserModal from './AddUserModal'

import {
  EmptyState, ErrorNote, LoadingRows, MonthlyChart, PageHeader, Panel, RiskBadge, StatCard,
  formatDateTime, humanize, monthlySeries,
} from './ui'

const roleOf = (u: UserRecord) => u.roles[0]?.name ?? 'Unassigned'
const ROLE_FILTERS = [
  { value: 'ALL', label: 'All users' },
  { value: 'OFFICER', label: 'Officers' },
  { value: 'AUDITOR', label: 'Auditors' },
  { value: 'ADMIN', label: 'Admins' },
]

export default function AdminDashboard({
  stats, onNavigate,
}: { stats: DashboardStats; currentUser?: CurrentUser | null; onNavigate: (page: string) => void }) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [audit, setAudit] = useState<AuditRecord[]>([])
  const [txs, setTxs] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string[]>([])
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [showAddParcel, setShowAddParcel] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.allSettled([api.users(), api.audit(), api.transactions()]).then(([u, a, t]) => {
      const problems: string[] = []
      if (u.status === 'fulfilled') setUsers(u.value); else problems.push('users')
      if (a.status === 'fulfilled') setAudit(a.value.slice(0, 8)); else problems.push('system activity')
      if (t.status === 'fulfilled') setTxs(t.value); else problems.push('transactions')
      setFailed(problems)
      setLoading(false)
    })
  }, [])
  useEffect(() => { load() }, [load])

  const activeUsers = users.filter((u) => u.is_active).length
  const visibleUsers = users.filter((u) => roleFilter === 'ALL' || roleOf(u) === roleFilter)
  const riskTotal = stats.low_risk_transactions + stats.medium_risk_transactions + stats.high_risk_transactions

  return (
    <div className="lg-page">
      <PageHeader
        title="Admin dashboard"
        subtitle="System overview and key statistics"
        actions={
          <>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowAddParcel(true)}><MapPin size={15} /> Add parcel</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowAddUser(true)}><UserPlus size={15} /> Add user</button>
            <button type="button" className="btn-primary btn-sm" onClick={() => onNavigate('User Management')}><Users size={15} /> Manage users</button>
          </>
        }
      />


      {failed.length > 0 && <ErrorNote message={`Could not load ${failed.join(', ')}. Check that the backend is running.`} onRetry={load} />}

      <div className="lg-stats">
        <StatCard icon={Users} tone="blue" label="Total users" value={loading ? '–' : users.length} hint={loading ? undefined : `${activeUsers} active`} onClick={() => onNavigate('User Management')} />
        <StatCard icon={FileText} tone="green" label="Total transactions" value={stats.total_transactions} hint={`${stats.total_parcels} parcels, ${stats.total_owners} owners`} onClick={() => onNavigate('Transactions')} />
        <StatCard icon={UserCheck} tone="amber" label="Pending reviews" value={stats.transactions_under_review} hint="Open case reviews" onClick={() => onNavigate('Transactions')} />
        <StatCard icon={ShieldAlert} tone="red" label="High-risk alerts" value={stats.high_risk_transactions} hint="Transactions at high risk" onClick={() => onNavigate('Transactions')} />
      </div>

      <div className="lg-row lg-row--wide-left">
        <Panel title="Transactions overview" subtitle="Six months of recorded activity" action={<button type="button" className="lg-link" onClick={() => onNavigate('Transactions')}>View transactions</button>}>
          {loading ? <LoadingRows rows={5} /> : <MonthlyChart data={monthlySeries(txs)} />}
        </Panel>

        <Panel title="Fraud-risk summary" subtitle="Latest AI risk level per transaction" action={<button type="button" className="lg-link" onClick={() => onNavigate('Reports')}>Reports</button>}>
          {riskTotal === 0
            ? <EmptyState title="No risk analyses yet" text="Run a risk analysis on a transaction to see the split." />
            : <RiskDonut low={stats.low_risk_transactions} medium={stats.medium_risk_transactions} high={stats.high_risk_transactions} total={riskTotal} />}
          <ul className="lg-list" style={{ marginTop: 16 }}>
            {stats.recent_alerts.slice(0, 3).map((alert) => (
              <li key={alert.id}>
                <span className="lg-list__dot lg-tone--red"><AlertTriangle size={15} aria-hidden="true" /></span>
                <span className="lg-list__main"><strong>{alert.id}</strong><small>{alert.title}</small></span>
                <RiskBadge level={alert.risk} />
              </li>
            ))}
          </ul>
          {stats.recent_alerts.length === 0 && riskTotal > 0 && <p className="lg-stat__hint" style={{ marginTop: 12 }}>No open case reviews right now.</p>}
        </Panel>
      </div>

      <div className="lg-row lg-row--wide-left">
        <Panel title="Officers, auditors and admins" subtitle="Accounts with access to the system" action={<button type="button" className="lg-link" onClick={() => onNavigate('User Management')}>Manage users</button>}>
          <div className="lg-chips" role="group" aria-label="Filter users by role">
            {ROLE_FILTERS.map((f) => {
              const count = f.value === 'ALL' ? users.length : users.filter((u) => roleOf(u) === f.value).length
              return <button key={f.value} type="button" className="lg-chip" aria-pressed={roleFilter === f.value} onClick={() => setRoleFilter(f.value)}>{f.label} ({count})</button>
            })}
          </div>
          {loading ? <LoadingRows /> : visibleUsers.length === 0 ? (
            <EmptyState title="No users to show" text="Try another role filter." />
          ) : (
            <div className="lg-table-wrap">
              <table className="lg-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>
                  {visibleUsers.slice(0, 6).map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.full_name}</strong>{u.username && <small>{u.username}</small>}</td>
                      <td>{u.email}</td>
                      <td>{humanize(roleOf(u))}</td>
                      <td><span className={`lg-badge lg-badge--${u.is_active ? 'green' : 'red'}`}>{u.is_active ? 'Active' : 'Revoked'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Recent system activity" subtitle="Latest entries in the audit trail" action={<button type="button" className="lg-link" onClick={() => onNavigate('Audit Logs')}>Audit logs</button>}>
          {loading ? <LoadingRows rows={5} /> : audit.length === 0 ? (
            <EmptyState title="No activity recorded yet" />
          ) : (
            <ul className="lg-list">
              {audit.map((log) => (
                <li key={log.id}>
                  <span className="lg-list__dot lg-tone--blue"><Activity size={15} aria-hidden="true" /></span>
                  <span className="lg-list__main">{humanize(log.action)} on {log.entity} {log.entity_id ?? ''}<small>{log.user_name ?? 'System'}</small></span>
                  <time dateTime={log.created_at}>{formatDateTime(log.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <footer className="lg-note">
        <span>Settings and system parameters: <button type="button" className="lg-link" onClick={() => onNavigate('System Settings')}><Settings size={13} style={{ verticalAlign: '-2px' }} /> System settings</button></span>
        <span>Decision support only. AI predictions do not replace official Rwandan land authorities.</span>
      </footer>

      {showAddParcel && <AddParcelModal onClose={() => setShowAddParcel(false)} onCreated={load} />}
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onCreated={load} />}
    </div>
  )
}

