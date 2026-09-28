import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Flag,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MinusCircle,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import {
  api,
  type AuditRecord,
  type CaseDetail,
  type CaseRecord,
  type CurrentUser,
  type DashboardStats,
  type OwnerRecord,
  type OwnershipRecord,
  type ParcelRecord,
  type RiskResponse,
  type TransactionRecord,
  type UserRecord,
  type VerificationResponse,
  type VerificationResult,
} from './lib/api'

type NavItem = { label: string; icon: typeof LayoutDashboard }
type Risk = 'Low' | 'Medium' | 'High'

const navigation: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Parcels', icon: Map },
  { label: 'Owners', icon: Users },
  { label: 'Transactions', icon: FileText },
  { label: 'Cases', icon: FolderOpen },
  { label: 'Audit logs', icon: ClipboardCheck },
  { label: 'Reports', icon: FileCheck2 },
  { label: 'Users', icon: Users },
]

const roleNavigation: Record<string, string[]> = {
  ADMIN: ['Dashboard', 'Parcels', 'Owners', 'Transactions', 'Cases', 'Audit logs', 'Reports', 'Users'],
  OFFICER: ['Dashboard', 'Parcels', 'Owners', 'Transactions', 'Cases', 'Reports'],
  AUDITOR: ['Dashboard', 'Parcels', 'Owners', 'Transactions', 'Cases', 'Audit logs', 'Reports'],
}

const fallbackAlerts = [
  { id: 'CASE-0441', title: 'Recent ownership change & concurrent sale', meta: '1 hr ago', risk: 'High' as Risk },
  { id: 'CASE-0443', title: 'Recent ownership change detected', meta: '3 hrs ago', risk: 'Medium' as Risk },
  { id: 'CASE-0445', title: 'Possible duplicate transaction detected', meta: '5 hrs ago', risk: 'High' as Risk },
]

const fallbackActivity = [
  { icon: Check, text: 'Verified transaction TX-98231 on parcel RW-10432', time: '2h ago', tone: 'green' },
  { icon: FolderOpen, text: 'Opened review case CASE-0441 for parcel RW-20991', time: '4h ago', tone: 'blue' },
  { icon: Sparkles, text: 'AI Risk prediction completed for TX-98236: HIGH risk (76/100)', time: '6h ago', tone: 'amber' },
]

