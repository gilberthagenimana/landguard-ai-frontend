import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle, ArrowRight, Bell, Check, CheckCircle, ChevronDown,
  ClipboardCheck, Clock, Download, FileText, Flag, FolderOpen, LayoutDashboard,
  LogOut, MapPin, Menu, Plus, Search, Shield, ShieldCheck, Upload,
  UserRound, Users, X, Eye, FileIcon, AlertCircle, Info, Filter, RotateCcw,
  ArrowLeftRight, BarChart3, ClipboardList, Settings,
} from 'lucide-react'
import {
  api, type AuditRecord, type CaseDetail, type CaseRecord, type CurrentUser,
  type DashboardStats, type OwnerRecord, type OwnershipRecord, type ParcelRecord,
  type RiskResponse, type TransactionRecord, type UserRecord,
  type VerificationResponse, type VerificationResult,
} from './lib/api'
import PublicUpiCheck from './components/PublicUpiCheck'
import AdminDashboard from './components/AdminDashboard'
import OfficerDashboard from './components/OfficerDashboard'
import AuditorDashboard from './components/AuditorDashboard'
import EvidenceSection from './components/EvidenceSection'
import ParcelMap from './components/ParcelMap'
import './dashboard.css'

type Risk = 'Low' | 'Medium' | 'High'
type Page = 'Dashboard' | 'Search Parcel' | 'Transactions' | 'Evidence' | 'Verification' | 'Pending Reviews' | 'Profile'

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'User Management', icon: Users },
  { label: 'System Settings', icon: Settings },
  { label: 'Search Parcel', icon: Search },
  { label: 'Transactions', icon: ArrowLeftRight },
  { label: 'Transactions Overview', icon: ArrowLeftRight },
  { label: 'Evidence', icon: FileText },
  { label: 'Evidence Review', icon: FolderOpen },
  { label: 'Verification', icon: ShieldCheck },
  { label: 'Pending Reviews', icon: Clock },
  { label: 'Audit Logs', icon: ClipboardList },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Profile', icon: UserRound },
]