function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('landguard_demo_session') === 'true')
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [apiState, setApiState] = useState<'demo' | 'live'>('demo')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [alertFilter, setAlertFilter] = useState<Risk | 'All'>('All')

  // Modals state
  const [selectedParcelId, setSelectedParcelId] = useState<number | null>(null)
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null)
  const [showNewTxModal, setShowNewTxModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showNewOwnerModal, setShowNewOwnerModal] = useState(false)

  const loadCurrentUserAndStats = async () => {
    try {
      const user = await api.me()
      setCurrentUser(user)
      const dashboardStats = await api.stats()
      setStats(dashboardStats)
      setApiState('live')
    } catch {
      setApiState('demo')
    }
  }

  useEffect(() => {
    if (authenticated) {
      loadCurrentUserAndStats()
    }
  }, [authenticated])

  const logout = () => {
    api.logout().catch(() => {})
    localStorage.removeItem('landguard_access_token')
    localStorage.removeItem('landguard_demo_session')
    setAuthenticated(false)
    setCurrentUser(null)
  }

  if (!authenticated) {
    return (
      <LoginScreen
        onContinue={(user) => {
          localStorage.setItem('landguard_demo_session', 'true')
          setCurrentUser(user)
          setAuthenticated(true)
        }}
      />
    )
  }

  const displayStats = stats ?? {
    total_parcels: 6,
    total_owners: 10,
    total_transactions: 8,
    transactions_under_review: 5,
    low_risk_transactions: 2,
    medium_risk_transactions: 2,
    high_risk_transactions: 4,
    recent_verification_activity: [],
    recent_alerts: [],
  }

  const role = currentUser?.roles[0] ?? 'OFFICER'
  const allowedNav = navigation.filter(({ label }) => roleNavigation[role]?.includes(label))

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><ShieldCheck size={17} strokeWidth={2.4} /></div>
          <span>LandGuard AI</span>
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-icon"><Building2 size={15} /></div>
          <div>
            <strong>Rwanda Cadastre</strong>
            <span>Verification Authority</span>
          </div>
          <ChevronDown size={14} className="workspace-chevron" />
        </div>

        <nav className="primary-nav" aria-label="Main navigation">
          <p className="nav-label">Decision Support</p>
          {allowedNav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? 'nav-item--active' : ''}`}
              onClick={() => { setActiveNav(label); setMobileNavOpen(false) }}
            >
              <Icon size={16} strokeWidth={1.9} />
              <span>{label}</span>
              {label === 'Cases' && <span className="nav-count">{displayStats.transactions_under_review}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="support-link"><CircleHelp size={16} /><span>Institutional Guide</span></div>
          <div className="user-card">
            <div className="avatar">{currentUser ? initials(currentUser.full_name) : 'OF'}</div>
            <div>
              <strong>{currentUser?.full_name ?? 'Officer User'}</strong>
              <span>{currentUser ? displayRole(currentUser.roles[0]) : 'Verification Officer'}</span>
            </div>
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="crumb-divider">/</span>
            <strong>{activeNav}</strong>
          </div>

          <div className="top-actions">
            <div className="search-trigger">
              <Search size={15} />
              <span>Institutional Decision Support</span>
              <kbd>RW</kbd>
            </div>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setActiveNav('Cases')}>
              <Bell size={18} />
              {displayStats.transactions_under_review > 0 && <i />}
            </button>

            <div className="profile-menu-wrap">
              <button className="profile-trigger" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(!profileMenuOpen)}>
                <div className="top-avatar">{currentUser ? initials(currentUser.full_name) : 'OF'}</div>
                <span>{currentUser?.full_name ?? 'Officer User'}</span>
                <ChevronDown size={15} />
              </button>
              {profileMenuOpen && (
                <div className="profile-menu">
                  <div className="profile-menu-heading">
                    <strong>{currentUser?.full_name ?? 'Officer User'}</strong>
                    <span>{currentUser ? displayRole(currentUser.roles[0]) : 'Verification Officer'}</span>
                  </div>
                  <button className="profile-menu-item" onClick={() => { setProfileMenuOpen(false); setShowProfileModal(true) }}>
                    <UserRound size={17} /> Account details
                  </button>
                  <button className="profile-menu-item profile-menu-item--logout" onClick={logout}>
                    <LogOut size={17} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-wrap">
          {activeNav === 'Dashboard' && (
            <DashboardView
              stats={displayStats}
              apiState={apiState}
              currentUser={currentUser}
              alertFilter={alertFilter}
              setAlertFilter={setAlertFilter}
              onNavigate={(page) => setActiveNav(page)}
              onSelectCase={(id) => setSelectedCaseId(id)}
              onRefresh={loadCurrentUserAndStats}
            />
          )}

          {activeNav === 'Parcels' && (
            <ParcelsView
              onSelectParcel={(id) => setSelectedParcelId(id)}
              onNewTransaction={(parcelId) => { setSelectedParcelId(parcelId); setShowNewTxModal(true) }}
            />
          )}

          {activeNav === 'Owners' && (
            <OwnersView onNewOwner={() => setShowNewOwnerModal(true)} />
          )}

          {activeNav === 'Transactions' && (
            <TransactionsView
              onSelectTransaction={(id) => setSelectedTxId(id)}
              onOpenNewModal={() => setShowNewTxModal(true)}
            />
          )}

          {activeNav === 'Cases' && (
            <CasesView onSelectCase={(id) => setSelectedCaseId(id)} />
          )}

          {activeNav === 'Audit logs' && <AuditLogsView />}

          {activeNav === 'Reports' && <ReportsView />}

          {activeNav === 'Users' && <AdminUsersPage onBack={() => setActiveNav('Dashboard')} />}
        </div>
      </main>

      {/* Parcel Detail Modal */}
      {selectedParcelId !== null && (
        <ParcelDetailModal
          parcelId={selectedParcelId}
          onClose={() => setSelectedParcelId(null)}
          onNewTransaction={() => { setShowNewTxModal(true) }}
          onSelectTransaction={(id) => { setSelectedParcelId(null); setSelectedTxId(id) }}
        />
      )}

      {/* Transaction Details, Verification & AI Risk Modal */}
      {selectedTxId !== null && (
        <TransactionWorkspaceModal
          transactionId={selectedTxId}
          onClose={() => setSelectedTxId(null)}
          onOpenCase={(caseId) => { setSelectedTxId(null); setSelectedCaseId(caseId) }}
        />
      )}

      {/* Case Review Modal */}
      {selectedCaseId !== null && (
        <CaseReviewModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onUpdated={loadCurrentUserAndStats}
        />
      )}

      {/* New Transaction Registration Modal */}
      {showNewTxModal && (
        <NewTransactionModal
          defaultParcelId={selectedParcelId}
          onClose={() => setShowNewTxModal(false)}
          onCreated={(newTxId) => {
            setShowNewTxModal(false)
            setSelectedTxId(newTxId)
            loadCurrentUserAndStats()
          }}
        />
      )}

      {/* New Owner Registration Modal */}
      {showNewOwnerModal && (
        <NewOwnerModal
          onClose={() => setShowNewOwnerModal(false)}
          onCreated={() => {
            setShowNewOwnerModal(false)
            loadCurrentUserAndStats()
          }}
        />
      )}

      {/* Profile / Account Settings Modal */}
      {showProfileModal && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfileModal(false)}
          onLogout={logout}
        />
      )}
    </div>
  )
}

/* =========================================================================
   LOGIN SCREEN
   ========================================================================= */
function LoginScreen({ onContinue }: { onContinue: (user: CurrentUser) => void }) {
  const [email, setEmail] = useState('officer@landguard.local')
  const [password, setPassword] = useState('OfficerPass123!')
  const [role, setRole] = useState('Officer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRoleSelection = (selectedRole: string) => {
    setRole(selectedRole)
    if (selectedRole === 'Admin') {
      setEmail('admin@landguard.local')
      setPassword('AdminPass123!')
    } else if (selectedRole === 'Auditor') {
      setEmail('auditor@landguard.local')
      setPassword('AuditorPass123!')
    } else {
      setEmail('officer@landguard.local')
      setPassword('OfficerPass123!')
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.login(email, password, role.toUpperCase())
      localStorage.setItem('landguard_access_token', response.access_token)
      const user = await api.me()
      onContinue(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Verify backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const enterDemo = () => {
    onContinue({
      id: 2,
      full_name: 'Marie Habyarimana',
      email: 'officer@landguard.local',
      is_active: true,
      roles: ['OFFICER'],
    })
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand-row login-brand">
          <div className="brand-mark"><ShieldCheck size={18} /></div>
          <span>LandGuard AI</span>
        </div>
        <h1>Institutional Portal</h1>
        <p className="login-subtitle">Land Transaction Verification & Fraud Risk Decision Support</p>

        <form onSubmit={submit} className="login-form">
          <fieldset className="role-field">
            <legend>Select Role & Demo Profile</legend>
            <div className="role-switcher">
              {['Officer', 'Admin', 'Auditor'].map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={role === opt ? 'role-option role-option--active' : 'role-option'}
                  onClick={() => handleRoleSelection(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </fieldset>

          <label>
            Username or Email
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign in to Console'}
          </button>
        </form>

        <button className="demo-button" onClick={enterDemo}>
          Launch Offline Demo Mode
        </button>

        <p className="login-note">
          Official prototype for academic evaluation.<br />
          All actions are recorded in immutable audit logs.
        </p>
      </div>
    </div>
  )
}

/* =========================================================================
   DASHBOARD VIEW
   ========================================================================= */
function DashboardView({
  stats,
  apiState,
  currentUser,
  alertFilter,
  setAlertFilter,
  onNavigate,
  onSelectCase,
  onRefresh,
}: {
  stats: DashboardStats
  apiState: string
  currentUser: CurrentUser | null
  alertFilter: Risk | 'All'
  setAlertFilter: (val: Risk | 'All') => void
  onNavigate: (page: string) => void
  onSelectCase: (id: number) => void
  onRefresh: () => void
}) {
  const visibleAlerts = alertFilter === 'All'
    ? (stats.recent_alerts?.length ? stats.recent_alerts : fallbackAlerts)
    : (stats.recent_alerts?.length ? stats.recent_alerts : fallbackAlerts).filter(a => a.risk === alertFilter)

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Republic of Rwanda — Land Administration</p>
          <h1>{dashboardTitle(currentUser?.roles[0])}</h1>
          <p className="heading-subtitle">{dashboardSubtitle(currentUser?.roles[0])}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="outline-button" onClick={onRefresh}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="outline-button" onClick={() => onNavigate('Reports')}>
            <FileText size={14} /> Reports
          </button>
        </div>
      </section>

      <section className="metric-grid" aria-label="Overview metrics">
        <Metric icon={Map} label="Registered Parcels" value={stats.total_parcels.toLocaleString()} change={apiState === 'live' ? 'Live DB' : 'Demo'} accent="blue" onClick={() => onNavigate('Parcels')} />
        <Metric icon={Users} label="Registered Owners" value={stats.total_owners.toLocaleString()} change={apiState === 'live' ? 'Live DB' : 'Demo'} accent="violet" onClick={() => onNavigate('Owners')} />
        <Metric icon={FileText} label="Total Transactions" value={stats.total_transactions.toLocaleString()} change={apiState === 'live' ? 'Live DB' : 'Demo'} accent="amber" onClick={() => onNavigate('Transactions')} />
        <Metric icon={FolderOpen} label="Cases Under Review" value={stats.transactions_under_review.toLocaleString()} change={apiState === 'live' ? 'Live DB' : 'Demo'} accent="red" onClick={() => onNavigate('Cases')} />
      </section>

      <section className="risk-row">
        <RiskCard
          label="Low risk transactions"
          value={stats.low_risk_transactions.toLocaleString()}
          percent={riskPercent(stats.low_risk_transactions, stats.total_transactions)}
          tone="low"
          icon={Check}
        />
        <RiskCard
          label="Medium risk transactions"
          value={stats.medium_risk_transactions.toLocaleString()}
          percent={riskPercent(stats.medium_risk_transactions, stats.total_transactions)}
          tone="medium"
          icon={AlertTriangle}
        />
        <RiskCard
          label="High risk transactions"
          value={stats.high_risk_transactions.toLocaleString()}
          percent={riskPercent(stats.high_risk_transactions, stats.total_transactions)}
          tone="high"
          icon={Flag}
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Distribution</p>
              <h2>AI Fraud-Risk Stratification</h2>
            </div>
            <button className="filter-button" onClick={() => onNavigate('Transactions')}>
              View All <ArrowRight size={13} />
            </button>
          </div>
          <div className="chart">
            <div className="y-axis">
              <span>High</span>
              <span>Med</span>
              <span>Low</span>
              <span>0</span>
            </div>
            <div className="chart-plot">
              <div className="grid-line line-1" />
              <div className="grid-line line-2" />
              <div className="grid-line line-3" />
              <div className="grid-line line-4" />
              <div className="bars">
                <Bar value={`${Math.min(100, Math.round((stats.low_risk_transactions / (stats.total_transactions || 1)) * 100))}%`} label="Low" tone="low" count={stats.low_risk_transactions.toString()} />
                <Bar value={`${Math.min(100, Math.round((stats.medium_risk_transactions / (stats.total_transactions || 1)) * 100))}%`} label="Medium" tone="medium" count={stats.medium_risk_transactions.toString()} />
                <Bar value={`${Math.min(100, Math.round((stats.high_risk_transactions / (stats.total_transactions || 1)) * 100))}%`} label="High" tone="high" count={stats.high_risk_transactions.toString()} />
              </div>
            </div>
          </div>
        </article>

        <article className="panel alerts-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Action Required</p>
              <h2>Suspicious Cases & Alerts</h2>
            </div>
            <button className="filter-button" onClick={() => onNavigate('Cases')}>
              Review Cases
            </button>
          </div>
          <div className="alert-filters">
            {(['All', 'High', 'Medium'] as const).map((filter) => (
              <button
                key={filter}
                className={alertFilter === filter ? 'filter-active' : ''}
                onClick={() => setAlertFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="alerts-list">
            {visibleAlerts.slice(0, 4).map((alert, idx) => (
              <div
                className="alert-item"
                key={idx}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectCase(1)}
              >
                <div className={`alert-icon alert-icon--${alert.risk.toLowerCase()}`}>
                  {alert.risk === 'High' ? <Flag size={14} /> : <AlertTriangle size={14} />}
                </div>
                <div className="alert-copy">
                  <strong>{alert.id}</strong>
                  <span>{alert.title}</span>
                </div>
                <span className={`status-pill status-pill--${alert.risk.toLowerCase()}`}>{alert.risk}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel activity-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Compliance Trail</p>
            <h2>Recent Verification & Audit Operations</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate('Audit logs')}>
            View full log <ArrowRight size={13} />
          </button>
        </div>
        <div className="activity-list">
          {(stats.recent_verification_activity?.length ? stats.recent_verification_activity : fallbackActivity).slice(0, 4).map((act, index) => {
            const isFallback = 'text' in act
            const text = isFallback ? (act as any).text : `${(act as any).action} on ${(act as any).entity} ${(act as any).entity_id || ''}`
            const time = isFallback ? (act as any).time : new Date((act as any).created_at).toLocaleTimeString()
            return (
              <div className="activity-item" key={index}>
                <div className="activity-icon activity-icon--green">
                  <Check size={14} />
                </div>
                <span>{text}</span>
                <time>{time}</time>
              </div>
            )
          })}
        </div>
      </section>

      <footer className="footer">
        <span>
          <span className="live-dot" />
          {apiState === 'live' ? 'Connected to FastAPI Backend (PostgreSQL/SQLite)' : 'Local Demo Sandbox'}
        </span>
        <span>Decision support system only. AI predictions do not replace official Rwandan land authorities.</span>
      </footer>
    </>
  )
}

/* =========================================================================
   PARCELS VIEW
   ========================================================================= */
function ParcelsView({
  onSelectParcel,
  onNewTransaction,
}: {
  onSelectParcel: (id: number) => void
  onNewTransaction: (parcelId: number) => void
}) {
  const [parcels, setParcels] = useState<ParcelRecord[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const loadParcels = async (query = '') => {
    setLoading(true)
    try {
      const data = await api.parcels(query)
      setParcels(data)
    } catch {
      // Fallback demo data
      setParcels([
        { id: 1, parcel_code: 'RW-10432', location: 'Kicukiro / Niboye / Kagarama', province: 'Kigali', district: 'Kicukiro', sector: 'Niboye', cell: 'Kagarama', village: 'Demo Village A', area_ha: 0.082, status: 'ACTIVE', current_owner_name: 'Jean Mugisha', updated_at: new Date().toISOString() },
        { id: 2, parcel_code: 'RW-88213', location: 'Gasabo / Remera / Nyabisindu', province: 'Kigali', district: 'Gasabo', sector: 'Remera', cell: 'Nyabisindu', village: 'Demo Village B', area_ha: 0.115, status: 'ACTIVE', current_owner_name: 'Alice Uwase', updated_at: new Date().toISOString() },
        { id: 3, parcel_code: 'RW-20991', location: 'Huye / Ngoma / Butare', province: 'Southern', district: 'Huye', sector: 'Ngoma', cell: 'Butare', village: 'Demo Village C', area_ha: 0.064, status: 'UNDER_REVIEW', current_owner_name: 'Eric Nkurunziza', updated_at: new Date().toISOString() },
        { id: 4, parcel_code: 'RW-33107', location: 'Musanze / Muhoza / Amajyaruguru', province: 'Northern', district: 'Musanze', sector: 'Muhoza', cell: 'Amajyaruguru', village: 'Demo Village D', area_ha: 0.099, status: 'ACTIVE', current_owner_name: 'Claudine Ingabire', updated_at: new Date().toISOString() },
        { id: 5, parcel_code: 'RW-55621', location: 'Nyarugenge / Nyamirambo / Rugarama', province: 'Kigali', district: 'Nyarugenge', sector: 'Nyamirambo', cell: 'Rugarama', village: 'Demo Village E', area_ha: 0.041, status: 'ACTIVE', current_owner_name: 'Patrick Habimana', updated_at: new Date().toISOString() },
        { id: 6, parcel_code: 'RW-77890', location: 'Rubavu / Gisenyi / Kivu', province: 'Western', district: 'Rubavu', sector: 'Gisenyi', cell: 'Kivu', village: 'Demo Village F', area_ha: 0.142, status: 'DISPUTED', current_owner_name: 'Solange Mukamana', updated_at: new Date().toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadParcels(search) }, [search])

  const filtered = parcels.filter(p => {
    if (filter === 'ACTIVE') return p.status === 'ACTIVE'
    if (filter === 'UNDER_REVIEW') return p.status === 'UNDER_REVIEW'
    if (filter === 'DISPUTED') return p.status === 'DISPUTED'
    return true
  })

  return (
    <section className="workspace-page">
      <div className="workspace-header">
        <div>
          <h1>Land Parcels</h1>
          <p>Cadastral inventory with ownership lineage and transfer records</p>
        </div>
        <div className="workspace-actions">
          <div className="page-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search by code, district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 0, color: 'inherit', width: '100%', outline: 'none', fontSize: '10px' }}
            />
          </div>
        </div>
      </div>

      <div className="page-tabs">
        <button className={filter === 'ALL' ? 'tab-active' : ''} onClick={() => setFilter('ALL')}>All Parcels ({parcels.length})</button>
        <button className={filter === 'ACTIVE' ? 'tab-active' : ''} onClick={() => setFilter('ACTIVE')}>Active</button>
        <button className={filter === 'UNDER_REVIEW' ? 'tab-active' : ''} onClick={() => setFilter('UNDER_REVIEW')}>Under Review</button>
        <button className={filter === 'DISPUTED' ? 'tab-active' : ''} onClick={() => setFilter('DISPUTED')}>Disputed</button>
      </div>

      {loading ? (
        <p style={{ color: '#888', fontSize: '12px' }}>Loading parcels...</p>
      ) : (
        <div className="reference-table reference-table--parcels">
          <div className="reference-header">
            <span>PARCEL ID</span>
            <span>LOCATION & JURISDICTION</span>
            <span>SURFACE AREA</span>
            <span>STATUS</span>
            <span>CURRENT REGISTERED OWNER</span>
            <span>ACTIONS</span>
          </div>
          {filtered.map((item) => (
            <div className="reference-row" key={item.id}>
              <strong>{item.parcel_code}</strong>
              <span>{item.location} ({item.province})</span>
              <span>{(item.area_ha * 10000).toLocaleString()} m²</span>
              <span className={`status-label ${item.status === 'UNDER_REVIEW' ? 'risk-label--medium' : item.status === 'DISPUTED' ? 'risk-label--high' : ''}`}>
                {item.status}
              </span>
              <span>{item.current_owner_name || 'Unassigned'}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-action btn-action--green" onClick={() => onSelectParcel(item.id)}>
                  Details
                </button>
                <button className="btn-action btn-action--purple" onClick={() => onNewTransaction(item.id)}>
                  + Transact
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* =========================================================================
   PARCEL DETAIL MODAL
   ========================================================================= */
function ParcelDetailModal({
  parcelId,
  onClose,
  onNewTransaction,
  onSelectTransaction,
}: {
  parcelId: number
  onClose: () => void
  onNewTransaction: () => void
  onSelectTransaction: (id: number) => void
}) {
  const [parcel, setParcel] = useState<ParcelRecord | null>(null)
  const [history, setHistory] = useState<OwnershipRecord[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.parcel(parcelId),
      api.ownership(parcelId),
      api.parcelTransactions(parcelId),
    ])
      .then(([p, h, t]) => {
        setParcel(p)
        setHistory(h)
        setTransactions(t)
      })
      .catch(() => {
        // Fallback for demo
        setParcel({
          id: parcelId,
          parcel_code: `RW-${parcelId === 1 ? '10432' : '20991'}`,
          location: 'Kicukiro / Niboye / Kagarama',
          province: 'Kigali',
          district: 'Kicukiro',
          sector: 'Niboye',
          cell: 'Kagarama',
          village: 'Demo Village A',
          area_ha: 0.082,
          status: 'ACTIVE',
          current_owner_name: 'Jean Mugisha',
          updated_at: new Date().toISOString(),
        })
        setHistory([
          { id: 1, transfer_date: '2020-04-12', previous_owner_name: null, new_owner_name: 'Jean Mugisha', reason_type: 'FIRST_REGISTRATION', supporting_reference: 'Land Registration Act 2020' },
          { id: 2, transfer_date: '2026-09-22', previous_owner_name: 'Jean Mugisha', new_owner_name: 'Jean Mugisha', reason_type: 'CORRECTION', supporting_reference: 'Boundary alignment' },
        ])
        setTransactions([
          { id: 1, transaction_code: 'TX-98231', parcel_id: parcelId, transaction_type: 'SALE', transaction_date: '2026-09-20', declared_value: '18500000', status: 'VERIFIED' },
          { id: 7, transaction_code: 'TX-98237', parcel_id: parcelId, transaction_type: 'SALE', transaction_date: '2026-09-26', declared_value: '19000000', status: 'PENDING' },
        ])
      })
      .finally(() => setLoading(false))
  }, [parcelId])

  if (loading || !parcel) {
    return (
      <div className="modal-overlay">
        <div className="modal-window">
          <p>Loading parcel records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window modal-window--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Parcel Profile: {parcel.parcel_code}</h2>
            <p>Cadastral reference and legal title deed history</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <span>Location / Jurisdiction</span>
            <strong>{parcel.location}</strong>
          </div>
          <div className="detail-card">
            <span>Administrative Hierarchy</span>
            <strong>{parcel.province} · {parcel.district} · {parcel.sector}</strong>
          </div>
          <div className="detail-card">
            <span>Registered Surface Area</span>
            <strong>{(parcel.area_ha * 10000).toLocaleString()} m² ({parcel.area_ha} ha)</strong>
          </div>
          <div className="detail-card">
            <span>Current Title Holder</span>
            <strong style={{ color: '#60a5fa' }}>{parcel.current_owner_name || 'No Owner Assigned'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 10px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#e5eae5' }}>
            <History size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Chronological Title Ownership Lineage
          </h3>
          <button className="btn-action btn-action--purple" onClick={onNewTransaction}>
            + Conveyance Application
          </button>
        </div>

        <div className="timeline">
          {history.map((h, i) => (
            <div className="timeline-item" key={i}>
              <div className="timeline-marker" />
              <div className="timeline-card">
                <strong>{new Date(h.transfer_date).toLocaleDateString()}</strong> — {h.reason_type}
                <p style={{ margin: '4px 0 0', color: '#aab2aa' }}>
                  {h.previous_owner_name ? `Transferred from ${h.previous_owner_name} to ` : 'Initial Title Registered to '}
                  <strong style={{ color: '#4ade80' }}>{h.new_owner_name}</strong>
                </p>
                {h.supporting_reference && <small style={{ color: '#6f7872' }}>Ref: {h.supporting_reference}</small>}
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ margin: '24px 0 10px', fontSize: '14px', color: '#e5eae5' }}>
          <FileText size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Associated Transactions on this Parcel
        </h3>
        <div className="reference-table">
          <div className="reference-header">
            <span>TX CODE</span>
            <span>TYPE</span>
            <span>DATE</span>
            <span>DECLARED VALUE (RWF)</span>
            <span>STATUS</span>
            <span>ACTION</span>
          </div>
          {transactions.map((tx) => (
            <div className="reference-row" key={tx.id}>
              <strong>{tx.transaction_code}</strong>
              <span>{tx.transaction_type}</span>
              <span>{new Date(tx.transaction_date).toLocaleDateString()}</span>
              <span>{Number(tx.declared_value || 0).toLocaleString()} RWF</span>
              <span className={`status-label ${tx.status === 'UNDER_REVIEW' ? 'risk-label--medium' : ''}`}>
                {tx.status}
              </span>
              <button className="btn-action btn-action--green" onClick={() => onSelectTransaction(tx.id)}>
                Inspect & Verify
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   TRANSACTIONS VIEW
   ========================================================================= */
function TransactionsView({
  onSelectTransaction,
  onOpenNewModal,
}: {
  onSelectTransaction: (id: number) => void
  onOpenNewModal: () => void
}) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const data = await api.transactions()
      setTransactions(data)
    } catch {
      setTransactions([
        { id: 1, transaction_code: 'TX-98231', parcel_id: 1, parcel_code: 'RW-10432', seller_name: 'Jean Mugisha', buyer_name: 'Diane Nsengimana', transaction_type: 'SALE', transaction_date: '2026-09-20', declared_value: 18500000, status: 'VERIFIED', latest_risk_level: 'LOW', latest_risk_score: 18 },
        { id: 2, transaction_code: 'TX-98232', parcel_id: 2, parcel_code: 'RW-88213', seller_name: 'Alice Uwase', buyer_name: 'Felix Byiringiro', transaction_type: 'SALE', transaction_date: '2026-09-21', declared_value: 24000000, status: 'UNDER_REVIEW', latest_risk_level: 'MEDIUM', latest_risk_score: 48 },
        { id: 3, transaction_code: 'TX-98233', parcel_id: 3, parcel_code: 'RW-20991', seller_name: 'Eric Nkurunziza', buyer_name: 'Grace Mutesi', transaction_type: 'TRANSFER', transaction_date: '2026-09-21', declared_value: 9700000, status: 'UNDER_REVIEW', latest_risk_level: 'HIGH', latest_risk_score: 82 },
        { id: 4, transaction_code: 'TX-98234', parcel_id: 4, parcel_code: 'RW-33107', seller_name: 'Claudine Ingabire', buyer_name: 'Grace Mutesi', transaction_type: 'SALE', transaction_date: '2026-09-19', declared_value: 15100000, status: 'VERIFIED', latest_risk_level: 'LOW', latest_risk_score: 15 },
        { id: 5, transaction_code: 'TX-98235', parcel_id: 5, parcel_code: 'RW-55621', seller_name: 'Patrick Habimana', buyer_name: 'Felix Byiringiro', transaction_type: 'INHERITANCE', transaction_date: '2026-09-18', declared_value: 8200000, status: 'UNDER_REVIEW', latest_risk_level: 'MEDIUM', latest_risk_score: 52 },
        { id: 6, transaction_code: 'TX-98236', parcel_id: 6, parcel_code: 'RW-77890', seller_name: 'Solange Mukamana', buyer_name: 'Thierry Uwimana', transaction_type: 'SALE', transaction_date: '2026-09-22', declared_value: 31000000, status: 'PENDING', latest_risk_level: 'HIGH', latest_risk_score: 76 },
        { id: 7, transaction_code: 'TX-98237', parcel_id: 1, parcel_code: 'RW-10432', seller_name: 'Jean Mugisha', buyer_name: 'Grace Mutesi', transaction_type: 'SALE', transaction_date: '2026-09-22', declared_value: 19000000, status: 'PENDING', latest_risk_level: 'HIGH', latest_risk_score: 84 },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTransactions() }, [])

  const filtered = transactions.filter((tx) => {
    if (filter === 'PENDING') return tx.status === 'PENDING'
    if (filter === 'UNDER_REVIEW') return tx.status === 'UNDER_REVIEW'
    if (filter === 'VERIFIED') return tx.status === 'VERIFIED'
    return true
  })

  return (
    <section className="workspace-page">
      <div className="workspace-header">
        <div>
          <h1>Conveyance Transactions</h1>
          <p>Verification queue, rule evaluations, and AI fraud-risk assessment</p>
        </div>
        <button className="btn-primary" onClick={onOpenNewModal}>
          <Plus size={15} /> New Transaction
        </button>
      </div>

      <div className="page-tabs">
        <button className={filter === 'ALL' ? 'tab-active' : ''} onClick={() => setFilter('ALL')}>All Transactions ({transactions.length})</button>
        <button className={filter === 'PENDING' ? 'tab-active' : ''} onClick={() => setFilter('PENDING')}>Pending</button>
        <button className={filter === 'UNDER_REVIEW' ? 'tab-active' : ''} onClick={() => setFilter('UNDER_REVIEW')}>Under Review</button>
        <button className={filter === 'VERIFIED' ? 'tab-active' : ''} onClick={() => setFilter('VERIFIED')}>Verified</button>
      </div>

      {loading ? (
        <p style={{ color: '#888', fontSize: '12px' }}>Loading transactions...</p>
      ) : (
        <div className="reference-table reference-table--transactions">
          <div className="reference-header">
            <span>TX CODE</span>
            <span>PARCEL</span>
            <span>SELLER</span>
            <span>BUYER</span>
            <span>TYPE</span>
            <span>VALUE (RWF)</span>
            <span>RISK</span>
            <span>STATUS</span>
            <span>ACTION</span>
          </div>
          {filtered.map((tx) => (
            <div className="reference-row" key={tx.id}>
              <strong>{tx.transaction_code}</strong>
              <span>{tx.parcel_code || `Parcel #${tx.parcel_id}`}</span>
              <span>{tx.seller_name || 'N/A'}</span>
              <span>{tx.buyer_name || 'N/A'}</span>
              <span>{tx.transaction_type}</span>
              <span>{Number(tx.declared_value || 0).toLocaleString()}</span>
              <span>
                {tx.latest_risk_level ? (
                  <span className={`risk-label risk-label--${tx.latest_risk_level.toLowerCase()}`}>
                    {tx.latest_risk_level} ({tx.latest_risk_score ?? '--'})
                  </span>
                ) : (
                  <span className="reference-muted">Unanalyzed</span>
                )}
              </span>
              <span className={`status-label ${tx.status === 'UNDER_REVIEW' ? 'risk-label--medium' : tx.status === 'VERIFIED' ? 'risk-label--low' : ''}`}>
                {tx.status}
              </span>
              <button className="btn-action btn-action--green" onClick={() => onSelectTransaction(tx.id)}>
                Inspect
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* =========================================================================
   TRANSACTION WORKSPACE MODAL (9-Rule Engine & AI Risk Analysis)
   ========================================================================= */