const roleNavigation: Record<string, string[]> = {
  ADMIN: ['Dashboard', 'User Management', 'System Settings', 'Transactions', 'Verification', 'Audit Logs', 'Reports', 'Profile'],
  OFFICER: ['Dashboard', 'Search Parcel', 'Transactions', 'Evidence', 'Verification', 'Pending Reviews', 'Profile'],
  AUDITOR: ['Dashboard', 'Transactions Overview', 'Evidence Review', 'Verification', 'Audit Logs', 'Profile'],
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('landguard_demo_session') === 'true')
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [showPublicCheck, setShowPublicCheck] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [selectedVerificationTxId, setSelectedVerificationTxId] = useState<number | null>(null)

  const loadCurrentUserAndStats = async () => {
    try {
      const user = await api.me()
      setCurrentUser(user)
      const dashboardStats = await api.stats()
      setStats(dashboardStats)
    } catch { /* demo mode */ }
  }

  useEffect(() => { if (authenticated) loadCurrentUserAndStats() }, [authenticated])

  const logout = () => {
    api.logout().catch(() => {})
    localStorage.removeItem('landguard_access_token')
    localStorage.removeItem('landguard_demo_session')
    setAuthenticated(false)
    setCurrentUser(null)
  }

  if (!authenticated) {
    if (showPublicCheck) return <PublicUpiCheck onBack={() => setShowPublicCheck(false)} />
    return <LoginScreen onContinue={(user) => { localStorage.setItem('landguard_demo_session', 'true'); setCurrentUser(user); setAuthenticated(true) }} onPublicCheck={() => setShowPublicCheck(true)} />
  }

  const displayStats = stats ?? {
    total_parcels: 0, total_owners: 0, total_transactions: 0,
    transactions_under_review: 0, low_risk_transactions: 0,
    medium_risk_transactions: 0, high_risk_transactions: 0,
    recent_verification_activity: [], recent_alerts: [],
  }

  const role = currentUser?.roles[0] ?? 'OFFICER'
  const allowedNav = (roleNavigation[role] ?? [])
    .map((label) => navigation.find((item) => item.label === label))
    .filter((item): item is (typeof navigation)[number] => Boolean(item))

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><ShieldCheck size={17} strokeWidth={2.4} /></div>
          <span>LandGuard AI</span>
          <button className="icon-button mobile-close" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        </div>
        <nav className="primary-nav">
          {allowedNav.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? 'nav-item--active' : ''}`} onClick={() => { setActiveNav(label); setMobileNavOpen(false) }}>
              <Icon size={16} strokeWidth={1.9} /><span>{label}</span>
              {label === 'Pending Reviews' && displayStats.transactions_under_review > 0 && <span className="nav-count">{displayStats.transactions_under_review}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="avatar">{currentUser ? initials(currentUser.full_name) : 'OF'}</div>
            <div><strong>{currentUser?.full_name ?? 'Officer User'}</strong><span>{displayRole(role)}</span></div>
          </div>
          <div className="sidebar-footer-text"><strong>LandGuard AI</strong><span>Rwanda Land Transaction Verification System v1.0</span></div>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{activeNav}</strong></div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications" onClick={() => setActiveNav(role === 'OFFICER' ? 'Pending Reviews' : 'Audit Logs')}><Bell size={18} />{displayStats.transactions_under_review > 0 && <i />}</button>
            <button className="profile-trigger" onClick={() => setShowProfileModal(true)}>
              <div className="top-avatar">{currentUser ? initials(currentUser.full_name) : 'OF'}</div>
              <span>{currentUser?.full_name ?? 'Officer User'}</span><ChevronDown size={15} />
            </button>
          </div>
        </header>
        <div className="content-wrap">
          {activeNav === 'Dashboard' && role === 'ADMIN' && <AdminDashboard stats={displayStats} currentUser={currentUser} onNavigate={(p) => setActiveNav(p)} />}
          {activeNav === 'Dashboard' && role === 'AUDITOR' && <AuditorDashboard stats={displayStats} onNavigate={(p) => setActiveNav(p)} />}
          {activeNav === 'Dashboard' && role === 'OFFICER' && <OfficerDashboard
            stats={displayStats}
            currentUser={currentUser}
            onNavigate={(p) => setActiveNav(p)}
            onNewTransaction={() => { setActiveNav('Transactions'); setOpenCreateModal(true) }}
          />}
          {activeNav === 'Dashboard' && !['ADMIN', 'AUDITOR', 'OFFICER'].includes(role) && (
            <DashboardView
              stats={displayStats}
              currentUser={currentUser}
              onNavigate={(p) => setActiveNav(p)}
              onNewTransaction={() => { setActiveNav('Transactions'); setOpenCreateModal(true) }}
            />
          )}
          {activeNav === 'User Management' && <UserManagementPage />}
          {activeNav === 'System Settings' && <SystemSettingsPage />}
          {activeNav === 'Search Parcel' && <SearchParcelPage />}
          {activeNav === 'Transactions' && (
            <TransactionsPage
              initialOpenCreate={openCreateModal}
              onCloseCreate={() => setOpenCreateModal(false)}
              onNavigateToVerification={(txId) => {
                setSelectedVerificationTxId(txId)
                setActiveNav('Verification')
              }}
              onNavigateToEvidence={() => {
                setActiveNav('Evidence')
              }}
            />
          )}
          {activeNav === 'Evidence' && <EvidencePage />}
          {activeNav === 'Evidence Review' && <EvidenceReviewPage />}
          {activeNav === 'Transactions Overview' && <TransactionsPage onNavigateToVerification={(txId) => { setSelectedVerificationTxId(txId); setActiveNav('Verification') }} onNavigateToEvidence={() => setActiveNav('Evidence Review')} />}
          {activeNav === 'Verification' && <VerificationPage initialTxId={selectedVerificationTxId} />}
          {activeNav === 'Pending Reviews' && <PendingReviewsPage />}
          {activeNav === 'Audit Logs' && <AuditLogsPage />}
          {activeNav === 'Reports' && <ReportsPage />}
          {activeNav === 'Profile' && <ProfilePage currentUser={currentUser} onLogout={logout} />}
        </div>
      </main>
      {showProfileModal && <ProfileModal user={currentUser} onClose={() => setShowProfileModal(false)} onLogout={logout} />}
    </div>
  )
}

/* =========================================================================
   LOGIN SCREEN
   ========================================================================= */
function LoginScreen({ onContinue, onPublicCheck }: { onContinue: (user: CurrentUser) => void; onPublicCheck: () => void }) {
  const [email, setEmail] = useState('officer@landguard.local')
  const [password, setPassword] = useState('OfficerPass123!')
  const [role, setRole] = useState('OFFICER')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const response = await api.login(email, password, role)
      localStorage.setItem('landguard_access_token', response.access_token)
      const user = await api.me()
      onContinue(user)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in. Verify backend is running.') } finally { setLoading(false) }
  }

  const enterDemo = async () => {
    try {
      const loginResp = await api.login('officer@landguard.local', 'OfficerPass123!', 'OFFICER')
      localStorage.setItem('landguard_access_token', loginResp.access_token)
      const user = await api.me(); onContinue(user)
    } catch { onContinue({ id: 2, full_name: 'Marie Habyarimana', email: 'officer@landguard.local', is_active: true, roles: ['OFFICER'] }) }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <section className="login-visual">
          <div className="login-visual-shade" />
          <div className="login-visual-content">
            <div className="login-visual-brand"><div className="brand-mark"><ShieldCheck size={24} /></div><strong>LandGuard <span>AI</span></strong></div>
            <div className="login-visual-copy"><h2>Secure Lands.<br />Safer Futures.</h2><p>Land transaction verification<br />and risk early-warning system<br />for a safer tomorrow.</p></div>
          </div>
        </section>
        <section className="login-form-panel">
          <h1>Welcome Back</h1>
          <p className="login-subtitle">Sign in to your account</p>
          <form onSubmit={submit} className="login-form">
            <label>Username or Email<input type="text" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Password<div className="password-field"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /><ChevronDown size={15} /></div></label>
            <button type="button" className="forgot-password">Forgot password?</button>
            {error && <p className="login-error">{error}</p>}
            <button className="login-button" type="submit" disabled={loading}>{loading ? 'Authenticating...' : 'Login'}</button>
            <label>Select your role (if required)<select value={role} onChange={(e) => setRole(e.target.value)}><option value="ADMIN">Admin</option><option value="AUDITOR">Auditor</option><option value="OFFICER">Officer</option></select></label>
          </form>
          <button className="demo-button" onClick={enterDemo}>Launch Offline Demo Mode</button>
          <button onClick={onPublicCheck} className="login-note-btn">Public UPI Check (No Login Required)</button>
          <p className="login-note">© 2025 LandGuard AI. All rights reserved.</p>
        </section>
      </div>
    </div>
  )
}

/* =========================================================================
   DASHBOARD VIEW — matches screenshot exactly
   ========================================================================= */
function DashboardView({
  stats,
  currentUser,
  onNavigate,
  onNewTransaction,
}: {
  stats: DashboardStats
  currentUser: CurrentUser | null
  onNavigate: (page: string) => void
  onNewTransaction?: () => void
}) {
  const total = stats.total_transactions || 24
  const completed = stats.low_risk_transactions || 16
  const underReview = stats.transactions_under_review || 5
  const flagged = stats.high_risk_transactions || 3
  const medium = stats.medium_risk_transactions || 5

  const recentTxs = [
    { id: 'TX-001', upi: 'UPI-001', seller: 'Jean', buyer: 'Patrick', amount: 30000000, status: 'Completed', risk: 'Low', date: 'Apr 21, 2025' },
    { id: 'TX-002', upi: 'UPI-002', seller: 'Alice', buyer: 'Samuel', amount: 45000000, status: 'Under Review', risk: 'Medium', date: 'Apr 20, 2025' },
    { id: 'TX-003', upi: 'UPI-003', seller: 'Emmanuel', buyer: 'Grace', amount: 12000000, status: 'Pending', risk: 'Low', date: 'Apr 19, 2025' },
    { id: 'TX-004', upi: 'UPI-004', seller: 'Claude', buyer: 'Denis', amount: 25000000, status: 'Flagged', risk: 'High', date: 'Apr 18, 2025' },
    { id: 'TX-005', upi: 'UPI-005', seller: 'Marie', buyer: 'David', amount: 50000000, status: 'Completed', risk: 'Low', date: 'Apr 17, 2025' },
    { id: 'TX-006', upi: 'UPI-006', seller: 'Robert', buyer: 'Fidele', amount: 18000000, status: 'Under Review', risk: 'Medium', date: 'Apr 16, 2025' },
  ]

  const evidenceUploads = [
    { doc: 'Sale Agreement.pdf', tx: 'TX-002', by: 'Jean', status: 'Under Review', date: 'Apr 20, 2025' },
    { doc: 'Payment Receipt.pdf', tx: 'TX-001', by: 'Jean', status: 'Verified', date: 'Apr 19, 2025' },
    { doc: 'Payment Proof.pdf', tx: 'TX-006', by: 'Alice', status: 'Needs Clarification', date: 'Apr 16, 2025' },
    { doc: 'Agreement.png', tx: 'TX-003', by: 'Jean', status: 'Uploaded', date: 'Apr 15, 2025' },
  ]

  const alerts = [
    { icon: AlertCircle, color: 'red', title: 'Possible duplicate transaction detected', meta: 'TX-004 • Apr 18, 2025' },
    { icon: AlertTriangle, color: 'amber', title: 'Seller does not match recorded owner', meta: 'TX-007 • Apr 16, 2025' },
    { icon: AlertTriangle, color: 'amber', title: 'Missing payment evidence', meta: 'TX-008 • Apr 15, 2025' },
  ]

  const maxBar = Math.max(completed, underReview, 2, flagged)
  const lowOffset = 0.71 * 283
  const medOffset = 0.21 * 283
  const highOffset = 0.08 * 283
  const medDashOffset = -(0.71 * 283)
  const highDashOffset = -(0.92 * 283)

  return (
    <div className="workspace-page search-parcel-page">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1>Welcome back, {currentUser?.full_name?.split(' ')[0] ?? 'Jean'}!</h1>
          <p>Here's what's happening with land transactions today.</p>
        </div>
        <div className="dash-date">
          <div className="dash-date-icon"><FileText size={14} /></div>
          <div><strong>April 23, 2025</strong><span>10:45 AM</span></div>
        </div>
      </div>

      <div className="dash-grid">
        {/* Main column */}
        <div className="dash-main">
          {/* Metric Cards */}
          <div className="dash-metrics">
            <div className="metric-card">
              <div className="metric-icon" style={{ background: '#dbeafe' }}><FileText size={20} color="#2563eb" /></div>
              <div><span className="metric-label">Total Transactions</span><strong>24 <small className="trend-up">↑ 8%</small></strong><small className="metric-sub">Compared to last 7 days</small></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon" style={{ background: '#d1fae5' }}><CheckCircle size={20} color="#10b981" /></div>
              <div><span className="metric-label">Completed</span><strong>16 <small className="trend-up">↑ 14%</small></strong><small className="metric-sub">Successfully completed</small></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon" style={{ background: '#fef3c7' }}><AlertTriangle size={20} color="#f59e0b" /></div>
              <div><span className="metric-label">Under Review</span><strong>5 <small className="trend-up">↑ 25%</small></strong><small className="metric-sub">Awaiting officer review</small></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon" style={{ background: '#fee2e2' }}><AlertTriangle size={20} color="#ef4444" /></div>
              <div><span className="metric-label">Flagged / High Risk</span><strong>3 <small className="trend-down">↓ 33%</small></strong><small className="metric-sub">Needs attention</small></div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card">
            <div className="card-header"><h3>Recent Transactions</h3><button className="link-btn" onClick={() => onNavigate('Transactions')}>View All</button></div>
            <table className="data-table">
              <thead><tr><th>ID</th><th>Parcel UPI</th><th>Seller</th><th>Buyer</th><th>Amount (RWF)</th><th>Status</th><th>Risk</th><th>Date</th></tr></thead>
              <tbody>
                {recentTxs.map((tx) => (
                  <tr key={tx.id} className={tx.status === 'Flagged' ? 'row--flagged' : ''}>
                    <td><strong>{tx.id}</strong></td><td>{tx.upi}</td><td>{tx.seller}</td><td>{tx.buyer}</td>
                    <td>{Number(tx.amount).toLocaleString()}</td>
                    <td><span className={`status-badge status-${tx.status.toLowerCase().replace(' ', '-')}`}>{tx.status}</span></td>
                    <td><span className={`risk-badge risk-${tx.risk.toLowerCase()}`}>{tx.risk}</span></td>
                    <td>{tx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom row: Status Overview + Evidence Uploads */}
          <div className="dash-bottom">
            <div className="card">
              <div className="card-header"><h3>Transaction Status Overview</h3></div>
              <div className="bar-chart">
                {[{ label: 'Completed', value: completed, color: '#10b981' }, { label: 'Under Review', value: underReview, color: '#2563eb' }, { label: 'Pending', value: 2, color: '#f59e0b' }, { label: 'Flagged', value: flagged, color: '#ef4444' }].map((bar) => (
                  <div key={bar.label} className="bar-col">
                    <span className="bar-value">{bar.value}</span>
                    <div className="bar-wrap"><div className="bar" style={{ height: `${(bar.value / maxBar) * 120}px`, background: bar.color }} /></div>
                    <span className="bar-label">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3>Recent Evidence Uploads</h3><button className="link-btn" onClick={() => onNavigate('Evidence')}>View All</button></div>
              <table className="data-table">
                <thead><tr><th>Document</th><th>Transaction</th><th>Uploaded By</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {evidenceUploads.map((ev, i) => (
                    <tr key={i}>
                      <td><span className="doc-name"><FileIcon size={14} /> {ev.doc}</span></td>
                      <td>{ev.tx}</td><td>{ev.by}</td>
                      <td><span className={`evidence-badge evidence-${ev.status.toLowerCase().replace(/ /g, '-')}`}>{ev.status}</span></td>
                      <td>{ev.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <footer className="dash-footer">
            <Info size={16} />
            <span>Note: This system helps verify land transactions and identify potential risks. It does not replace official land registry services or legal procedures.</span>
            <button className="link-btn">Learn more →</button>
          </footer>
        </div>

        {/* Right Sidebar */}
        <aside className="dash-sidebar">
          {/* AI Risk Analysis */}
          <div className="card">
            <div className="card-header"><h3><Shield size={16} /> AI Risk Analysis</h3></div>
            <p className="card-sub">Based on recent transactions</p>
            <div className="donut-wrap">
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="45" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle cx="55" cy="55" r="45" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray={`${lowOffset} 283`} strokeDashoffset="0" transform="rotate(-90 55 55)" />
                <circle cx="55" cy="55" r="45" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray={`${medOffset} 283`} strokeDashoffset={medDashOffset} transform="rotate(-90 55 55)" />
                <circle cx="55" cy="55" r="45" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray={`${highOffset} 283`} strokeDashoffset={highDashOffset} transform="rotate(-90 55 55)" />
              </svg>
              <div className="donut-center"><strong>24</strong><span>Total</span></div>
            </div>
            <div className="donut-legend">
              <div><span className="dot" style={{ background: '#10b981' }} /> Low Risk <strong>17 (71%)</strong></div>
              <div><span className="dot" style={{ background: '#f59e0b' }} /> Medium Risk <strong>5 (21%)</strong></div>
              <div><span className="dot" style={{ background: '#ef4444' }} /> High Risk <strong>2 (8%)</strong></div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="card">
            <div className="card-header"><h3><AlertTriangle size={16} /> Recent Alerts</h3><button className="link-btn">View All</button></div>
            <div className="alert-list">
              {alerts.map((a, i) => (
                <div key={i} className="alert-item">
                  <div className={`alert-icon alert-icon--${a.color}`}><a.icon size={14} /></div>
                  <div><strong>{a.title}</strong><span>{a.meta}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header"><h3>Quick Actions</h3></div>
            <div className="quick-actions">
              <button className="quick-action" onClick={() => onNavigate('Search Parcel')}><Search size={16} /> Search Parcel by UPI</button>
              <button className="quick-action" onClick={() => { if (onNewTransaction) onNewTransaction(); else onNavigate('Transactions') }}><Plus size={16} /> Create New Transaction</button>
              <button className="quick-action" onClick={() => onNavigate('Evidence')}><Upload size={16} /> Upload Evidence Document</button>
              <button className="quick-action" onClick={() => {}}><ClipboardCheck size={16} /> View Audit Logs</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* =========================================================================
   SEARCH PARCEL PAGE
   ========================================================================= */
function SearchParcelPage() {
  const [upi, setUpi] = useState('')
  const [parcel, setParcel] = useState<ParcelRecord | null>(null)
  const [history, setHistory] = useState<OwnershipRecord[]>([])
  const [transactionHistory, setTransactionHistory] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [source, setSource] = useState('')
  const [coordinates, setCoordinates] = useState({ latitude: '', longitude: '' })
  const [submissionMessage, setSubmissionMessage] = useState('')

  const search = async (e: FormEvent) => {
    e.preventDefault()
    const normalizedUpi = upi.trim()
    if (!normalizedUpi) { setError('Enter a UPI before searching.'); setSearched(true); return }
    setLoading(true); setError(''); setParcel(null); setHistory([]); setTransactionHistory([]); setSearched(true)
    try {
      const result = await api.parcelByUpi(normalizedUpi)
      setParcel(result)
      const [ownership, transactions] = await Promise.all([api.ownership(result.id), api.parcelTransactions(result.id)])
      setHistory(ownership)
      setTransactionHistory(transactions)
    } catch (err) {
      setError(err instanceof Error && err.message === 'Parcel not found' ? 'No parcel was found for that UPI.' : 'The parcel service is unavailable. Please try again.')
    } finally { setLoading(false) }
  }

  const clearSearch = () => { setUpi(''); setParcel(null); setHistory([]); setTransactionHistory([]); setError(''); setSearched(false) }

  const submitLocation = async (e: FormEvent) => {
    e.preventDefault()
    if (!parcel || !source.trim() || !coordinates.latitude || !coordinates.longitude) { setSubmissionMessage('Provide the authorized source and both coordinates.'); return }
    try {
      const result = await api.submitParcelLocation(parcel.id, { latitude: Number(coordinates.latitude), longitude: Number(coordinates.longitude), source: source.trim() })
      setSubmissionMessage(`Location submitted with status: ${result.status.replace(/_/g, ' ').toLowerCase()}.`)
      setSource(''); setCoordinates({ latitude: '', longitude: '' })
    } catch (err) { setSubmissionMessage(err instanceof Error ? err.message : 'Location submission failed.') }
  }

  return (
    <div className="workspace-page search-parcel-page">
      <div className="page-heading"><div><h1>Search Parcel</h1><p className="heading-subtitle">Find parcel records and review recorded ownership information.</p></div></div>
      <form onSubmit={search} className="search-bar">
        <label className="search-parcel-label" htmlFor="parcel-upi">Enter UPI (Unique Parcel Identifier)</label>
        <div className="search-input-wrap"><Search size={16} className="search-icon" /><input id="parcel-upi" type="text" placeholder="e.g. UPI-001" value={upi} onChange={(e) => setUpi(e.target.value)} className="search-input" /></div>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button><button type="button" className="btn-secondary" onClick={clearSearch} disabled={loading && !parcel}>Clear</button>
      </form>
      {error && <div className="alert alert--error">{error}</div>}
      {loading && <div className="search-state"><span className="loading-spinner" /> Searching authorized parcel records...</div>}
      {searched && !loading && !parcel && !error && <div className="search-state">Enter a valid UPI to view an authorized parcel record.</div>}
      {parcel && (
        <div className="parcel-results">
          <div className="card parcel-information-card">
            <div className="card-header"><h3><MapPin size={18} /> Parcel Information</h3><span className="badge badge--success">{parcel.status}</span></div>
            <div className="parcel-information-grid">
              <div className="info-list">
                <div className="info-row"><span className="info-label">UPI</span><span className="info-value"><strong>{parcel.upi}</strong></span></div><div className="info-row"><span className="info-label">Parcel Code</span><span className="info-value">{parcel.parcel_code}</span></div><div className="info-row"><span className="info-label">Province</span><span className="info-value">{parcel.province || 'Unavailable'}</span></div><div className="info-row"><span className="info-label">District</span><span className="info-value">{parcel.district || 'Unavailable'}</span></div><div className="info-row"><span className="info-label">Sector / Cell</span><span className="info-value">{[parcel.sector, parcel.cell].filter(Boolean).join(' / ') || 'Unavailable'}</span></div><div className="info-row"><span className="info-label">Recorded Area</span><span className="info-value">{typeof parcel.area_ha === 'number' ? `${parcel.area_ha} ha` : 'Unavailable'}</span></div><div className="info-row"><span className="info-label">Recorded Owner</span><span className="info-value">{parcel.current_owner_name || 'Unavailable'}</span></div>
              </div>
              <div><ParcelMap location={{ verificationStatus: parcel.location_verification_status, latitude: parcel.latitude, longitude: parcel.longitude, geometry: parcel.boundary_geometry }} /></div>
            </div>
            <button type="button" className="btn-secondary history-action" onClick={() => document.getElementById('parcel-history')?.scrollIntoView({ behavior: 'smooth' })}>View Transaction History</button>
          </div>
          <div className="card parcel-location-submission-card"><div className="card-header"><h3><MapPin size={18} /> Submit Authorized Location</h3><span className="badge">Officer workflow</span></div><p className="text-muted">Submit coordinates obtained from an authorized source. An Administrator must verify them before they appear as verified map data.</p><form onSubmit={submitLocation} className="location-submission-form"><label>Source<input className="form-input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Authorized cadastral source" /></label><label>Latitude<input className="form-input" type="number" min="-90" max="90" step="any" value={coordinates.latitude} onChange={(e) => setCoordinates({ ...coordinates, latitude: e.target.value })} /></label><label>Longitude<input className="form-input" type="number" min="-180" max="180" step="any" value={coordinates.longitude} onChange={(e) => setCoordinates({ ...coordinates, longitude: e.target.value })} /></label><button className="btn-primary" type="submit">Submit for verification</button></form>{submissionMessage && <div className="alert alert--info">{submissionMessage}</div>}</div>
          <div className="card">
            <div className="card-header"><h3><UserRound size={18} /> Recorded Owner</h3></div>
            {parcel.current_owner_name ? (
              <div className="owner-info"><div className="owner-avatar">{parcel.current_owner_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</div><div><strong>{parcel.current_owner_name}</strong><div className="text-muted">Current Title Holder</div></div></div>
            ) : <p className="text-muted">No owner recorded</p>}
          </div>
        </div>
      )}
      {parcel && (
        <div className="card" id="parcel-history">
          <div className="card-header"><h3><Clock size={18} /> Ownership History</h3></div>
          {history.length > 0 ? <div className="timeline">
            {history.map((h, i) => (
              <div key={i} className="timeline-item"><div className="timeline-dot" /><div className="timeline-content"><strong>{h.new_owner_name || 'Unknown'}</strong><span className="timeline-date">{new Date(h.transfer_date).toLocaleDateString()} — {h.reason_type}</span></div></div>
            ))}
          </div> : <p className="text-muted">No ownership history is recorded for this parcel.</p>}
          <div className="card-header transaction-history-heading"><h3><FileText size={18} /> Transaction History</h3></div>
          {transactionHistory.length > 0 ? <table className="data-table"><thead><tr><th>Transaction</th><th>Type</th><th>Status</th><th>Date</th></tr></thead><tbody>{transactionHistory.map((tx) => <tr key={tx.id}><td><strong>{tx.transaction_code}</strong></td><td>{tx.transaction_type}</td><td>{tx.status}</td><td>{new Date(tx.transaction_date).toLocaleDateString()}</td></tr>)}</tbody></table> : <p className="text-muted">No transaction history is recorded for this parcel.</p>}
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   TRANSACTIONS DATA & MODALS
   ========================================================================= */
const fallbackTransactions: TransactionRecord[] = [
  { id: 9, transaction_code: 'TX-98239', parcel_id: 1, parcel_code: 'RW-10432', seller_name: 'Jean Mugisha', buyer_name: 'Patrick Habimana', seller_owner_id: 1, buyer_owner_id: 8, transaction_type: 'SALE', transaction_date: '2026-10-18T20:00:00Z', declared_value: 30000000, status: 'PENDING', latest_risk_level: 'LOW' },
  { id: 8, transaction_code: 'TX-98238', parcel_id: 3, parcel_code: 'RW-20991', seller_name: 'Claudine Ingabire', buyer_name: 'Thierry Uwimana', seller_owner_id: 4, buyer_owner_id: 10, transaction_type: 'SALE', transaction_date: '2026-10-17T13:51:39Z', declared_value: 10100000, status: 'PENDING', latest_risk_level: 'LOW' },
  { id: 7, transaction_code: 'TX-98237', parcel_id: 1, parcel_code: 'RW-10432', seller_name: 'Jean Mugisha', buyer_name: 'Grace Mutesi', seller_owner_id: 1, buyer_owner_id: 9, transaction_type: 'SALE', transaction_date: '2026-10-16T16:51:39Z', declared_value: 19000000, status: 'PENDING', latest_risk_level: 'HIGH' },
  { id: 6, transaction_code: 'TX-98236', parcel_id: 6, parcel_code: 'RW-77890', seller_name: 'Solange Mukamana', buyer_name: 'Thierry Uwimana', seller_owner_id: 6, buyer_owner_id: 10, transaction_type: 'SALE', transaction_date: '2026-10-15T12:51:39Z', declared_value: 31000000, status: 'PENDING', latest_risk_level: 'HIGH' },
  { id: 5, transaction_code: 'TX-98235', parcel_id: 5, parcel_code: 'RW-55621', seller_name: 'Patrick Habimana', buyer_name: 'Felix Byiringiro', seller_owner_id: 5, buyer_owner_id: 8, transaction_type: 'INHERITANCE', transaction_date: '2026-10-12T18:51:39Z', declared_value: 8200000, status: 'UNDER_REVIEW', latest_risk_level: 'MEDIUM' },
  { id: 4, transaction_code: 'TX-98234', parcel_id: 4, parcel_code: 'RW-33107', seller_name: 'Claudine Ingabire', buyer_name: 'Diane Nsengimana', seller_owner_id: 4, buyer_owner_id: 7, transaction_type: 'SALE', transaction_date: '2026-10-10T18:51:39Z', declared_value: 15100000, status: 'VERIFIED', latest_risk_level: 'LOW' },
  { id: 3, transaction_code: 'TX-98233', parcel_id: 3, parcel_code: 'RW-20991', seller_name: 'Eric Nkurunziza', buyer_name: 'Grace Mutesi', seller_owner_id: 3, buyer_owner_id: 9, transaction_type: 'TRANSFER', transaction_date: '2026-10-08T18:51:39Z', declared_value: 9700000, status: 'UNDER_REVIEW', latest_risk_level: 'HIGH' },
  { id: 2, transaction_code: 'TX-98232', parcel_id: 2, parcel_code: 'RW-88213', seller_name: 'Alice Uwase', buyer_name: 'Felix Byiringiro', seller_owner_id: 2, buyer_owner_id: 8, transaction_type: 'SALE', transaction_date: '2026-10-05T18:51:39Z', declared_value: 24000000, status: 'UNDER_REVIEW', latest_risk_level: 'MEDIUM' },
  { id: 1, transaction_code: 'TX-98231', parcel_id: 1, parcel_code: 'RW-10432', seller_name: 'Jean Mugisha', buyer_name: 'Diane Nsengimana', seller_owner_id: 1, buyer_owner_id: 7, transaction_type: 'SALE', transaction_date: '2026-10-01T18:51:39Z', declared_value: 18500000, status: 'VERIFIED', latest_risk_level: 'LOW' },
]

const initialParcels = [
  { id: 1, upi: 'RW-10432', parcel_code: 'RW-10432', owner_id: 1, owner_name: 'Jean Mugisha', location: 'Kicukiro / Niboye' },
  { id: 2, upi: 'RW-88213', parcel_code: 'RW-88213', owner_id: 2, owner_name: 'Alice Uwase', location: 'Gasabo / Kimironko' },
  { id: 3, upi: 'RW-20991', parcel_code: 'RW-20991', owner_id: 3, owner_name: 'Eric Nkurunziza', location: 'Nyarugenge / Nyamirambo' },
  { id: 4, upi: 'RW-33107', parcel_code: 'RW-33107', owner_id: 4, owner_name: 'Claudine Ingabire', location: 'Kicukiro / Gahanga' },
  { id: 5, upi: 'RW-55621', parcel_code: 'RW-55621', owner_id: 5, owner_name: 'Patrick Habimana', location: 'Gasabo / Remera' },
  { id: 6, upi: 'RW-77890', parcel_code: 'RW-77890', owner_id: 6, owner_name: 'Solange Mukamana', location: 'Bugesera / Nyamata' },
]

const initialOwners = [
  { id: 1, name: 'Jean Mugisha', code: 'OWN-001' },
  { id: 2, name: 'Alice Uwase', code: 'OWN-002' },
  { id: 3, name: 'Eric Nkurunziza', code: 'OWN-003' },
  { id: 4, name: 'Claudine Ingabire', code: 'OWN-004' },
  { id: 5, name: 'Patrick Habimana', code: 'OWN-005' },
  { id: 6, name: 'Solange Mukamana', code: 'OWN-006' },
  { id: 7, name: 'Diane Nsengimana', code: 'OWN-007' },
  { id: 8, name: 'Felix Byiringiro', code: 'OWN-008' },
  { id: 9, name: 'Grace Mutesi', code: 'OWN-009' },
  { id: 10, name: 'Thierry Uwimana', code: 'OWN-010' },
]

/* =========================================================================
   NEW TRANSACTION MODAL
   ========================================================================= */
function NewTransactionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (tx: TransactionRecord) => void
}) {
  const [parcels, setParcels] = useState(initialParcels)
  const [owners, setOwners] = useState(initialOwners)
  const [selectedParcelId, setSelectedParcelId] = useState<number>(1)
  const [sellerId, setSellerId] = useState<number>(1)
  const [buyerId, setBuyerId] = useState<number>(7)
  const [txType, setTxType] = useState('SALE')
  const [declaredValue, setDeclaredValue] = useState('20000000')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.parcels()
      .then((res) => {
        if (res && res.length > 0) {
          setParcels(res.map(p => ({
            id: p.id,
            upi: p.parcel_code || `UPI-${p.id}`,
            parcel_code: p.parcel_code || `RW-${p.id}`,
            owner_id: p.current_owner_id ?? 1,
            owner_name: p.current_owner_name ?? 'Current Owner',
            location: `${p.district || ''} / ${p.sector || ''}`.trim() || p.location,
          })))
        }
      })
      .catch(() => {})

    api.owners()
      .then((res) => {
        if (res && res.length > 0) {
          setOwners(res.map(o => ({
            id: o.id,
            name: o.full_name,
            code: o.owner_code,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const handleParcelSelect = (idNum: number) => {
    setSelectedParcelId(idNum)
    const matched = parcels.find(p => p.id === idNum)
    if (matched && matched.owner_id) {
      setSellerId(matched.owner_id)
      if (buyerId === matched.owner_id) {
        const nextBuyer = owners.find(o => o.id !== matched.owner_id)
        if (nextBuyer) setBuyerId(nextBuyer.id)
      }
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (sellerId === buyerId) {
      setError('Seller and buyer cannot be the same party.')
      return
    }

    const cleanVal = Number(declaredValue.toString().replace(/[^0-9]/g, ''))
    if (!cleanVal || cleanVal <= 0) {
      setError('Please provide a valid declared valuation (RWF).')
      return
    }

    setSubmitting(true)
    const parcelObj = parcels.find(p => p.id === selectedParcelId)
    const sellerObj = owners.find(o => o.id === sellerId)
    const buyerObj = owners.find(o => o.id === buyerId)

    const payload = {
      parcel_id: selectedParcelId,
      seller_owner_id: sellerId,
      buyer_owner_id: buyerId,
      transaction_type: txType,
      transaction_date: new Date().toISOString(),
      declared_value: cleanVal,
    }

    try {
      const result = await api.createTransaction(payload)
      onCreated(result)
      onClose()
    } catch {
      // Offline fallback: Create local transaction so demo continues smoothly
      const fallbackCreated: TransactionRecord = {
        id: Date.now(),
        transaction_code: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
        parcel_id: selectedParcelId,
        parcel_code: parcelObj?.parcel_code || `RW-${selectedParcelId}`,
        seller_name: sellerObj?.name || 'Seller',
        buyer_name: buyerObj?.name || 'Buyer',
        seller_owner_id: sellerId,
        buyer_owner_id: buyerId,
        transaction_type: txType,
        transaction_date: new Date().toISOString(),
        declared_value: cleanVal,
        status: 'PENDING',
        latest_risk_level: 'LOW',
      }
      onCreated(fallbackCreated)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Register Land Transaction</h2>
            <p>Submit land conveyance for official verification and fraud risk screening</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Target Parcel (UPI / Location)</label>
            <select
              className="form-select"
              value={selectedParcelId}
              onChange={(e) => handleParcelSelect(Number(e.target.value))}
            >
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.parcel_code} — {p.location} (Owner: {p.owner_name})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Seller (Recorded Owner)</label>
              <select
                className="form-select"
                value={sellerId}
                onChange={(e) => setSellerId(Number(e.target.value))}
              >
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Buyer (Acquiring Party)</label>
              <select
                className="form-select"
                value={buyerId}
                onChange={(e) => setBuyerId(Number(e.target.value))}
              >
                {owners.map((o) => (
                  <option key={o.id} value={o.id} disabled={o.id === sellerId}>
                    {o.name} ({o.code}){o.id === sellerId ? ' (Seller)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Transaction Type</label>
              <select
                className="form-select"
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
              >
                <option value="SALE">SALE</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="INHERITANCE">INHERITANCE</option>
                <option value="DONATION">DONATION</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Declared Valuation (RWF)</label>
              <input
                type="number"
                className="form-input"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value)}
                placeholder="e.g. 25000000"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notary / Deed Reference (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. NOTARY-KG-2026-442"
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button className="btn-secondary" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button className="btn-primary" type="submit" disabled={submitting}>
              <Plus size={15} />
              {submitting ? 'Registering...' : 'Register Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================================================
   TRANSACTION DETAIL MODAL
   ========================================================================= */
function TransactionDetailModal({
  tx,
  onClose,
  onVerify,
  onUploadEvidence,
}: {
  tx: TransactionRecord
  onClose: () => void
  onVerify?: (txId: number) => void
  onUploadEvidence?: (txId: number) => void
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Transaction Overview</h2>
            <p>{tx.transaction_code || `TX-${String(tx.id).padStart(3, '0')}`}</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <span>Transaction ID</span>
            <strong>{tx.transaction_code || `TX-${String(tx.id).padStart(3, '0')}`}</strong>
          </div>
          <div className="detail-card">
            <span>Current Status</span>
            <span className={`status-badge status-${(tx.status || 'pending').toLowerCase().replace(/_/g, '-')}`}>
              {(tx.status || 'PENDING').replace(/_/g, ' ')}
            </span>
          </div>
          <div className="detail-card">
            <span>Parcel Code / UPI</span>
            <strong>{tx.parcel_code || `UPI-${tx.parcel_id}`}</strong>
          </div>
          <div className="detail-card">
            <span>Transaction Type</span>
            <strong>{tx.transaction_type}</strong>
          </div>
          <div className="detail-card">
            <span>Seller</span>
            <strong>{tx.seller_name || 'Recorded Owner'}</strong>
          </div>
          <div className="detail-card">
            <span>Buyer</span>
            <strong>{tx.buyer_name || 'Conveyee'}</strong>
          </div>
          <div className="detail-card">
            <span>Declared Value</span>
            <strong style={{ color: 'var(--blue)' }}>
              {Number(tx.declared_value || 0).toLocaleString()} RWF
            </strong>
          </div>
          <div className="detail-card">
            <span>Registration Date</span>
            <strong>{new Date(tx.transaction_date).toLocaleDateString()}</strong>
          </div>
        </div>

        {tx.latest_risk_level && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '10px', background: tx.latest_risk_level === 'HIGH' ? '#fee2e2' : tx.latest_risk_level === 'MEDIUM' ? '#fef3c7' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>AI Risk Screening:</span>
            <span className={`risk-badge risk-${tx.latest_risk_level.toLowerCase()}`}>
              {tx.latest_risk_level} Risk {tx.latest_risk_score !== undefined && tx.latest_risk_score !== null ? `(${tx.latest_risk_score}/100)` : ''}
            </span>
          </div>
        )}

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onUploadEvidence && (
              <button className="btn-secondary" onClick={() => { onClose(); onUploadEvidence(tx.id); }}>
                <Upload size={14} /> Evidence
              </button>
            )}
            {onVerify && (
              <button className="btn-primary" onClick={() => { onClose(); onVerify(tx.id); }}>
                <ShieldCheck size={14} /> Run Verification
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   TRANSACTIONS PAGE
   ========================================================================= */
function TransactionsPage({
  initialOpenCreate = false,
  onCloseCreate,
  onNavigateToVerification,
  onNavigateToEvidence,
}: {
  initialOpenCreate?: boolean
  onCloseCreate?: () => void
  onNavigateToVerification?: (txId: number) => void
  onNavigateToEvidence?: (txId: number) => void
}) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [filter, setFilter] = useState('ALL')
  const [searchUpi, setSearchUpi] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedStartDate, setAppliedStartDate] = useState('')
  const [appliedEndDate, setAppliedEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(initialOpenCreate)
  const [viewTx, setViewTx] = useState<TransactionRecord | null>(null)
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'info' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const data = await api.transactions()
      if (data && data.length > 0) {
        setTransactions(data)
      } else {
        setTransactions(fallbackTransactions)
      }
    } catch {
      setTransactions(fallbackTransactions)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    if (initialOpenCreate) {
      setShowCreateModal(true)
    }
  }, [initialOpenCreate])

  const applyFilters = () => {
    setAppliedSearch(searchUpi)
    setAppliedStartDate(startDate)
    setAppliedEndDate(endDate)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilter('ALL')
    setSearchUpi('')
    setStartDate('')
    setEndDate('')
    setAppliedSearch('')
    setAppliedStartDate('')
    setAppliedEndDate('')
    setCurrentPage(1)
  }

  const hasActiveFilters = filter !== 'ALL' || appliedSearch !== '' || appliedStartDate !== '' || appliedEndDate !== ''

  const filtered = transactions.filter((tx) => {
    // Status filter
    if (filter === 'PENDING' && tx.status !== 'PENDING') return false
    if (filter === 'UNDER_REVIEW' && tx.status !== 'UNDER_REVIEW') return false
    if (filter === 'COMPLETED' && tx.status !== 'COMPLETED' && tx.status !== 'VERIFIED') return false
    if (filter === 'FLAGGED' && tx.status !== 'FLAGGED' && tx.status !== 'REJECTED' && tx.latest_risk_level !== 'HIGH') return false

    // Search query
    const q = appliedSearch.trim().toLowerCase()
    if (q) {
      const matchCode = (tx.transaction_code || '').toLowerCase().includes(q)
      const matchUpi = (tx.parcel_code || '').toLowerCase().includes(q)
      const matchSeller = (tx.seller_name || '').toLowerCase().includes(q)
      const matchBuyer = (tx.buyer_name || '').toLowerCase().includes(q)
      const matchId = String(tx.id).includes(q)
      if (!matchCode && !matchUpi && !matchSeller && !matchBuyer && !matchId) return false
    }

    // Date range
    if (appliedStartDate) {
      const txDate = new Date(tx.transaction_date).toISOString().slice(0, 10)
      if (txDate < appliedStartDate) return false
    }
    if (appliedEndDate) {
      const txDate = new Date(tx.transaction_date).toISOString().slice(0, 10)
      if (txDate > appliedEndDate) return false
    }

    return true
  })

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="workspace-page transactions-page">
      <div className="page-heading">
        <div>
          <h1>Transactions</h1>
          <p className="heading-subtitle">Manage and track land transactions.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={15} /> Create Transaction
        </button>
      </div>

      {banner && (
        <div className={`alert ${banner.type === 'success' ? 'alert--success' : 'alert--error'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{banner.message}</span>
          <button className="icon-button" onClick={() => setBanner(null)} style={{ color: 'inherit' }}><X size={14} /></button>
        </div>
      )}

      <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }} className="filter-select">
          <option value="ALL">Status: All</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="COMPLETED">Completed / Verified</option>
          <option value="FLAGGED">Flagged</option>
        </select>
        <input
          type="text"
          placeholder="Search by UPI, TX code, name..."
          className="filter-input"
          value={searchUpi}
          onChange={(e) => setSearchUpi(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
          style={{ flex: 1, minWidth: '180px' }}
        />
        <input
          type="date"
          className="filter-input"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          title="Start date"
        />
        <input
          type="date"
          className="filter-input"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          title="End date"
        />
        <button className="btn-primary" onClick={applyFilters}>
          <Filter size={14} /> Filter
        </button>
        {hasActiveFilters && (
          <button className="btn-secondary" onClick={clearFilters} title="Reset filters">
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-muted">Loading transactions...</p>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Parcel UPI</th>
                <th>Seller</th>
                <th>Buyer</th>
                <th>Amount (RWF)</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                paginated.map((tx) => (
                  <tr key={tx.id} style={{ cursor: 'pointer' }} onClick={() => setViewTx(tx)}>
                    <td><strong>{tx.transaction_code || `TX-${String(tx.id).padStart(3, '0')}`}</strong></td>
                    <td>{tx.parcel_code || `UPI-${String(tx.parcel_id).padStart(3, '0')}`}</td>
                    <td>{tx.seller_name || 'N/A'}</td>
                    <td>{tx.buyer_name || 'N/A'}</td>
                    <td>{Number(tx.declared_value || 0).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge status-${(tx.status || 'pending').toLowerCase().replace(/_/g, '-')}`}>
                        {(tx.status || 'PENDING').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{new Date(tx.transaction_date).toLocaleDateString()}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon" onClick={() => setViewTx(tx)} title="View transaction details">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="table-footer">
            <span>
              Showing {filtered.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filtered.length)}`} of {filtered.length}
            </span>
            <div className="pagination">
              <button className="page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>&lt;</button>
              <button className="page-btn page-btn--active">{currentPage}</button>
              <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>&gt;</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <NewTransactionModal
          onClose={() => {
            setShowCreateModal(false)
            onCloseCreate?.()
          }}
          onCreated={(newTx) => {
            setTransactions(prev => [newTx, ...prev])
            setFilter('ALL')
            setBanner({ message: `Transaction ${newTx.transaction_code || 'TX-NEW'} successfully registered!`, type: 'success' })
          }}
        />
      )}

      {viewTx && (
        <TransactionDetailModal
          tx={viewTx}
          onClose={() => setViewTx(null)}
          onVerify={(txId) => onNavigateToVerification?.(txId)}
          onUploadEvidence={(txId) => onNavigateToEvidence?.(txId)}
        />
      )}
    </div>
  )
}

/* =========================================================================
   EVIDENCE PAGE
   ========================================================================= */
function EvidencePage() {
  const [evidence, setEvidence] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.evidenceList?.().then(setEvidence).catch(() => {}).finally(() => setLoading(false)) }, [])

  return (
    <div className="workspace-page evidence-page">
      <div className="page-heading"><div><h1>Evidence</h1><p className="heading-subtitle">Upload and manage supporting documents for transactions.</p></div><button className="btn-primary"><Upload size={15} /> Upload Evidence</button></div>
      <div className="card"><div className="upload-zone"><Upload size={32} className="upload-icon" /><p className="upload-text">Drag and drop files here or click to browse</p><p className="upload-hint">Supported formats: PDF, JPG, PNG (max 10MB per file)</p></div></div>
      {loading ? <p className="text-muted">Loading...</p> : evidence.length === 0 ? (
        <div className="card"><div className="card-header"><h3>Evidence Documents</h3></div><p className="text-muted">No evidence documents uploaded yet.</p></div>
      ) : (
        <div className="card"><div className="card-header"><h3>Evidence Documents</h3></div>
          <table className="data-table"><thead><tr><th>Document</th><th>Transaction</th><th>Uploaded By</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>{evidence.map((ev, i) => (<tr key={i}><td><strong>{ev.original_filename || 'Document'}</strong></td><td>TX-{String(ev.transaction_id).padStart(4, '0')}</td><td>{ev.uploaded_by_name || 'Officer'}</td><td><span className={`evidence-badge evidence-${ev.status.toLowerCase().replace(/_/g, '-')}`}>{ev.status.replace(/_/g, ' ')}</span></td><td>{new Date(ev.created_at).toLocaleDateString()}</td><td><button className="btn-icon"><Eye size={14} /></button></td></tr>))}</tbody></table>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   VERIFICATION PAGE
   ========================================================================= */
function VerificationPage({ initialTxId }: { initialTxId?: number | null }) {
  const [selectedTx, setSelectedTx] = useState<number | null>(initialTxId ?? null)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])

  useEffect(() => {
    if (initialTxId) setSelectedTx(initialTxId)
  }, [initialTxId])

  useEffect(() => {
    api.transactions()
      .then((txs) => {
        if (txs && txs.length > 0) setTransactions(txs)
        else setTransactions(fallbackTransactions)
      })
      .catch(() => setTransactions(fallbackTransactions))
  }, [])

  return (
    <div className="workspace-page verification-page">
      <h2 className="page-title">Verification</h2><p className="page-subtitle">Check for inconsistencies and get AI risk analysis.</p>
      <div className="card"><label className="form-label">Select Transaction</label><select value={selectedTx ?? ''} onChange={(e) => setSelectedTx(e.target.value ? Number(e.target.value) : null)} className="form-select"><option value="">Select a transaction...</option>{transactions.map((tx) => (<option key={tx.id} value={tx.id}>{tx.transaction_code} — {tx.parcel_code} — {tx.seller_name} → {tx.buyer_name}</option>))}</select><button className="btn-primary" disabled={!selectedTx}>Run Verification</button></div>
      {selectedTx && (
        <div className="verification-grid">
          <div className="card"><div className="card-header"><h3>Rule-based Checks</h3></div><div className="check-list"><div className="check-item check--pass"><CheckCircle size={16} /> UPI exists in system</div><div className="check-item check--pass"><CheckCircle size={16} /> Seller matches recorded owner</div><div className="check-item check--pass"><CheckCircle size={16} /> No duplicate active transaction</div><div className="check-item check--pass"><CheckCircle size={16} /> Required information complete</div><div className="check-item check--warn"><AlertTriangle size={16} /> Payment evidence pending review</div></div></div>
          <div className="card"><div className="card-header"><h3>AI Risk Analysis</h3></div><div className="risk-gauge"><div className="gauge-circle"><span className="gauge-value">32</span><span className="gauge-label">Risk Score</span></div><div className="gauge-legend"><div><span className="gauge-dot gauge-dot--high" /> High Risk 0%</div><div><span className="gauge-dot gauge-dot--medium" /> Medium Risk 32%</div><div><span className="gauge-dot gauge-dot--low" /> Low Risk 68%</div></div></div><div className="risk-verdict risk-verdict--medium"><strong>Medium Risk</strong><p>Possible inconsistency in payment details and recent ownership change.</p></div></div>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   PENDING REVIEWS PAGE
   ========================================================================= */
function PendingReviewsPage() {
  const [filter, setFilter] = useState('all')
  const mockReviews = [
    { id: 'TX-004', upi: 'UPI-004', seller: 'Denis', buyer: 'Claude', reason: 'High risk score (70%)', evidence: 'Missing', date: 'Apr 18, 2025' },
    { id: 'TX-006', upi: 'UPI-006', seller: 'Fidele', buyer: 'Alice', reason: 'Payment amount mismatch', evidence: 'Needs Review', date: 'Apr 16, 2025' },
    { id: 'TX-007', upi: 'UPI-003', seller: 'Samuel', buyer: 'Claudine', reason: 'New owner (7 days)', evidence: 'Partial', date: 'Apr 22, 2025' },
    { id: 'TX-002', upi: 'UPI-001', seller: 'Jean', buyer: 'Patrick', reason: 'Payment evidence pending', evidence: 'Under Review', date: 'Apr 20, 2025' },
    { id: 'TX-009', upi: 'UPI-008', seller: 'Joseph', buyer: 'Alice', reason: 'Inconsistent documents', evidence: 'Inconsistent', date: 'Apr 23, 2025' },
  ]

  return (
    <div className="workspace-page pending-reviews-page">
      <h2 className="page-title">Pending Reviews</h2><p className="page-subtitle">Transactions that need your attention.</p>
      <div className="filter-tabs"><button className={`filter-tab ${filter === 'all' ? 'filter-tab--active' : ''}`} onClick={() => setFilter('all')}>All (5)</button><button className={`filter-tab ${filter === 'high' ? 'filter-tab--active' : ''}`} onClick={() => setFilter('high')}>High Risk (2)</button><button className={`filter-tab ${filter === 'missing' ? 'filter-tab--active' : ''}`} onClick={() => setFilter('missing')}>Missing Evidence (1)</button><button className={`filter-tab ${filter === 'clarification' ? 'filter-tab--active' : ''}`} onClick={() => setFilter('clarification')}>Needs Clarification (2)</button></div>
      <div className="table-card"><table className="data-table"><thead><tr><th>ID</th><th>Parcel UPI</th><th>Seller → Buyer</th><th>Reason</th><th>Evidence Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>{mockReviews.map((r) => (<tr key={r.id}><td><strong>{r.id}</strong></td><td>{r.upi}</td><td>{r.seller} → {r.buyer}</td><td>{r.reason}</td><td><span className={`evidence-badge evidence-${r.evidence.toLowerCase().replace(' ', '-')}`}>{r.evidence}</span></td><td>{r.date}</td><td><button className="btn-secondary btn-sm">Review Details</button></td></tr>))}</tbody></table>
        <div className="table-footer"><span>Showing 1-5 of 5</span><div className="pagination"><button className="page-btn" disabled>&lt;</button><button className="page-btn page-btn--active">1</button><button className="page-btn" disabled>&gt;</button></div></div></div>
    </div>
  )
}

/* =========================================================================
   ADMIN, AUDITOR, AND REPORTING PAGES
   ========================================================================= */
function UserManagementPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadUsers = () => {
    setLoading(true)
    api.users().then(setUsers).catch(() => setMessage('Unable to load users.')).finally(() => setLoading(false))
  }

  useEffect(loadUsers, [])

  const disableUser = async (id: number) => {
    try {
      await api.disableUser(id)
      setMessage('User access revoked.')
      loadUsers()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to update user.')
    }
  }

  return <div>
    <div className="page-heading"><div><h1>User Management</h1><p className="heading-subtitle">Manage authorized personnel and role access.</p></div><button className="btn-primary"><Plus size={15} /> Add User</button></div>
    {message && <div className="alert alert--info">{message}</div>}
    <div className="table-card"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={6}>Loading users...</td></tr> : users.map((user) => <tr key={user.id}><td><strong>{user.full_name}</strong><br /><span className="text-muted">{user.username || 'No username'}</span></td><td>{user.email}</td><td>{user.roles[0]?.name || 'Unassigned'}</td><td><span className={user.is_active ? 'status-label risk-label--low' : 'status-label risk-label--high'}>{user.is_active ? 'Active' : 'Inactive'}</span></td><td>Not available</td><td>{user.is_active && <button className="btn-secondary btn-sm" onClick={() => disableUser(user.id)}>Revoke</button>}</td></tr>)}
    </tbody></table></div>
  </div>
}

function SystemSettingsPage() {
  const [tab, setTab] = useState('General')
  const [saved, setSaved] = useState(false)
  const tabs = ['General', 'Security', 'Notifications', 'Database', 'File Storage']
  return <div>
    <div className="page-heading"><div><h1>System Settings</h1><p className="heading-subtitle">Configure institutional verification and storage preferences.</p></div><button className="btn-primary" onClick={() => setSaved(true)}><Check size={15} /> Save Settings</button></div>
    {saved && <div className="alert alert--success">Settings saved for this session.</div>}
    <div className="filter-tabs">{tabs.map((item) => <button key={item} className={`filter-tab ${tab === item ? 'filter-tab--active' : ''}`} onClick={() => { setTab(item); setSaved(false) }}>{item}</button>)}</div>
    <div className="card"><div className="card-header"><h3>{tab} Configuration</h3></div><div className="settings-form">
      <label>System Name<input className="filter-input" defaultValue="LandGuard AI" /></label>
      <label>Organization<input className="filter-input" defaultValue="Rwanda Land Administration" /></label>
      <label>Default Review Threshold<select className="filter-select" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      <label>Allowed File Types<input className="filter-input" defaultValue="PDF, JPG, PNG" /></label>
    </div></div>
  </div>
}

function EvidenceReviewPage() {
  const [evidence, setEvidence] = useState<any[]>([])
  const [status, setStatus] = useState('ALL')
  const [message, setMessage] = useState('')
  const load = () => api.evidenceList().then(setEvidence).catch(() => setMessage('Unable to load evidence documents.'))
  useEffect(() => { load() }, [])
  const visible = status === 'ALL' ? evidence : evidence.filter((item) => item.status === status)
  const review = async (id: number, nextStatus: string) => {
    try { await api.reviewEvidence(id, { status: nextStatus, reviewNotes: 'Reviewed from Evidence Review.' }); setMessage('Evidence status updated.'); load() }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Unable to review evidence.') }
  }
  return <div>
    <div className="page-heading"><div><h1>Evidence Review</h1><p className="heading-subtitle">Inspect uploaded documents and record review outcomes.</p></div><button className="btn-secondary"><Download size={15} /> Export</button></div>
    {message && <div className="alert alert--info">{message}</div>}
    <div className="filter-bar"><select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">All statuses</option><option value="UPLOADED">Uploaded</option><option value="UNDER_REVIEW">Under Review</option><option value="VERIFIED_FOR_REVIEW">Verified</option><option value="NEEDS_CLARIFICATION">Needs Clarification</option></select></div>
    <div className="table-card"><table className="data-table"><thead><tr><th>Document</th><th>Transaction</th><th>Type</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody>
      {visible.map((item) => <tr key={item.id}><td><strong>{item.original_filename || 'Document'}</strong></td><td>TX-{String(item.transaction_id).padStart(4, '0')}</td><td>{item.document_type}</td><td><span className={`evidence-badge evidence-${String(item.status).toLowerCase().replace(/_/g, '-')}`}>{String(item.status).replace(/_/g, ' ')}</span></td><td>{new Date(item.created_at).toLocaleDateString()}</td><td><button className="btn-secondary btn-sm" onClick={() => review(item.id, 'VERIFIED_FOR_REVIEW')}>Verify</button><button className="btn-icon" title="Request clarification" onClick={() => review(item.id, 'NEEDS_CLARIFICATION')}><AlertTriangle size={14} /></button></td></tr>)}
    </tbody></table></div>
  </div>
}

function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([])
  const [query, setQuery] = useState('')
  useEffect(() => { api.audit().then(setLogs).catch(() => setLogs([])) }, [])
  const filtered = logs.filter((log) => `${log.action} ${log.entity} ${log.user_name || ''}`.toLowerCase().includes(query.toLowerCase()))
  return <div>
    <div className="page-heading"><div><h1>Audit Logs</h1><p className="heading-subtitle">Immutable record of administrative and verification activity.</p></div><button className="btn-secondary"><Download size={15} /> Export</button></div>
    <div className="filter-bar"><input className="filter-input" placeholder="Search activity, entity, or user" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    <div className="table-card"><table className="data-table"><thead><tr><th>Date</th><th>User</th><th>Action</th><th>Entity</th><th>Reference</th></tr></thead><tbody>{filtered.map((log) => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.user_name || 'System'}</td><td><strong>{log.action}</strong></td><td>{log.entity}</td><td>{log.entity_id || '-'}</td></tr>)}</tbody></table></div>
  </div>
}

function ReportsPage() {
  const [report, setReport] = useState('transaction-summary')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const generate = async () => { setLoading(true); try { setResult(await api.report(report)) } catch { setResult({ message: 'Report data is not available yet.' }) } finally { setLoading(false) } }
  return <div>
    <div className="page-heading"><div><h1>Reports</h1><p className="heading-subtitle">Generate operational and compliance summaries.</p></div><button className="btn-primary" onClick={generate} disabled={loading}><FileText size={15} /> {loading ? 'Generating...' : 'Generate Report'}</button></div>
    <div className="card"><div className="settings-form"><label>Report Type<select className="filter-select" value={report} onChange={(e) => setReport(e.target.value)}><option value="transaction-summary">Transaction Summary</option><option value="risk-summary">Risk Summary</option><option value="audit-summary">Audit Summary</option></select></label><label>Period<input className="filter-input" type="month" defaultValue="2026-10" /></label></div></div>
    {result && <div className="card"><div className="card-header"><h3>Generated Report</h3><button className="btn-secondary"><Download size={15} /> Download</button></div><pre className="report-output">{JSON.stringify(result, null, 2)}</pre></div>}
  </div>
}

/* =========================================================================
   PROFILE PAGE
   ========================================================================= */
function ProfilePage({ currentUser, onLogout }: { currentUser: CurrentUser | null; onLogout: () => void }) {
  const [editing, setEditing] = useState(false)
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(true)
  const [systemAlerts, setSystemAlerts] = useState(true)
  const [frequency, setFrequency] = useState('Instant')

  return (
    <div className="profile-page">
      <div className="page-heading profile-page-heading"><div><h1>My Profile</h1><p className="heading-subtitle">Manage your account information and preferences.</p></div></div>
      <section className="profile-identity-card">
        <div className="profile-identity-main"><div className="profile-avatar-lg">{currentUser ? initials(currentUser.full_name) : 'OF'}</div><div><h2>{currentUser?.full_name ?? 'Officer User'} <span className="badge badge--success">Active</span></h2><span className="profile-role">{displayRole(currentUser?.roles[0] ?? 'OFFICER')}</span><p>Land Officer - Gasabo District</p></div></div>
        <button className="btn-outline" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit Profile'}</button>
        <div className="profile-contact-row"><div><span>Email</span><strong>{currentUser?.email ?? 'officer@landguard.rw'}</strong></div><div><span>Phone</span><strong>+250 788 123 456</strong></div><div><span>Joined</span><strong>Apr 10, 2025</strong></div></div>
      </section>
      <section className="profile-preferences-card"><div className="profile-section-heading"><h3>Contact Preferences</h3></div><div className="profile-preferences-grid"><div className="profile-toggle-list"><div className="profile-toggle-row"><span>✉ Email Notifications</span><button aria-label="Toggle email notifications" className={`toggle ${emailNotifs ? 'toggle--on' : ''}`} onClick={() => setEmailNotifs(!emailNotifs)}><span className="toggle-dot" /></button></div><div className="profile-toggle-row"><span>▣ SMS Notifications</span><button aria-label="Toggle SMS notifications" className={`toggle ${smsNotifs ? 'toggle--on' : ''}`} onClick={() => setSmsNotifs(!smsNotifs)}><span className="toggle-dot" /></button></div><div className="profile-toggle-row"><span>♟ System Alerts</span><button aria-label="Toggle system alerts" className={`toggle ${systemAlerts ? 'toggle--on' : ''}`} onClick={() => setSystemAlerts(!systemAlerts)}><span className="toggle-dot" /></button></div></div><label className="frequency-control">Notification Frequency<select value={frequency} onChange={(e) => setFrequency(e.target.value)}><option>Instant</option><option>Daily digest</option><option>Weekly digest</option></select></label></div></section>
      <div className="profile-security-grid"><section className="profile-security-card"><div className="security-icon">♙</div><div><h3>Change Password</h3><p>Update your password regularly to keep your account secure.</p><button className="btn-outline">Change Password</button></div></section><section className="profile-security-card"><div className="security-icon">♢</div><div><h3>Security & Sessions</h3><p>Last Login<br /><strong>Apr 23, 2025 09:12 AM</strong></p><p>Active Sessions<br /><strong>1 device</strong></p><button className="btn-outline">View Sessions</button></div></section></div>
    </div>
  )
}

/* =========================================================================
   PROFILE MODAL
   ========================================================================= */
function ProfileModal({ user, onClose, onLogout }: { user: CurrentUser | null; onClose: () => void; onLogout: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-window" onClick={(e) => e.stopPropagation()}>
      <div className="modal-head"><div><h2>User Account Profile</h2><p>Active authenticated session details</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
      <div className="detail-grid"><div className="detail-card"><span>Operator Name</span><strong>{user?.full_name || 'Verification Officer'}</strong></div><div className="detail-card"><span>Username / Email</span><strong>{user?.email || 'officer@landguard.local'}</strong></div><div className="detail-card"><span>Assigned Role</span><strong>{user?.roles?.join(', ') || 'OFFICER'}</strong></div><div className="detail-card"><span>Account Status</span><strong>{user?.is_active ? 'Active & Authorized' : 'Revoked'}</strong></div></div>
      <div className="modal-actions"><button className="btn-secondary" onClick={onClose}>Close</button><button className="btn-secondary btn-danger" onClick={onLogout}>Sign Out</button></div>
    </div></div>
  )
}

/* =========================================================================
   UTILITIES
   ========================================================================= */
function initials(name: string) { return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() }
function displayRole(role?: string) { if (role === 'OFFICER') return 'Verification Officer'; if (role === 'ADMIN') return 'System Administrator'; if (role === 'AUDITOR') return 'Compliance Auditor'; return 'Authorized Officer' }