function TransactionWorkspaceModal({
  transactionId,
  onClose,
  onOpenCase,
}: {
  transactionId: number
  onClose: () => void
  onOpenCase: (caseId: number) => void
}) {
  const [tx, setTx] = useState<TransactionRecord | null>(null)
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([])
  const [overallStatus, setOverallStatus] = useState<string | null>(null)
  const [riskData, setRiskData] = useState<RiskResponse | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    api.transaction(transactionId)
      .then((data) => setTx(data))
      .catch(() => {
        setTx({
          id: transactionId,
          transaction_code: 'TX-98233',
          parcel_id: 3,
          parcel_code: 'RW-20991',
          seller_name: 'Eric Nkurunziza',
          buyer_name: 'Grace Mutesi',
          transaction_type: 'TRANSFER',
          transaction_date: '2026-09-21',
          declared_value: 9700000,
          status: 'UNDER_REVIEW',
          latest_risk_level: 'HIGH',
          latest_risk_score: 82,
        })
      })

    // Load stored results if any
    api.storedVerification(transactionId)
      .then((res) => {
        if (res.length > 0) {
          setVerificationResults(res)
          setOverallStatus(res.some(r => r.status === 'FAIL') ? 'REVIEW_REQUIRED' : 'PASS')
        }
      })
      .catch(() => {})

    api.storedRisk(transactionId)
      .then((res) => {
        if (res.length > 0) setRiskData(res[0])
      })
      .catch(() => {})
  }, [transactionId])

  const runVerification = async () => {
    setVerifying(true)
    try {
      const response: VerificationResponse = await api.verify(transactionId)
      setVerificationResults(response.results)
      setOverallStatus(response.overall_status)
      if (tx) setTx({ ...tx, status: response.overall_status === 'REVIEW_REQUIRED' ? 'UNDER_REVIEW' : 'VERIFIED' })
    } catch {
      // Fallback 9 rules
      const mockRules: VerificationResult[] = [
        { rule_name: 'Parcel exists', status: 'PASS', severity: 'LOW', explanation: 'The transaction references an existing parcel in available system records.' },
        { rule_name: 'Seller ownership match', status: 'FAIL', severity: 'HIGH', explanation: 'The seller does not match the registered owner in the available system records.' },
        { rule_name: 'Seller authorization', status: 'PASS', severity: 'LOW', explanation: 'The seller and parcel are recorded as active in available records.' },
        { rule_name: 'Active transaction already exists', status: 'FAIL', severity: 'HIGH', explanation: 'Another active transaction already exists for this parcel and should be reviewed.' },
        { rule_name: 'Conflicting transaction records', status: 'FAIL', severity: 'HIGH', explanation: 'Possible duplicate transaction: the same parcel appears in another active record with a different buyer.' },
        { rule_name: 'Recent ownership change', status: 'WARNING', severity: 'MEDIUM', explanation: 'WARNING: Recent ownership change detected. This is a risk indicator, not proof of fraud.' },
        { rule_name: 'Important fields consistent', status: 'PASS', severity: 'LOW', explanation: 'Required transaction fields are present and internally consistent.' },
        { rule_name: 'Unusual transaction frequency', status: 'WARNING', severity: 'MEDIUM', explanation: 'This parcel has 3 recorded transactions in the last 30 days, which is unusual.' },
        { rule_name: 'Multiple recent ownership changes', status: 'WARNING', severity: 'HIGH', explanation: 'Multiple ownership changes were recorded within a short period and require additional verification.' },
      ]
      setVerificationResults(mockRules)
      setOverallStatus('REVIEW_REQUIRED')
      if (tx) setTx({ ...tx, status: 'UNDER_REVIEW' })
    } finally {
      setVerifying(false)
    }
  }

  const runRiskAnalysis = async () => {
    setAnalyzing(true)
    try {
      const response = await api.analyze(transactionId)
      setRiskData(response)
    } catch {
      setRiskData({
        transaction_id: transactionId,
        risk_score: 82,
        risk_level: 'HIGH',
        model_version: 'random_forest-v1-synthetic',
        reasons: [
          'Seller does not match the latest recorded owner.',
          'Possible duplicate or conflicting transaction detected.',
          'Recent ownership change detected.',
          'Unusual transaction frequency detected.',
        ],
        analyzed_at: new Date().toISOString(),
      })
    } finally {
      setAnalyzing(false)
    }
  }

  if (!tx) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window modal-window--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Transaction Verification Workspace: {tx.transaction_code}</h2>
            <p>Parcel: {tx.parcel_code || `#${tx.parcel_id}`} · Type: {tx.transaction_type} · Declared Value: {Number(tx.declared_value || 0).toLocaleString()} RWF</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <span>Conveyance Parties</span>
            <strong>{tx.seller_name || 'Seller'} → {tx.buyer_name || 'Buyer'}</strong>
          </div>
          <div className="detail-card">
            <span>Submission Date</span>
            <strong>{new Date(tx.transaction_date).toLocaleDateString()}</strong>
          </div>
          <div className="detail-card">
            <span>Workflow Status</span>
            <strong style={{ color: tx.status === 'UNDER_REVIEW' ? '#fbbf24' : '#4ade80' }}>{tx.status}</strong>
          </div>
          <div className="detail-card">
            <span>Escalation Action</span>
            <button className="btn-secondary" style={{ marginTop: '2px', padding: '4px 10px', fontSize: '10px' }} onClick={() => onOpenCase(1)}>
              Open Case Review
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button className="btn-primary" onClick={runVerification} disabled={verifying}>
            <ShieldCheck size={16} />
            {verifying ? 'Evaluating 9 Rules...' : 'Execute Rule Verification Engine'}
          </button>
          <button className="btn-action btn-action--purple" style={{ padding: '9px 16px', fontSize: '11px' }} onClick={runRiskAnalysis} disabled={analyzing}>
            <Sparkles size={16} />
            {analyzing ? 'Scoring Risk...' : 'Run AI Fraud Risk Analysis'}
          </button>
        </div>

        {/* AI Risk Display Section */}
        {riskData && (
          <div className="risk-eval-box">
            <div className="risk-meter-row">
              <div className={`risk-score-display risk-score-display--${riskData.risk_level.toLowerCase()}`}>
                <span className="risk-score-num">{riskData.risk_score}</span>
                <span className="risk-score-sub">{riskData.risk_level}</span>
              </div>
              <div className="risk-meta-info">
                <h3>Machine Learning Fraud Risk Assessment: {riskData.risk_level} RISK</h3>
                <p>Model: {riskData.model_version} · Evaluated: {new Date(riskData.analyzed_at).toLocaleTimeString()}</p>
                <div style={{ marginTop: '8px' }}>
                  <span className={`risk-label risk-label--${riskData.risk_level.toLowerCase()}`}>
                    Risk Score: {riskData.risk_score} / 100
                  </span>
                </div>
              </div>
            </div>

            <p style={{ margin: '10px 0 6px', fontSize: '11px', color: '#abb2ab', fontWeight: 600 }}>
              Flagged Risk Indicators (Explainable AI):
            </p>
            <ul className="risk-reasons-list">
              {riskData.reasons.length > 0 ? (
                riskData.reasons.map((reason, i) => (
                  <li key={i} className="risk-reason-item">
                    <ShieldAlert size={14} style={{ color: '#f87171', flexShrink: 0, marginTop: '1px' }} />
                    <span>{reason}</span>
                  </li>
                ))
              ) : (
                <li className="risk-reason-item risk-reason-item--empty">
                  No elevated risk indicators detected in transaction patterns.
                </li>
              )}
            </ul>
            <div className="report-disclaimer">
              Notice: AI predictions are decision-support risk indicators only and do not constitute legal proof of fraud. Final determination is reserved for authorized human officers.
            </div>
          </div>
        )}

        {/* 9-Rule Verification Output Section */}
        {verificationResults.length > 0 && (
          <div style={{ marginTop: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#e5eae5' }}>
                Rule-Based Verification Engine Results (9 Deterministic Checks)
              </h3>
              <span className={`risk-label ${overallStatus === 'PASS' ? 'risk-label--low' : 'risk-label--high'}`}>
                Overall: {overallStatus}
              </span>
            </div>

            <div className="rules-container">
              {verificationResults.map((r, i) => (
                <div key={i} className={`rule-card rule-card--${r.status.toLowerCase()}`}>
                  <div className="rule-card-header">
                    <span className="rule-card-title">{r.rule_name}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="severity-pill">Severity: {r.severity}</span>
                      <span className={`rule-badge rule-badge--${r.status.toLowerCase()}`}>{r.status}</span>
                    </div>
                  </div>
                  <p className="rule-explanation">{r.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================================================
   CASES VIEW
   ========================================================================= */
function CasesView({ onSelectCase }: { onSelectCase: (id: number) => void }) {
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const loadCases = async () => {
    setLoading(true)
    try {
      const data = await api.cases()
      setCases(data)
    } catch {
      setCases([
        { id: 1, case_code: 'CASE-0441', transaction_id: 3, parcel_code: 'RW-20991', status: 'UNDER_REVIEW', review_notes: 'Recent ownership changes and a second pending sale. Officer review in progress.', assigned_name: 'Marie Habyarimana', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString(), risk_level: 'HIGH' },
        { id: 2, case_code: 'CASE-0442', transaction_id: 6, parcel_code: 'RW-77890', status: 'OPEN', review_notes: 'Possible duplicate application submitted concurrently.', assigned_name: 'Unassigned', created_at: new Date(Date.now() - 21600000).toISOString(), updated_at: new Date().toISOString(), risk_level: 'HIGH' },
        { id: 3, case_code: 'CASE-0443', transaction_id: 2, parcel_code: 'RW-88213', status: 'NEEDS_INFORMATION', review_notes: 'Requesting certified deed copy from district sector office.', assigned_name: 'Marie Habyarimana', created_at: new Date(Date.now() - 18000000).toISOString(), updated_at: new Date().toISOString(), risk_level: 'MEDIUM' },
        { id: 4, case_code: 'CASE-0444', transaction_id: 5, parcel_code: 'RW-55621', status: 'UNDER_REVIEW', review_notes: 'Seller account inactive in historical register.', assigned_name: 'Patrick Uwizeye', created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date().toISOString(), risk_level: 'MEDIUM' },
        { id: 5, case_code: 'CASE-0445', transaction_id: 7, parcel_code: 'RW-10432', status: 'OPEN', review_notes: 'Duplicate sale contract of TX-98231 for the same parcel code.', assigned_name: 'Marie Habyarimana', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), risk_level: 'HIGH' },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCases() }, [])

  const filtered = cases.filter(c => {
    if (filter === 'OPEN') return c.status === 'OPEN'
    if (filter === 'UNDER_REVIEW') return c.status === 'UNDER_REVIEW'
    if (filter === 'NEEDS_INFORMATION') return c.status === 'NEEDS_INFORMATION'
    if (filter === 'RESOLVED') return c.status === 'RESOLVED'
    return true
  })

  return (
    <section className="workspace-page">
      <div className="workspace-header">
        <div>
          <h1>Suspicious Cases & Human Officer Review</h1>
          <p>Multi-stage adjudication workflow for transactions flagged by verification rules or AI models</p>
        </div>
      </div>

      <div className="page-tabs">
        <button className={filter === 'ALL' ? 'tab-active' : ''} onClick={() => setFilter('ALL')}>All Cases ({cases.length})</button>
        <button className={filter === 'OPEN' ? 'tab-active' : ''} onClick={() => setFilter('OPEN')}>Open</button>
        <button className={filter === 'UNDER_REVIEW' ? 'tab-active' : ''} onClick={() => setFilter('UNDER_REVIEW')}>Under Review</button>
        <button className={filter === 'NEEDS_INFORMATION' ? 'tab-active' : ''} onClick={() => setFilter('NEEDS_INFORMATION')}>Needs Info</button>
        <button className={filter === 'RESOLVED' ? 'tab-active' : ''} onClick={() => setFilter('RESOLVED')}>Resolved</button>
      </div>

      {loading ? (
        <p style={{ color: '#888', fontSize: '12px' }}>Loading cases...</p>
      ) : (
        <div className="case-list">
          {filtered.map((item) => (
            <div className="case-card" key={item.id} style={{ cursor: 'pointer' }} onClick={() => onSelectCase(item.id)}>
              <div>
                <strong>{item.case_code}</strong>
                <span className={`risk-label risk-label--${(item.risk_level || 'HIGH').toLowerCase()}`}>
                  {item.risk_level || 'HIGH'}
                </span>
                <span className="case-status">{item.status.replace('_', ' ')}</span>
                <p>
                  Parcel: <strong>{item.parcel_code || 'Cadastral Parcel'}</strong> · Notes: {item.review_notes || 'No review notes entered yet.'}
                </p>
              </div>
              <div className="case-meta">
                <span>Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                <strong>Officer: {item.assigned_name || 'Unassigned'}</strong>
                <button className="btn-action btn-action--green" style={{ marginTop: '8px' }}>
                  Adjudicate Case
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* =========================================================================
   CASE REVIEW MODAL (Adjudication & Notes)
   ========================================================================= */
function CaseReviewModal({
  caseId,
  onClose,
  onUpdated,
}: {
  caseId: number
  onClose: () => void
  onUpdated: () => void
}) {
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [status, setStatus] = useState('UNDER_REVIEW')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    api.caseDetail(caseId)
      .then((data) => {
        setDetail(data)
        setStatus(data.case.status)
        setNotes(data.case.review_notes || '')
      })
      .catch(() => {
        setDetail({
          case: { id: caseId, case_code: 'CASE-0441', transaction_id: 3, parcel_code: 'RW-20991', status: 'UNDER_REVIEW', review_notes: 'Demo case: recent ownership changes and a second pending sale. Review required.', assigned_name: 'Marie Habyarimana', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          transaction: { id: 3, transaction_code: 'TX-98233', parcel_id: 3, parcel_code: 'RW-20991', seller_name: 'Eric Nkurunziza', buyer_name: 'Grace Mutesi', transaction_type: 'TRANSFER', transaction_date: '2026-09-21', declared_value: 9700000, status: 'UNDER_REVIEW' },
          ownership_history: [
            { id: 4, transfer_date: '2023-09-15', previous_owner_name: null, new_owner_name: 'Eric Nkurunziza', reason_type: 'FIRST_REGISTRATION' },
            { id: 5, transfer_date: '2026-09-10', previous_owner_name: 'Eric Nkurunziza', new_owner_name: 'Claudine Ingabire', reason_type: 'SALE' },
            { id: 6, transfer_date: '2026-09-20', previous_owner_name: 'Claudine Ingabire', new_owner_name: 'Eric Nkurunziza', reason_type: 'CORRECTION' },
          ],
          verification_results: [
            { rule_name: 'Active transaction already exists', status: 'FAIL', severity: 'HIGH', explanation: 'Another active transaction exists for this parcel.' },
            { rule_name: 'Recent ownership change', status: 'WARNING', severity: 'MEDIUM', explanation: 'Recent title change within the last 30 days.' },
          ],
          risk: { risk_score: 82, risk_level: 'HIGH', reasons: ['Recent ownership change detected.', 'Possible duplicate transaction detected.', 'Unusual transaction frequency detected.'] },
          disclaimer: 'Risk indicators are advisory. Final decisions remain with authorized human officers.',
        })
        setNotes('Demo case: recent ownership changes and a second pending sale. Review required.')
      })
  }, [caseId])

  const saveReview = async () => {
    setSaving(true)
    setFeedback('')
    try {
      await api.updateCase(caseId, { status, review_notes: notes })
      setFeedback('Review notes and case status updated successfully. Recorded in audit log.')
      onUpdated()
    } catch {
      setFeedback('Review updated locally (Demo mode).')
    } finally {
      setSaving(false)
    }
  }

  if (!detail) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window modal-window--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Case Review: {detail.case.case_code}</h2>
            <p>Subject Parcel: {detail.case.parcel_code || 'Cadastral Parcel'} · Transaction: {detail.transaction?.transaction_code || 'N/A'}</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <span>Transaction Type</span>
            <strong>{detail.transaction?.transaction_type || 'Sale'}</strong>
          </div>
          <div className="detail-card">
            <span>Parties</span>
            <strong>{detail.transaction?.seller_name || 'Seller'} → {detail.transaction?.buyer_name || 'Buyer'}</strong>
          </div>
          <div className="detail-card">
            <span>AI Risk Evaluation</span>
            <strong style={{ color: detail.risk?.risk_level === 'HIGH' ? '#f87171' : '#fbbf24' }}>
              {detail.risk?.risk_level || 'HIGH'} ({detail.risk?.risk_score || 82}/100)
            </strong>
          </div>
          <div className="detail-card">
            <span>Review Officer</span>
            <strong>{detail.case.assigned_name || 'Assigned Officer'}</strong>
          </div>
        </div>

        {/* Flagged Explanations */}
        {detail.risk?.reasons && detail.risk.reasons.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#f87171' }}>
              Flagged Risk Anomaly Indicators:
            </h4>
            <ul className="risk-reasons-list">
              {detail.risk.reasons.map((r, i) => (
                <li key={i} className="risk-reason-item">
                  <ShieldAlert size={14} style={{ color: '#f87171', flexShrink: 0 }} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Human Officer Review Form */}
        <div className="review-box">
          <h4>Authorized Officer Review & Decision Support</h4>
          <label style={{ display: 'block', fontSize: '11px', color: '#adb5ae', marginBottom: '6px' }}>
            Case Adjudication Status:
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', background: '#121413', border: '1px solid #303731', borderRadius: '6px', color: '#e5eae5' }}
            >
              <option value="OPEN">OPEN (Pending Investigation)</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW (Active Review)</option>
              <option value="NEEDS_INFORMATION">NEEDS_INFORMATION (Documents Requested)</option>
              <option value="RESOLVED">RESOLVED (Cleared for Conveyance)</option>
              <option value="CLOSED">CLOSED (Rejected / Conveyance Denied)</option>
            </select>
          </label>

          <label style={{ display: 'block', fontSize: '11px', color: '#adb5ae', marginTop: '12px', marginBottom: '6px' }}>
            Official Investigation Notes:
            <textarea
              className="notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter review findings, verified physical deed reference, and official justification..."
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <button className="btn-primary" onClick={saveReview} disabled={saving}>
              {saving ? 'Saving...' : 'Submit Official Review Decision'}
            </button>
            {feedback && <span style={{ color: '#4ade80', fontSize: '11px' }}>{feedback}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   OWNERS VIEW
   ========================================================================= */
function OwnersView({ onNewOwner }: { onNewOwner?: () => void }) {
  const [owners, setOwners] = useState<OwnerRecord[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.owners(search)
      .then((data) => setOwners(data))
      .catch(() => {
        setOwners([
          { id: 1, owner_code: 'O-2291', full_name: 'Jean Mugisha', identification_number: '11995521-DEMO', status: 'ACTIVE', parcels_owned: 2 },
          { id: 2, owner_code: 'O-2292', full_name: 'Alice Uwase', identification_number: '11980073-DEMO', status: 'ACTIVE', parcels_owned: 1 },
          { id: 3, owner_code: 'O-2293', full_name: 'Eric Nkurunziza', identification_number: '11974412-DEMO', status: 'ACTIVE', parcels_owned: 3 },
          { id: 4, owner_code: 'O-2294', full_name: 'Claudine Ingabire', identification_number: '11968820-DEMO', status: 'ACTIVE', parcels_owned: 1 },
          { id: 5, owner_code: 'O-2295', full_name: 'Patrick Habimana', identification_number: '11951150-DEMO', status: 'INACTIVE', parcels_owned: 1 },
          { id: 6, owner_code: 'O-2296', full_name: 'Solange Mukamana', identification_number: '11946634-DEMO', status: 'ACTIVE', parcels_owned: 2 },
        ])
      })
      .finally(() => setLoading(false))
  }, [search])

  return (
    <section className="workspace-page">
      <div className="workspace-header">
        <div>
          <h1>Registered Land Owners</h1>
          <p>Citizens and entities holding title deeds in available cadastre records</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onNewOwner && (
            <button className="btn-primary" onClick={onNewOwner}>
              <Plus size={15} /> New Owner
            </button>
          )}
          <div className="page-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search owners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 0, color: 'inherit', width: '100%', outline: 'none', fontSize: '10px' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#888', fontSize: '12px' }}>Loading owners...</p>
      ) : (
        <div className="reference-table reference-table--owners">
          <div className="reference-header">
            <span>OWNER ID</span>
            <span>FULL NAME</span>
            <span>IDENTIFICATION REFERENCE</span>
            <span>PARCELS OWNED</span>
            <span>STATUS</span>
          </div>
          {owners.map((owner) => (
            <div className="reference-row" key={owner.id}>
              <strong>{owner.owner_code}</strong>
              <span>{owner.full_name}</span>
              <span>{owner.identification_number || '1199 •••• DEMO'}</span>
              <span>{owner.parcels_owned} parcels</span>
              <span className={`status-label ${owner.status === 'INACTIVE' ? 'risk-label--high' : ''}`}>
                {owner.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* =========================================================================
   AUDIT LOGS VIEW
   ========================================================================= */
function AuditLogsView() {
  const [logs, setLogs] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.audit()
      .then((data) => setLogs(data))
      .catch(() => {
        setLogs([
          { id: 1, created_at: new Date().toISOString(), user_name: 'officer', action: 'TRANSACTION_VERIFICATION', entity: 'Transaction', entity_id: 'TX-98233' },
          { id: 2, created_at: new Date(Date.now() - 3600000).toISOString(), user_name: 'officer', action: 'AI_RISK_ANALYSIS', entity: 'Transaction', entity_id: 'TX-98236' },
          { id: 3, created_at: new Date(Date.now() - 7200000).toISOString(), user_name: 'officer', action: 'CASE_REVIEWED', entity: 'Case', entity_id: 'CASE-0441' },
          { id: 4, created_at: new Date(Date.now() - 86400000).toISOString(), user_name: 'admin', action: 'USER_CREATED', entity: 'User', entity_id: 'officer2' },
          { id: 5, created_at: new Date(Date.now() - 172800000).toISOString(), user_name: 'officer', action: 'OWNERSHIP_UPDATED', entity: 'Parcel', entity_id: 'RW-20991' },
          { id: 6, created_at: new Date(Date.now() - 259200000).toISOString(), user_name: 'officer', action: 'LOGIN', entity: 'User', entity_id: 'officer' },
        ])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="workspace-page">
      <div className="workspace-header">
        <div>
          <h1>Immutable Audit Trail</h1>
          <p>Cryptographically traceable operational and security log</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#888', fontSize: '12px' }}>Loading audit logs...</p>
      ) : (
        <div className="reference-table reference-table--audit-logs">
          <div className="reference-header">
            <span>TIMESTAMP (UTC)</span>
            <span>OPERATOR</span>
            <span>SECURITY / DOMAIN ACTION</span>
            <span>TARGET ENTITY</span>
            <span>TARGET ID</span>
          </div>
          {logs.map((log) => (
            <div className="reference-row" key={log.id}>
              <span>{new Date(log.created_at).toLocaleString()}</span>
              <strong>{log.user_name || 'System Operator'}</strong>
              <span className="status-label">{log.action}</span>
              <span>{log.entity}</span>
              <span>{log.entity_id || 'N/A'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* =========================================================================
   REPORTS VIEW
   ========================================================================= */
function ReportsView() {
  const [reportType, setReportType] = useState('verification')
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.report(reportType)
      .then((data) => setReportData(data))
      .catch(() => {
        // Fallback demo reports
        setReportData({
          title: `${reportType.toUpperCase()} Compliance Report`,
          disclaimer: 'Synthetic prototype data generated for graduation project evaluation.',
          items: [
            { date: '2026-09-26', transaction_id: 1, rule_name: 'Parcel exists', result: 'PASS', severity: 'LOW' },
            { date: '2026-09-26', transaction_id: 3, rule_name: 'Seller ownership match', result: 'FAIL', severity: 'HIGH' },
            { date: '2026-09-25', transaction_id: 6, rule_name: 'Conflicting transaction records', result: 'FAIL', severity: 'HIGH' },
          ],
        })
      })
      .finally(() => setLoading(false))
  }, [reportType])

  return (
    <section className="workspace-page">
      <div className="workspace-header">
        <div>
          <h1>Institutional Compliance Reports</h1>
          <p>Exportable audits, verification summaries, and risk disclosures</p>
        </div>
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer size={15} /> Print / Export PDF
        </button>
      </div>

      <div className="report-panel">
        <div className="report-tabs">
          <button className={`report-tab-btn ${reportType === 'verification' ? 'report-tab-btn--active' : ''}`} onClick={() => setReportType('verification')}>
            Transaction Verification Report
          </button>
          <button className={`report-tab-btn ${reportType === 'risk' ? 'report-tab-btn--active' : ''}`} onClick={() => setReportType('risk')}>
            AI Fraud-Risk Analysis Report
          </button>
          <button className={`report-tab-btn ${reportType === 'cases' ? 'report-tab-btn--active' : ''}`} onClick={() => setReportType('cases')}>
            Suspicious Cases Review Report
          </button>
          <button className={`report-tab-btn ${reportType === 'audit' ? 'report-tab-btn--active' : ''}`} onClick={() => setReportType('audit')}>
            System Audit Trail Report
          </button>
        </div>

        <div className="report-banner">
          <div>
            <strong style={{ fontSize: '13px', display: 'block' }}>{reportData?.title || 'Institutional Report'}</strong>
            <span>Generated: {new Date().toUTCString()} · Authority: Rwanda Cadastral Office</span>
          </div>
          <span className="status-label">OFFICIAL PROTOTYPE</span>
        </div>

        {loading ? (
          <p style={{ color: '#888', fontSize: '12px' }}>Generating report data...</p>
        ) : (
          <div className="reference-table">
            <div className="reference-header">
              <span>RECORD ID / DATE</span>
              <span>DOMAIN CLASSIFICATION</span>
              <span>STATUS / OUTCOME</span>
              <span>SEVERITY / SCORE</span>
            </div>
            {Array.isArray(reportData?.items) && reportData.items.slice(0, 10).map((row: any, i: number) => (
              <div className="reference-row" key={i}>
                <span>{row.date ? new Date(row.date).toLocaleDateString() : `#${i + 1}`}</span>
                <strong>{row.rule_name || row.case_code || row.action || `TX-${row.transaction_id}`}</strong>
                <span className={`status-label ${row.result === 'FAIL' || row.risk_level === 'HIGH' ? 'risk-label--high' : ''}`}>
                  {row.result || row.status || row.risk_level || 'RECORDED'}
                </span>
                <span>{row.severity || (row.risk_score ? `${row.risk_score}/100` : 'Normal')}</span>
              </div>
            ))}
          </div>
        )}

        <div className="report-disclaimer">
          {reportData?.disclaimer || 'Risk indicators are advisory only and do not constitute legal proof of fraud or ownership.'}
        </div>
      </div>
    </section>
  )
}

/* =========================================================================
   ADMIN USERS PAGE
   ========================================================================= */
function AdminUsersPage({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'OFFICER' })
  const [message, setMessage] = useState('')
  const [accounts, setAccounts] = useState<UserRecord[]>([])
  const [removeTarget, setRemoveTarget] = useState<UserRecord | null>(null)
  const [loadError, setLoadError] = useState('')

  const loadAccounts = () =>
    api.users()
      .then((data) => { setAccounts(data); setLoadError('') })
      .catch((err) => setLoadError(err.message || 'Only administrators can view users.'))

  useEffect(() => { loadAccounts() }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api.createUser(form)
      setMessage('User created successfully.')
      setForm({ full_name: '', email: '', password: '', role: 'OFFICER' })
      loadAccounts()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to create user.')
    }
  }

  const removeAccess = async () => {
    if (!removeTarget) return
    try {
      await api.disableUser(removeTarget.id)
      setRemoveTarget(null)
      loadAccounts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to revoke user')
    }
  }

  return (
    <section className="workspace-page">
      <button className="back-button" onClick={onBack}>← Back to Dashboard</button>
      <div className="workspace-header">
        <div>
          <h1>User Account Administration</h1>
          <p>Create authorized verification officer and auditor accounts</p>
        </div>
      </div>

      {loadError ? (
        <div className="access-message">{loadError}</div>
      ) : (
        <div className="admin-user-layout">
          <form className="user-create-form" onSubmit={submit}>
            <p className="eyebrow">Provision Account</p>
            <div className="create-fields">
              <label>
                Full Name
                <input required placeholder="e.g. Diane Uwimana" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </label>
              <label>
                Username or Email
                <input required type="email" placeholder="d.uwimana@landguard.local" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label>
                Temporary Password
                <input required type="password" minLength={8} placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </label>
              <label>
                Assigned Role
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="OFFICER">Verification Officer</option>
                  <option value="AUDITOR">Auditor (Read-Only)</option>
                </select>
              </label>
            </div>
            <button className="login-button" type="submit">Provision Account</button>
            {message && <p className="form-message">{message}</p>}
          </form>

          <div className="accounts-panel">
            <div className="accounts-heading">
              <strong>Authorized Personnel Directory</strong>
              <span>{accounts.filter(a => a.is_active).length} Active Accounts</span>
            </div>
            {accounts.map((acc) => (
              <div className="account-row" key={acc.id}>
                <div className="avatar">{initials(acc.full_name)}</div>
                <div className="account-name">
                  <strong>{acc.full_name}</strong>
                  <span>{acc.email}</span>
                </div>
                <span className={`account-role account-role--${acc.roles[0]?.name.toLowerCase()}`}>
                  {acc.roles[0]?.name}
                </span>
                <span className={acc.is_active ? 'account-active' : 'account-inactive'}>
                  {acc.is_active ? '● Active' : '● Revoked'}
                </span>
                <button
                  className="account-icon account-icon--delete"
                  aria-label="Revoke"
                  onClick={() => setRemoveTarget(acc)}
                  disabled={!acc.is_active || acc.id === 1}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {removeTarget && (
        <div className="modal-backdrop">
          <div className="remove-modal">
            <h2>Revoke {removeTarget.full_name}?</h2>
            <p>This user will immediately lose access to LandGuard AI.</p>
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setRemoveTarget(null)}>Cancel</button>
              <button className="remove-button" onClick={removeAccess}>Revoke Access</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/* =========================================================================
   NEW TRANSACTION REGISTRATION MODAL
   ========================================================================= */
function NewTransactionModal({
  defaultParcelId,
  onClose,
  onCreated,
}: {
  defaultParcelId: number | null
  onClose: () => void
  onCreated: (txId: number) => void
}) {
  const [parcelId, setParcelId] = useState(defaultParcelId ?? 1)
  const [sellerId, setSellerId] = useState(1)
  const [buyerId, setBuyerId] = useState(2)
  const [type, setType] = useState('SALE')
  const [value, setValue] = useState('18000000')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        parcel_id: Number(parcelId),
        seller_owner_id: Number(sellerId),
        buyer_owner_id: Number(buyerId),
        transaction_type: type,
        transaction_date: new Date().toISOString(),
        declared_value: value,
        status: 'PENDING',
      }
      const created = await api.createTransaction(payload)
      onCreated(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register transaction')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Register Conveyance Application</h2>
            <p>Submit land deed transfer for verification and risk scoring</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="login-form">
          <label>
            Target Parcel ID
            <input
              type="number"
              value={parcelId}
              onChange={(e) => setParcelId(Number(e.target.value))}
              required
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              Seller Owner ID
              <input
                type="number"
                value={sellerId}
                onChange={(e) => setSellerId(Number(e.target.value))}
                required
              />
            </label>
            <label>
              Buyer Owner ID
              <input
                type="number"
                value={buyerId}
                onChange={(e) => setBuyerId(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              Conveyance Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#101310', border: '1px solid #303731', borderRadius: '6px', color: '#fff' }}
              >
                <option value="SALE">SALE</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="INHERITANCE">INHERITANCE</option>
              </select>
            </label>
            <label>
              Declared Valuation (RWF)
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </label>
          </div>

          {error && <p className="login-error">{error}</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Registering...' : 'Register & Proceed to Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================================================
   NEW OWNER REGISTRATION MODAL
   ========================================================================= */
function NewOwnerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [ownerCode, setOwnerCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createOwner({
        owner_code: ownerCode,
        full_name: fullName,
        identification_number: idNumber || undefined,
        phone: phone || undefined,
        email: email || undefined,
        status,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register owner')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Register New Land Owner</h2>
            <p>Add a citizen or entity to the cadastre records</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="login-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              Owner Code
              <input
                required
                placeholder="e.g., OWN-2301"
                value={ownerCode}
                onChange={(e) => setOwnerCode(e.target.value)}
              />
            </label>
            <label>
              Full Name
              <input
                required
                placeholder="e.g., Diane Uwimana"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
          </div>

          <label>
            Identification Number
            <input
              placeholder="e.g., 11999999-DEMO"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              Phone Number
              <input
                placeholder="e.g., +250780000099"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label>
              Email Address
              <input
                type="email"
                placeholder="e.g., owner@landguard.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>

          <label>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '10px', background: '#101310', border: '1px solid #303731', borderRadius: '6px', color: '#fff' }}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>

          {error && <p className="login-error">{error}</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Registering...' : 'Register Owner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================================================
   USER PROFILE MODAL
   ========================================================================= */
function ProfileModal({
  user,
  onClose,
  onLogout,
}: {
  user: CurrentUser | null
  onClose: () => void
  onLogout: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>User Account Profile</h2>
            <p>Active authenticated session details</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <span>Operator Name</span>
            <strong>{user?.full_name || 'Verification Officer'}</strong>
          </div>
          <div className="detail-card">
            <span>Username / Email</span>
            <strong>{user?.email || 'officer@landguard.local'}</strong>
          </div>
          <div className="detail-card">
            <span>Assigned Role</span>
            <strong style={{ color: '#4ade80' }}>{user?.roles?.join(', ') || 'OFFICER'}</strong>
          </div>
          <div className="detail-card">
            <span>Account Status</span>
            <strong>{user?.is_active ? 'Active & Authorized' : 'Revoked'}</strong>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-secondary" style={{ color: '#f87171' }} onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   HELPERS & UI COMPONENTS
   ========================================================================= */
function Metric({
  icon: Icon,
  label,
  value,
  change,
  accent,
  onClick,
}: {
  icon: typeof Map
  label: string
  value: string
  change: string
  accent: string
  onClick?: () => void
}) {
  return (
    <div className="metric-card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className={`metric-icon metric-icon--${accent}`}>
        <Icon size={17} />
      </div>
      <div className="metric-info">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <span className="metric-change">{change}</span>
    </div>
  )
}

function RiskCard({
  label,
  value,
  percent,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  percent: string
  tone: string
  icon: typeof Check
}) {
  return (
    <div className={`risk-card risk-card--${tone}`}>
      <div className="risk-card-top">
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        <div className="risk-card-icon"><Icon size={16} /></div>
      </div>
      <div className="risk-card-bottom">
        <span>{percent} of queue</span>
        <div className="progress-track"><div style={{ width: percent }} /></div>
      </div>
    </div>
  )
}

function Bar({ value, label, tone, count }: { value: string; label: string; tone: string; count: string }) {
  return (
    <div className="bar-column">
      <div className={`bar bar--${tone}`} style={{ height: value }}>
        <span>{count}</span>
      </div>
      <strong>{label}</strong>
    </div>
  )
}

function riskPercent(value: number, total: number) {
  return total ? `${Math.round((value / total) * 100)}%` : '0%'
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function displayRole(role?: string) {
  if (role === 'OFFICER') return 'Verification Officer'
  if (role === 'ADMIN') return 'System Administrator'
  if (role === 'AUDITOR') return 'Compliance Auditor'
  return 'Authorized Officer'
}

function dashboardTitle(role?: string) {
  if (role === 'ADMIN') return 'Administration & Security Console'
  if (role === 'AUDITOR') return 'Cadastre Audit & Compliance Console'
  return 'Transaction Verification & Fraud-Risk Console'
}

function dashboardSubtitle(role?: string) {
  if (role === 'ADMIN') return 'Manage user authorizations, inspect system audit logs, and monitor cadastre operations.'
  if (role === 'AUDITOR') return 'Review historical transactions, verification rule outcomes, and compliance audit trails.'
  return 'Evaluate conveyance applications, trigger 9-rule verification checks, and review AI risk indicators.'
}

export default App
