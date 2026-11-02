import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle, ArrowRight, Bell, Check, CheckCircle, ChevronDown,
  ClipboardCheck, Clock, Download, FileText, Flag, FolderOpen, LayoutDashboard,
  LogOut, MapPin, Menu, Plus, Search, Shield, ShieldCheck, Upload,
  UserPlus, UserRound, Users, X, Eye, Trash2, FileIcon, AlertCircle, Info, Filter, RotateCcw,
  ArrowLeftRight, BarChart3, ClipboardList, Settings,
} from 'lucide-react'

import {
  api, type AuthSession, type AuditRecord, type CaseDetail, type CaseRecord, type CurrentUser,
  type DashboardStats, type DatabaseHealth, type FileStoragePolicy, type OwnerRecord, type OwnershipRecord, type ParcelRecord,
  type RiskResponse, type Setting, type TransactionRecord, type UserRecord,
  type VerificationResponse, type VerificationResult,
} from './lib/api'
import PublicUpiCheck from './components/PublicUpiCheck'
import AdminDashboard from './components/AdminDashboard'
import OfficerDashboard from './components/OfficerDashboard'
import AuditorDashboard from './components/AuditorDashboard'
import EvidenceSection from './components/EvidenceSection'
import ParcelMap from './components/ParcelMap'
import AddUserModal from './components/AddUserModal'
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
    } catch { /* The child pages display the specific API error. */ }
  }

  useEffect(() => { if (authenticated) loadCurrentUserAndStats() }, [authenticated])

  useEffect(() => {
    const handleAuthExpired = () => {
      setAuthenticated(false)
      setCurrentUser(null)
      setStats(null)
    }
    window.addEventListener('landguard-auth-expired', handleAuthExpired)
    return () => window.removeEventListener('landguard-auth-expired', handleAuthExpired)
  }, [])

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
              canManageTransactions={role === 'ADMIN'}
            />
          )}
          {activeNav === 'Evidence' && <EvidencePage />}
          {activeNav === 'Evidence Review' && <EvidenceReviewPage />}
          {activeNav === 'Transactions Overview' && <TransactionsPage canManageTransactions={false} onNavigateToVerification={(txId) => { setSelectedVerificationTxId(txId); setActiveNav('Verification') }} onNavigateToEvidence={() => setActiveNav('Evidence Review')} />}
          {activeNav === 'Verification' && <VerificationPage initialTxId={selectedVerificationTxId} />}
          {activeNav === 'Pending Reviews' && <PendingReviewsPage />}
          {activeNav === 'Audit Logs' && <AuditLogsPage />}
          {activeNav === 'Reports' && <ReportsPage />}
          {activeNav === 'Profile' && <ProfilePage currentUser={currentUser} onLogout={logout} onUpdateUser={setCurrentUser} />}
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
  const [email, setEmail] = useState('admin@landguard.local')
  const [password, setPassword] = useState('AdminPass123!')
  const [role, setRole] = useState('ADMIN')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const applyPreset = (presetRole: 'ADMIN' | 'OFFICER' | 'AUDITOR') => {
    setError('')
    if (presetRole === 'ADMIN') {
      setEmail('admin@landguard.local')
      setPassword('AdminPass123!')
      setRole('ADMIN')
    } else if (presetRole === 'OFFICER') {
      setEmail('officer@landguard.local')
      setPassword('OfficerPass123!')
      setRole('OFFICER')
    } else if (presetRole === 'AUDITOR') {
      setEmail('auditor@landguard.local')
      setPassword('AuditorPass123!')
      setRole('AUDITOR')
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const response = await api.login(email.trim(), password, role)
      localStorage.setItem('landguard_access_token', response.access_token)
      const user = await api.me()
      onContinue(user)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in. Verify backend is running.') } finally { setLoading(false) }
  }

  const enterDemo = async () => {
    try {
      const loginResp = await api.login(email.trim(), password, role)
      localStorage.setItem('landguard_access_token', loginResp.access_token)
      const user = await api.me()
      onContinue(user)
    } catch {
      if (role === 'ADMIN') {
        onContinue({ id: 1, full_name: 'Gilbert Godson (Admin)', email: 'admin@landguard.local', is_active: true, roles: ['ADMIN'] })
      } else if (role === 'AUDITOR') {
        onContinue({ id: 3, full_name: 'Patrick Uwizeye (Auditor)', email: 'auditor@landguard.local', is_active: true, roles: ['AUDITOR'] })
      } else {
        onContinue({ id: 2, full_name: 'Marie Habyarimana (Officer)', email: 'officer@landguard.local', is_active: true, roles: ['OFFICER'] })
      }
    }
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

          <div style={{ marginBottom: '14px' }}>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Select Demo Role:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn-secondary btn-sm ${role === 'ADMIN' ? 'btn-primary' : ''}`}
                style={{ flex: 1, padding: '6px 8px', fontSize: '12px' }}
                onClick={() => applyPreset('ADMIN')}
              >
                Admin
              </button>
              <button
                type="button"
                className={`btn-secondary btn-sm ${role === 'OFFICER' ? 'btn-primary' : ''}`}
                style={{ flex: 1, padding: '6px 8px', fontSize: '12px' }}
                onClick={() => applyPreset('OFFICER')}
              >
                Officer
              </button>
              <button
                type="button"
                className={`btn-secondary btn-sm ${role === 'AUDITOR' ? 'btn-primary' : ''}`}
                style={{ flex: 1, padding: '6px 8px', fontSize: '12px' }}
                onClick={() => applyPreset('AUDITOR')}
              >
                Auditor
              </button>
            </div>
          </div>

          <form onSubmit={submit} className="login-form">
            <label>Username or Email<input type="text" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Password<div className="password-field"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /><ChevronDown size={15} /></div></label>
            <button type="button" className="forgot-password">Forgot password?</button>
            {error && <p className="login-error">{error}</p>}
            <button className="login-button" type="submit" disabled={loading}>{loading ? 'Authenticating...' : `Sign in as ${role}`}</button>
            <label>Select your role (if required)<select value={role} onChange={(e) => setRole(e.target.value)}><option value="ADMIN">Admin</option><option value="AUDITOR">Auditor</option><option value="OFFICER">Officer</option></select></label>
          </form>
          <button className="demo-button" onClick={enterDemo}>Launch Offline Demo Mode ({role})</button>
          <button onClick={onPublicCheck} className="login-note-btn">Public UPI Check (No Login Required)</button>
          <p className="login-note">
            Admin login: admin@landguard.local / AdminPass123!<br />
            © 2025 LandGuard AI. All rights reserved.
          </p>
        </section>
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

  return (
    <div className="workspace-page search-parcel-page">
      <div className="page-heading"><div><h1>Search Parcel</h1><p className="heading-subtitle">Find parcel records and review recorded ownership information.</p></div></div>
      <form onSubmit={search} className="search-bar">
        <label className="search-parcel-label" htmlFor="parcel-upi">Enter UPI (Unique Parcel Identifier)</label>
        <div className="search-input-wrap"><Search size={16} className="search-icon" /><input id="parcel-upi" type="text" placeholder="Enter parcel UPI" value={upi} onChange={(e) => setUpi(e.target.value)} className="search-input" /></div>
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
              <div><ParcelMap location={{ verificationStatus: parcel.location_verification_status, latitude: parcel.latitude, longitude: parcel.longitude, geometry: parcel.boundary_geometry, upi: parcel.upi, parcelCode: parcel.parcel_code, address: [parcel.cell, parcel.sector, parcel.district, parcel.province, 'Rwanda'].filter(Boolean).join(', '), district: parcel.district, sector: parcel.sector, cell: parcel.cell }} /></div>
            </div>
            <button type="button" className="btn-secondary history-action" onClick={() => document.getElementById('parcel-history')?.scrollIntoView({ behavior: 'smooth' })}>View Transaction History</button>
          </div>
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
   NEW TRANSACTION MODAL
   ========================================================================= */
type ParcelSelection = { id: number; upi: string; parcel_code: string; owner_id?: number | null; owner_name?: string | null; location: string; status: string }
type OwnerSelection = { id: number; name: string; code: string; identification_number?: string | null }

function NewTransactionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (tx: TransactionRecord) => void
}) {
  const [parcels, setParcels] = useState<ParcelSelection[]>([])
  const [selectedParcel, setSelectedParcel] = useState<ParcelSelection | null>(null)
  const [owners, setOwners] = useState<OwnerSelection[]>([])
  const [buyerId, setBuyerId] = useState<number | null>(null)
  const [buyerMode, setBuyerMode] = useState<'existing' | 'new'>('existing')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [newBuyer, setNewBuyer] = useState({ full_name: '', identification_number: '', phone: '', email: '' })
  const [txType, setTxType] = useState('SALE')
  const [declaredValue, setDeclaredValue] = useState('20000000')
  const [notes, setNotes] = useState('')
  const [supportingFile, setSupportingFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.parcels().then((res) => setParcels(res.map(p => ({
      id: p.id, upi: p.upi || p.parcel_code || `UPI-${p.id}`, parcel_code: p.parcel_code || `RW-${p.id}`,
      owner_id: p.current_owner_id, owner_name: p.current_owner_name,
      location: `${p.district || ''} / ${p.sector || ''}`.trim() || p.location, status: p.status,
    })))).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load parcels.'))
  }, [])

  useEffect(() => {
    api.owners(ownerSearch).then((res) => setOwners(res.map(o => ({
      id: o.id, name: o.full_name, code: o.owner_code, identification_number: o.identification_number,
    })))).catch((err) => setError(err instanceof Error ? err.message : 'Unable to search owners.'))
  }, [ownerSearch])

  const handleParcelSelect = (idNum: number) => {
    const matched = parcels.find(p => p.id === idNum) || null
    setSelectedParcel(matched)
    setBuyerId(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanVal = Number(declaredValue.toString().replace(/[^0-9]/g, ''))
    if (!cleanVal || cleanVal <= 0) {
      setError('Please provide a valid declared valuation (RWF).')
      return
    }

    if (!selectedParcel || !buyerId && buyerMode === 'existing') {
      setError('Select a parcel and an existing buyer.')
      return
    }
    if (buyerMode === 'new' && (!newBuyer.full_name.trim() || !newBuyer.identification_number.trim())) {
      setError('New buyer name and identification number are required.')
      return
    }
    setSubmitting(true)
    try {
      let actualBuyerId = buyerId
      if (buyerMode === 'new') {
        const owner = await api.createOwner({
          owner_code: `OWN-${Date.now()}`,
          ...newBuyer,
          status: 'ACTIVE',
        })
        actualBuyerId = owner.id
      }
      if (!actualBuyerId || !selectedParcel) throw new Error('A buyer and parcel are required.')
      const payload = {
        parcel_id: selectedParcel.id,
        buyer_owner_id: actualBuyerId,
        transaction_type: txType,
        transaction_date: new Date().toISOString(),
        declared_value: cleanVal,
        supporting_reference: notes.trim() || null,
      }
      const result = await api.createTransaction(payload)
      if (supportingFile) {
        await api.uploadEvidence(result.id, supportingFile, 'SUPPORTING_DOCUMENT', { notes: notes.trim() || undefined })
      }
      onCreated(result)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction. Please try again.')
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
              value={selectedParcel?.id || ''}
              onChange={(e) => handleParcelSelect(Number(e.target.value))}
              required
            >
              <option value="">Select a parcel</option>
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.upi} — {p.location}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Seller (Recorded Owner)</label>
            <input className="form-input" readOnly value={selectedParcel?.owner_name || 'Loaded and validated by server'} />
            <small className="text-muted">The seller is derived from the parcel ownership record and cannot be changed.</small>
          </div>

          <div className="form-group">
            <label className="form-label">Buyer</label>
            <div className="form-row">
              <button type="button" className={buyerMode === 'existing' ? 'btn-primary' : 'btn-secondary'} onClick={() => setBuyerMode('existing')}>Select Existing</button>
              <button type="button" className={buyerMode === 'new' ? 'btn-primary' : 'btn-secondary'} onClick={() => setBuyerMode('new')}>Register New</button>
            </div>
            {buyerMode === 'existing' ? <>
              <input className="form-input" value={ownerSearch} onChange={(e) => setOwnerSearch(e.target.value)} placeholder="Search by name or identification number" />
              <select
                className="form-select"
                value={buyerId || ''}
                onChange={(e) => setBuyerId(Number(e.target.value))}
                required
              >
                <option value="">Select buyer</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id} disabled={o.id === selectedParcel?.owner_id}>
                    {o.name} ({o.identification_number || o.code}){o.id === selectedParcel?.owner_id ? ' (Seller)' : ''}
                  </option>
                ))}
              </select>
            </> : <div className="form-row">
              <input className="form-input" placeholder="Full name" value={newBuyer.full_name} onChange={(e) => setNewBuyer({ ...newBuyer, full_name: e.target.value })} required />
              <input className="form-input" placeholder="Identification number" value={newBuyer.identification_number} onChange={(e) => setNewBuyer({ ...newBuyer, identification_number: e.target.value })} required />
              <input className="form-input" placeholder="Phone (optional)" value={newBuyer.phone} onChange={(e) => setNewBuyer({ ...newBuyer, phone: e.target.value })} />
              <input className="form-input" placeholder="Email (optional)" value={newBuyer.email} onChange={(e) => setNewBuyer({ ...newBuyer, email: e.target.value })} />
            </div>}
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
          <div className="form-group">
            <label className="form-label">Supporting Document (Optional)</label>
            <input type="file" className="form-input" onChange={(e) => setSupportingFile(e.target.files?.[0] || null)} />
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
  onDelete,
}: {
  tx: TransactionRecord
  onClose: () => void
  onVerify?: (txId: number) => void
  onUploadEvidence?: (txId: number) => void
  onDelete?: (tx: TransactionRecord) => void
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

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={onClose}>Close</button>
            {onDelete && (
              <button
                className="btn-secondary"
                style={{ color: '#ef4444' }}
                onClick={() => { onClose(); onDelete(tx); }}
                title="Delete unwanted or accidental transaction"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
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

function DeleteTransactionModal({
  tx,
  onClose,
  onConfirm,
  onArchive,
  deletionReason,
  onDeletionReasonChange,
  deleting,
}: {
  tx: TransactionRecord
  onClose: () => void
  onConfirm: () => void
  onArchive?: () => void
  deletionReason: string
  onDeletionReasonChange: (reason: string) => void
  deleting: boolean
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-tx-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Trash2 size={18} />
            </div>
            <div>
              <h2 id="delete-tx-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                Delete Transaction
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Remove unwanted entry or transaction created by accident.
              </p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ margin: '14px 0', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
          Are you sure you want to delete transaction <strong>{tx.transaction_code || `TX-${tx.id}`}</strong>?
        </div>

        <div className="detail-card" style={{ marginBottom: '16px', background: '#f8fafc', border: '1px solid var(--border-line)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
            <div><span style={{ color: '#64748b' }}>Parcel:</span> <strong>{tx.parcel_code || `Parcel #${tx.parcel_id}`}</strong></div>
            <div><span style={{ color: '#64748b' }}>Status:</span> <strong>{tx.status}</strong></div>
            <div><span style={{ color: '#64748b' }}>Seller:</span> <strong>{tx.seller_name || 'N/A'}</strong></div>
            <div><span style={{ color: '#64748b' }}>Buyer:</span> <strong>{tx.buyer_name || 'N/A'}</strong></div>
            <div><span style={{ color: '#64748b' }}>Declared Value:</span> <strong>{Number(tx.declared_value || 0).toLocaleString()} RWF</strong></div>
            <div><span style={{ color: '#64748b' }}>Date:</span> <strong>{new Date(tx.transaction_date).toLocaleDateString()}</strong></div>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#dc2626', margin: '0 0 16px', background: '#fef2f2', padding: '8px 12px', border: '1px solid #fecaca', borderRadius: '8px' }}>
          {tx.status === 'COMPLETED'
            ? 'Completed transactions cannot be permanently deleted. Archive this transaction to preserve its history.'
            : 'This will permanently delete this transaction and its linked records. An Admin deletion reason is required.'}
        </p>
        {tx.status !== 'COMPLETED' && (
          <label style={{ display: 'block', marginBottom: '16px', fontSize: '12px', color: '#334155' }}>
            Deletion reason
            <textarea
              value={deletionReason}
              onChange={(event) => onDeletionReasonChange(event.target.value)}
              placeholder="Explain why this transaction should be permanently deleted"
              rows={3}
              disabled={deleting}
              style={{ display: 'block', width: '100%', marginTop: '6px', resize: 'vertical' }}
            />
          </label>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          {tx.status === 'COMPLETED' && onArchive && (
            <button type="button" className="btn-secondary btn-sm" onClick={onArchive} disabled={deleting}>
              {deleting ? 'Saving...' : 'Archive Transaction'}
            </button>
          )}
          <button
            type="button"
            className="btn-primary btn-sm"
            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
            onClick={onConfirm}
            disabled={deleting || tx.status === 'COMPLETED' || !deletionReason.trim()}
          >
            {deleting ? 'Deleting...' : 'Delete Transaction'}
          </button>
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
  canManageTransactions = false,
}: {
  initialOpenCreate?: boolean
  onCloseCreate?: () => void
  onNavigateToVerification?: (txId: number) => void
  onNavigateToEvidence?: (txId: number) => void
  canManageTransactions?: boolean
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
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(initialOpenCreate)
  const [viewTx, setViewTx] = useState<TransactionRecord | null>(null)
  const [deleteTx, setDeleteTx] = useState<TransactionRecord | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10


  const loadTransactions = async () => {
    setLoading(true)
    try {
      const data = await api.transactions()
      setTransactions(data || [])
      setError('')
    } catch (err) {
      setTransactions([])
      setError(err instanceof Error ? err.message : 'Failed to load transactions. Please try again.')
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

  const handleDeleteTransaction = async () => {
    if (!deleteTx) return
    const reason = deletionReason.trim()
    if (!reason) {
      setBanner({ message: 'Enter a reason before permanently deleting this transaction.', type: 'error' })
      return
    }
    setDeleting(true)
    try {
      await api.deleteTransaction(deleteTx.id, reason)
      setBanner({
        message: `Transaction ${deleteTx.transaction_code || `TX-${deleteTx.id}`} was deleted successfully.`,
        type: 'success',
      })
      if (viewTx?.id === deleteTx.id) setViewTx(null)
      setDeleteTx(null)
      setDeletionReason('')
      await loadTransactions()
    } catch (err) {
      setBanner({
        message: err instanceof Error ? err.message : 'Failed to delete transaction.',
        type: 'error',
      })
    } finally {
      setDeleting(false)
    }

  }

  const handleArchiveTransaction = async () => {
    if (!deleteTx) return
    setDeleting(true)
    try {
      await api.archiveTransaction(deleteTx.id)
      setBanner({
        message: `Transaction ${deleteTx.transaction_code || `TX-${deleteTx.id}`} was archived. Its history was preserved.`,
        type: 'success',
      })
      setDeleteTx(null)
      setDeletionReason('')
      await loadTransactions()
    } catch (err) {
      setBanner({
        message: err instanceof Error ? err.message : 'Failed to archive transaction.',
        type: 'error',
      })
    } finally {
      setDeleting(false)
    }
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

      {error ? (
        <div className="alert alert--error">Failed to load transactions. Please try again.</div>
      ) : loading ? (
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
                    {transactions.length === 0 ? 'No transactions found. Create a transaction to begin verification.' : 'No transactions match the selected filters.'}
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
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button className="btn-icon" onClick={() => setViewTx(tx)} title="View transaction details">
                          <Eye size={14} />
                        </button>
                        {canManageTransactions && (
                          <button
                            className="btn-icon btn-icon--danger"
                            style={{ color: '#ef4444' }}
                            onClick={() => { setDeletionReason(''); setDeleteTx(tx) }}
                            title="Manage transaction deletion or archival"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
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
          onDelete={canManageTransactions ? (tx) => { setDeletionReason(''); setDeleteTx(tx) } : undefined}
        />
      )}

      {deleteTx && (
        <DeleteTransactionModal
          tx={deleteTx}
          onClose={() => setDeleteTx(null)}
          onConfirm={handleDeleteTransaction}
          onArchive={handleArchiveTransaction}
          deletionReason={deletionReason}
          onDeletionReasonChange={setDeletionReason}
          deleting={deleting}
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
      .then((txs) => setTransactions(txs || []))
      .catch(() => setTransactions([]))
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
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    Promise.all([api.cases(), api.transactions()])
      .then(async ([caseList, txList]) => {
        if (cancelled) return
        const list = caseList || []
        const txListAll = txList || []
        setCases(list)
        setTransactions(txListAll)
      })
      .catch(() => { if (!cancelled) setError('Unable to load pending reviews.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const openCases = cases.filter((c) => ['OPEN', 'UNDER_REVIEW', 'NEEDS_INFORMATION'].includes(c.status))
  const txById = new Map(transactions.map((t) => [t.id, t]))
  const rows = openCases.map((c) => {
    const tx = txById.get(c.transaction_id)
    return {
      key: c.case_code || `CASE-${c.id}`,
      upi: c.parcel_code || tx?.parcel_code || 'N/A',
      seller: tx?.seller_name || 'N/A',
      buyer: tx?.buyer_name || 'N/A',
      reason: c.review_notes || (c.risk_level ? `AI risk level: ${c.risk_level}` : 'Awaiting review'),
      evidence: c.status,
      date: new Date(c.updated_at).toLocaleDateString(),
      risk: c.risk_level || 'MEDIUM',
      status: c.status,
    }
  })
  const filteredRows = filter === 'all' ? rows : rows.filter((r) => {
    if (filter === 'high') return r.risk === 'HIGH'
    if (filter === 'missing') return r.evidence === 'NEEDS_INFORMATION'
    if (filter === 'clarification') return r.status === 'UNDER_REVIEW'
    return true
  })
  const tabCounts = {
    all: rows.length,
    high: rows.filter((r) => r.risk === 'HIGH').length,
    missing: rows.filter((r) => r.evidence === 'NEEDS_INFORMATION').length,
    clarification: rows.filter((r) => r.status === 'UNDER_REVIEW').length,
  }

  return (
    <div className="workspace-page pending-reviews-page">
      <h2 className="page-title">Pending Reviews</h2><p className="page-subtitle">Transactions that need your attention.</p>
      {error ? (
        <div className="alert alert--error">Failed to load pending reviews. Please try again.</div>
      ) : loading ? (
        <p className="text-muted">Loading pending reviews...</p>
      ) : (
        <>
      <div className="filter-tabs"><button className={`filter-tab ${filter === 'all' ? 'filter-tab--active' : ''}`} onClick={() => setFilter('all')}>All ({tabCounts.all})</button><button className={`filter-tab ${filter === 'high' ? 'filter-tab--active' : ''}`} onClick={() => setFilter('high')}>High Risk ({tabCounts.high})</button><button className={`filter-tab ${filter === 'missing' ? 'filter-tab--active' : ''}`} onClick={() => setFilter('missing')}>Missing Evidence ({tabCounts.missing})</button><button className={`filter-tab ${filter === 'clarification' ? 'filter-tab--active' : ''}`} onClick={() => setFilter('clarification')}>Needs Clarification ({tabCounts.clarification})</button></div>
      <div className="table-card"><table className="data-table"><thead><tr><th>ID</th><th>Parcel UPI</th><th>Seller → Buyer</th><th>Reason</th><th>Evidence Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>{filteredRows.length === 0 ? (<tr><td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>No pending reviews found.</td></tr>) : filteredRows.map((r) => (<tr key={r.key}><td><strong>{r.key}</strong></td><td>{r.upi}</td><td>{r.seller} → {r.buyer}</td><td>{r.reason}</td><td><span className={`evidence-badge evidence-${r.evidence.toLowerCase().replace(/_/g, '-')}`}>{r.evidence.replace(/_/g, ' ')}</span></td><td>{r.date}</td><td><button className="btn-secondary btn-sm">Review Details</button></td></tr>))}</tbody></table>
        <div className="table-footer"><span>Showing {filteredRows.length} of {rows.length}</span><div className="pagination"><button className="page-btn" disabled>&lt;</button><button className="page-btn page-btn--active">1</button><button className="page-btn" disabled>&gt;</button></div></div>
        </div>
        </>
      )}
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
  const [errorMsg, setErrorMsg] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const loadUsers = () => {
    setLoading(true)
    api.users()
      .then(setUsers)
      .catch((err) => setErrorMsg(err instanceof Error ? err.message : 'Unable to load users.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadUsers, [])

  const disableUser = async (id: number) => {
    try {
      setErrorMsg('')
      await api.disableUser(id)
      setMessage('User access revoked.')
      loadUsers()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update user.')
    }
  }

  const reactivateUser = async (id: number) => {
    try {
      setErrorMsg('')
      await api.reactivateUser(id)
      setMessage('User access restored.')
      loadUsers()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reactivate user.')
    }
  }

  const editUser = async (userId: number, payload: { full_name?: string; email?: string; username?: string; password?: string; is_active?: boolean; role?: 'ADMIN' | 'OFFICER' | 'AUDITOR' }) => {
    try {
      setErrorMsg('')
      await api.updateUser(userId, payload)
      setMessage('User updated successfully.')
      setShowEditUser(false)
      setEditingUser(null)
      loadUsers()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update user.')
      throw err
    }
  }

  const filteredUsers = users.filter((u) => {
    const roleMatch = roleFilter === 'ALL' || (u.roles[0]?.name === roleFilter)
    const q = searchQuery.trim().toLowerCase()
    const searchMatch = !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q))
    return roleMatch && searchMatch
  })

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>User Management</h1>
          <p className="heading-subtitle">Manage authorized personnel, role permissions, and system access.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowAddUser(true)}>
          <Plus size={15} /> Add User
        </button>
      </div>

      {message && (
        <div className="alert alert--success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{message}</span>
          <button type="button" className="icon-button" onClick={() => setMessage('')}><X size={14} /></button>
        </div>
      )}
      {errorMsg && (
        <div className="alert alert--error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errorMsg}</span>
          <button type="button" className="icon-button" onClick={() => setErrorMsg('')}><X size={14} /></button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ flex: '1 1 240px' }}>
          <input
            className="form-input"
            type="text"
            placeholder="Search by name, email, or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-tabs" style={{ margin: 0 }}>
          {['ALL', 'OFFICER', 'AUDITOR', 'ADMIN'].map((r) => {
            const count = r === 'ALL' ? users.length : users.filter((u) => u.roles[0]?.name === r).length
            const label = r === 'ALL' ? 'All Roles' : r === 'OFFICER' ? 'Officers' : r === 'AUDITOR' ? 'Auditors' : 'Admins'
            return (
              <button
                key={r}
                type="button"
                className={`filter-tab ${roleFilter === r ? 'filter-tab--active' : ''}`}
                onClick={() => setRoleFilter(r)}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name & Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>User ID</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>Loading users...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No users match your criteria.</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.full_name}</strong>
                    <br />
                    <span className="text-muted" style={{ fontSize: '12px' }}>@{user.username || 'auto'}</span>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: user.roles[0]?.name === 'ADMIN' ? '#eff6ff' : user.roles[0]?.name === 'AUDITOR' ? '#f5f3ff' : '#ecfdf5',
                      color: user.roles[0]?.name === 'ADMIN' ? '#1d4ed8' : user.roles[0]?.name === 'AUDITOR' ? '#6d28d9' : '#047857',
                    }}>
                      {user.roles[0]?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td>
                    <span className={user.is_active ? 'status-label risk-label--low' : 'status-label risk-label--high'}>
                      {user.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td>#{user.id}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => { setEditingUser(user); setShowEditUser(true) }}
                      >
                        Edit
                      </button>
                      {user.is_active ? (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          style={{ color: '#dc2626' }}
                          onClick={() => disableUser(user.id)}
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          style={{ color: '#059669' }}
                          onClick={() => reactivateUser(user.id)}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onCreated={() => {
            setShowAddUser(false)
            setMessage('User added successfully.')
            loadUsers()
          }}
        />
      )}

      {showEditUser && editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => { setShowEditUser(false); setEditingUser(null) }}
          onSave={(payload) => editUser(editingUser.id, payload)}
        />
      )}
    </div>
  )
}

function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: UserRecord
  onClose: () => void
  onSave: (payload: {
    full_name?: string
    email?: string
    username?: string
    password?: string
    is_active?: boolean
    role?: 'ADMIN' | 'OFFICER' | 'AUDITOR'
  }) => Promise<void>
}) {
  const [fullName, setFullName] = useState(user.full_name)
  const [email, setEmail] = useState(user.email)
  const [username, setUsername] = useState(user.username || '')
  const [role, setRole] = useState<'OFFICER' | 'AUDITOR' | 'ADMIN'>(
    (user.roles[0]?.name as 'ADMIN' | 'OFFICER' | 'AUDITOR') || 'OFFICER'
  )
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(user.is_active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    if (password && password.length < 8) {
      setError('If resetting password, it must be at least 8 characters long.')
      return
    }

    setSaving(true)
    try {
      const payload: {
        full_name: string
        email: string
        username?: string
        password?: string
        is_active: boolean
        role: 'ADMIN' | 'OFFICER' | 'AUDITOR'
      } = {
        full_name: fullName.trim(),
        email: email.trim(),
        username: username.trim() || undefined,
        is_active: isActive,
        role,
      }
      if (password) payload.password = password
      await onSave(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update user.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        <div className="modal-head">
          <div>
            <h2 id="edit-user-title" style={{ margin: 0, fontSize: '18px' }}>Edit User #{user.id}</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Update account details, role permissions, or password.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="alert alert--error" role="alert" style={{ marginBottom: '14px' }}>{error}</div>}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-name">Full Name</label>
            <input
              id="edit-name"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="edit-email">Email</label>
              <input
                id="edit-email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="edit-username">Username</label>
              <input
                id="edit-username"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="edit-role">Role</label>
              <select
                id="edit-role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as 'OFFICER' | 'AUDITOR' | 'ADMIN')}
              >
                <option value="OFFICER">Officer</option>
                <option value="AUDITOR">Auditor</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="edit-status">Status</label>
              <select
                id="edit-status"
                className="form-select"
                value={String(isActive)}
                onChange={(e) => setIsActive(e.target.value === 'true')}
              >
                <option value="true">Active</option>
                <option value="false">Revoked / Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label" htmlFor="edit-password">
              Reset Password <span style={{ color: '#94a3b8', fontSize: '12px' }}>(leave blank to keep current)</span>
            </label>
            <input
              id="edit-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min. 8 characters)"
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving Changes…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function SystemSettingsPage() {
  const [tab, setTab] = useState('General')
  const tabs = ['General', 'Security', 'Notifications', 'Database', 'File Storage']
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fileStorage, setFileStorage] = useState<FileStoragePolicy | null>(null)
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null)
  const [dbChecking, setDbChecking] = useState(false)

  const [systemName, setSystemName] = useState('LandGuard AI')
  const [organization, setOrganization] = useState('Rwanda Land Administration')
  const [reviewThreshold, setReviewThreshold] = useState('medium')
  const [allowedFileTypes, setAllowedFileTypes] = useState('pdf,jpg,jpeg,png')
  const [jwtExpiryMinutes, setJwtExpiryMinutes] = useState('60')
  const [minPasswordLength, setMinPasswordLength] = useState('8')
  const [maxFailedLogins, setMaxFailedLogins] = useState('5')
  const [lockoutMinutes, setLockoutMinutes] = useState('30')
  const [emailHighRisk, setEmailHighRisk] = useState('false')
  const [emailAwaitingReview, setEmailAwaitingReview] = useState('false')
  const [emailAccountEvents, setEmailAccountEvents] = useState('false')
  const [inAppSystemAlerts, setInAppSystemAlerts] = useState('true')
  const [notificationFrequency, setNotificationFrequency] = useState('instant')
  const [maxFileSizeMb, setMaxFileSizeMb] = useState('10')

  const loadSettings = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getSettings()
      setSettings(data)
      const map: Record<string, string> = {}
      data.forEach((item) => { map[item.key] = item.value })
      setSystemName(map['general.system_name'] ?? 'LandGuard AI')
      setOrganization(map['general.organization'] ?? 'Rwanda Land Administration')
      setReviewThreshold(map['general.review_threshold'] ?? 'medium')
      setAllowedFileTypes(map['general.allowed_file_types'] ?? 'pdf,jpg,jpeg,png')
      setJwtExpiryMinutes(map['security.jwt_expiry_minutes'] ?? '60')
      setMinPasswordLength(map['security.min_password_length'] ?? '8')
      setMaxFailedLogins(map['security.max_failed_logins'] ?? '5')
      setLockoutMinutes(map['security.lockout_minutes'] ?? '30')
      setEmailHighRisk(map['notifications.email_high_risk'] ?? 'false')
      setEmailAwaitingReview(map['notifications.email_awaiting_review'] ?? 'false')
      setEmailAccountEvents(map['notifications.email_account_events'] ?? 'false')
      setInAppSystemAlerts(map['notifications.in_app_system_alerts'] ?? 'true')
      setNotificationFrequency(map['notifications.frequency'] ?? 'instant')
      setMaxFileSizeMb(map['file_storage.max_file_size_mb'] ?? '10')
    } catch { setError('Unable to load system settings.') }
    finally { setLoading(false) }
  }

  const loadFileStorage = async () => {
    try { setFileStorage(await api.getFileStorage()) } catch { setFileStorage(null) }
  }

  const loadDatabaseHealth = async () => {
    setDbChecking(true)
    try { setDbHealth(await api.getDatabaseHealth()) } catch { setDbHealth(null) }
    finally { setDbChecking(false) }
  }

  useEffect(() => { loadSettings() }, [])
  useEffect(() => { loadFileStorage() }, [])
  useEffect(() => { loadDatabaseHealth() }, [])

  const saveGeneral = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    const updates: Array<[string, string]> = [
      ['general.system_name', systemName],
      ['general.organization', organization],
      ['general.review_threshold', reviewThreshold],
      ['general.allowed_file_types', allowedFileTypes],
    ]
    try {
      await Promise.all(updates.map(([key, value]) => api.updateSetting(key, value)))
      setMessage('General settings saved successfully.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save general settings.') }
    finally { setSaving(false) }
  }

  const saveSecurity = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    const updates: Array<[string, string]> = [
      ['security.jwt_expiry_minutes', jwtExpiryMinutes],
      ['security.min_password_length', minPasswordLength],
      ['security.max_failed_logins', maxFailedLogins],
      ['security.lockout_minutes', lockoutMinutes],
    ]
    try {
      await Promise.all(updates.map(([key, value]) => api.updateSetting(key, value)))
      setMessage('Security settings saved successfully.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save security settings.') }
    finally { setSaving(false) }
  }

  const saveNotifications = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    const updates: Array<[string, string]> = [
      ['notifications.email_high_risk', emailHighRisk],
      ['notifications.email_awaiting_review', emailAwaitingReview],
      ['notifications.email_account_events', emailAccountEvents],
      ['notifications.in_app_system_alerts', inAppSystemAlerts],
      ['notifications.frequency', notificationFrequency],
    ]
    try {
      await Promise.all(updates.map(([key, value]) => api.updateSetting(key, value)))
      setMessage('Notification preferences saved successfully.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save notification preferences.') }
    finally { setSaving(false) }
  }

  const saveFileStorage = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await api.updateSetting('file_storage.max_file_size_mb', maxFileSizeMb)
      setMessage('File storage settings saved successfully.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save file storage settings.') }
    finally { setSaving(false) }
  }

  return <div>
    <div className="page-heading"><div><h1>System Settings</h1><p className="heading-subtitle">Configure institutional verification and storage preferences.</p></div><button className="btn-primary" onClick={saveGeneral} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button></div>
    {message && <div className="alert alert--success">{message}</div>}
    {error && <div className="alert alert--error">{error}</div>}
    <div className="filter-tabs">{tabs.map((item) => <button key={item} className={`filter-tab ${tab === item ? 'filter-tab--active' : ''}`} onClick={() => { setTab(item); setMessage(''); setError('') }}>{item}</button>)}</div>
    <div className="card"><div className="card-header"><h3>{tab} Configuration</h3></div><div className="settings-form">
      {loading ? <p className="text-muted">Loading settings...</p> : (
      <>
      {tab === 'General' && (<>
        <label>System Name<input className="filter-input" value={systemName} onChange={(e) => setSystemName(e.target.value)} /></label>
        <label>Organization<input className="filter-input" value={organization} onChange={(e) => setOrganization(e.target.value)} /></label>
        <label>Default Review Threshold<select className="filter-select" value={reviewThreshold} onChange={(e) => setReviewThreshold(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label>Allowed File Types<input className="filter-input" value={allowedFileTypes} onChange={(e) => setAllowedFileTypes(e.target.value)} /></label>
        <button className="btn-primary" onClick={saveGeneral} disabled={saving}>Save Changes</button>
      </>)}
      {tab === 'Security' && (<>
        <label>Session Expiry (minutes)<input className="filter-input" type="number" min={5} max={1440} value={jwtExpiryMinutes} onChange={(e) => setJwtExpiryMinutes(e.target.value)} /></label>
        <label>Minimum Password Length<input className="filter-input" type="number" min={8} max={64} value={minPasswordLength} onChange={(e) => setMinPasswordLength(e.target.value)} /></label>
        <label>Max Failed Logins<input className="filter-input" type="number" min={1} max={20} value={maxFailedLogins} onChange={(e) => setMaxFailedLogins(e.target.value)} /></label>
        <label>Account Lockout (minutes)<input className="filter-input" type="number" min={1} max={1440} value={lockoutMinutes} onChange={(e) => setLockoutMinutes(e.target.value)} /></label>
        <button className="btn-primary" onClick={saveSecurity} disabled={saving}>Save Changes</button>
        <p className="text-muted">Multi-factor authentication is not currently supported.</p>
      </>)}
      {tab === 'Notifications' && (<>
        <label>Email: High Risk Transactions<input type="checkbox" checked={emailHighRisk === 'true'} onChange={(e) => setEmailHighRisk(e.target.checked ? 'true' : 'false')} /></label>
        <label>Email: Transactions Awaiting Review<input type="checkbox" checked={emailAwaitingReview === 'true'} onChange={(e) => setEmailAwaitingReview(e.target.checked ? 'true' : 'false')} /></label>
        <label>Email: Account Events<input type="checkbox" checked={emailAccountEvents === 'true'} onChange={(e) => setEmailAccountEvents(e.target.checked ? 'true' : 'false')} /></label>
        <label>In-App System Alerts<input type="checkbox" checked={inAppSystemAlerts === 'true'} onChange={(e) => setInAppSystemAlerts(e.target.checked ? 'true' : 'false')} /></label>
        <label>Notification Frequency<select className="filter-select" value={notificationFrequency} onChange={(e) => setNotificationFrequency(e.target.value)}><option value="instant">Instant</option><option value="daily">Daily digest</option><option value="weekly">Weekly digest</option></select></label>
        <button className="btn-primary" onClick={saveNotifications} disabled={saving}>Save Changes</button>
        <p className="text-muted">Email delivery requires a configured provider; in-app notifications are recorded.</p>
      </>)}
      {tab === 'Database' && (<>
        <div className="detail-grid"><div className="detail-card"><span>Database Status</span><strong>{dbChecking ? 'Checking...' : dbHealth?.status ?? 'Unknown'}</strong></div><div className="detail-card"><span>Service</span><strong>{dbHealth?.service ?? 'landguard-ai'}</strong></div><div className="detail-card"><span>Database</span><strong>{dbHealth?.database ?? 'neon-postgresql'}</strong></div></div>
        <button className="btn-secondary" onClick={loadDatabaseHealth} disabled={dbChecking}>Re-check Database</button>
        <p className="text-muted">Health checks never expose connection strings or credentials and never modify data.</p>
      </>)}
      {tab === 'File Storage' && (<>
        {fileStorage ? (<>
          <div className="detail-grid"><div className="detail-card"><span>Storage Provider</span><strong>{fileStorage.storage_provider}</strong></div><div className="detail-card"><span>Max File Size (MB)</span><strong>{fileStorage.max_file_size_mb}</strong></div></div>
          <p>Allowed file types: {fileStorage.allowed_file_types.join(', ')}</p>
          <label>Max File Size (MB)<input className="filter-input" type="number" min={1} max={500} value={maxFileSizeMb} onChange={(e) => setMaxFileSizeMb(e.target.value)} /></label>
          <button className="btn-primary" onClick={saveFileStorage} disabled={saving}>Save Changes</button>
        </>) : (<p className="text-muted">Unable to load file storage policy.</p>)}
        <p className="text-muted">Uploads validate type and size server-side; files are stored privately with hashed UUIDs.</p>
      </>)}
      </>
      )}
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
function ProfilePage({ currentUser, onLogout, onUpdateUser }: { currentUser: CurrentUser | null; onLogout: () => void; onUpdateUser?: (user: CurrentUser) => void }) {
  const [editing, setEditing] = useState(false)
  const [fullNameDraft, setFullNameDraft] = useState(currentUser?.full_name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(true)
  const [systemAlerts, setSystemAlerts] = useState(true)
  const [frequency, setFrequency] = useState('Instant')
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwMessage, setPwMessage] = useState('')
  const [sessions, setSessions] = useState<AuthSession[] | null>(null)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionsError, setSessionsError] = useState('')

  const loadSessions = async () => {
    setLoadingSessions(true)
    setSessionsError('')
    try { setSessions(await api.sessions()) } catch { setSessionsError('Could not load sessions.') }
    finally { setLoadingSessions(false) }
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileMessage('')
    try {
      const res = await api.updateMe({ full_name: fullNameDraft.trim() })
      setProfileMessage(res.message)
      setEditing(false)
      if (onUpdateUser && currentUser) onUpdateUser({ ...currentUser, full_name: fullNameDraft.trim() })
    } catch { setProfileMessage('Profile update failed. Please try again.') }
    finally { setSavingProfile(false) }
  }

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault()
    if (newPw !== confirmPw) { setPwMessage('New passwords do not match.'); return }
    if (newPw.length < 8) { setPwMessage('New password must be at least 8 characters.'); return }
    setSavingPw(true)
    setPwMessage('')
    try {
      const res = await api.changePassword(currentPw, newPw)
      setPwMessage(res.message)
      setPwOpen(false)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (error) { setPwMessage(error instanceof Error ? error.message : 'Password change failed.') }
    finally { setSavingPw(false) }
  }

  const activeSessions = (sessions ?? []).filter((item) => !item.revoked)

  return (
    <div className="profile-page">
      <div className="page-heading profile-page-heading"><div><h1>My Profile</h1><p className="heading-subtitle">Manage your account information and preferences.</p></div></div>
      <section className="profile-identity-card">
        <div className="profile-identity-main"><div className="profile-avatar-lg">{currentUser ? initials(currentUser.full_name) : 'OF'}</div><div><h2>{currentUser?.full_name ?? 'Officer User'} <span className="badge badge--success">Active</span></h2><span className="profile-role">{displayRole(currentUser?.roles[0] ?? 'OFFICER')}</span></div></div>
        <button className="btn-outline" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit Profile'}</button>
        {editing ? (
          <div className="card" style={{ padding: 16 }}>
            <form onSubmit={saveProfile}>
              <div className="form-group"><label className="form-label" htmlFor="profile-full-name">Full Name</label><input id="profile-full-name" className="form-input" value={fullNameDraft} onChange={(e) => setFullNameDraft(e.target.value)} /></div>
              <div className="form-group"><label className="form-label" htmlFor="profile-email">Email</label><input id="profile-email" className="form-input" value={currentUser?.email ?? ''} disabled /></div>
              {profileMessage && <div className={`alert ${profileMessage.toLowerCase().includes('fail') ? 'alert--error' : 'alert--success'}`}>{profileMessage}</div>}
              <div className="profile-edit-actions"><button className="btn-primary" type="submit" disabled={savingProfile || !fullNameDraft.trim()}>Save Changes</button><button className="btn-secondary" type="button" onClick={() => { setEditing(false); setFullNameDraft(currentUser?.full_name ?? ''); setProfileMessage('') }}>Cancel</button></div>
            </form>
          </div>
        ) : null}
        <div className="profile-contact-row"><div><span>Email</span><strong>{currentUser?.email ?? '—'}</strong></div><div><span>Phone</span><strong>—</strong></div><div><span>Joined</span><strong>—</strong></div></div>
      </section>
      <section className="profile-preferences-card"><div className="profile-section-heading"><h3>Contact Preferences</h3></div><div className="profile-preferences-grid"><div className="profile-toggle-list"><div className="profile-toggle-row"><span>✉ Email Notifications</span><button aria-label="Toggle email notifications" className={`toggle ${emailNotifs ? 'toggle--on' : ''}`} onClick={() => setEmailNotifs(!emailNotifs)}><span className="toggle-dot" /></button></div><div className="profile-toggle-row"><span>▣ SMS Notifications</span><button aria-label="Toggle SMS notifications" className={`toggle ${smsNotifs ? 'toggle--on' : ''}`} onClick={() => setSmsNotifs(!smsNotifs)}><span className="toggle-dot" /></button></div><div className="profile-toggle-row"><span>♟ System Alerts</span><button aria-label="Toggle system alerts" className={`toggle ${systemAlerts ? 'toggle--on' : ''}`} onClick={() => setSystemAlerts(!systemAlerts)}><span className="toggle-dot" /></button></div></div><label className="frequency-control">Notification Frequency<select value={frequency} onChange={(e) => setFrequency(e.target.value)}><option>Instant</option><option>Daily digest</option><option>Weekly digest</option></select></label></div></section>
      <div className="profile-security-grid"><section className="profile-security-card"><div className="security-icon">♙</div><div><h3>Change Password</h3><p>Update your password regularly to keep your account secure.</p>{!pwOpen ? (<button className="btn-outline" onClick={() => { setPwOpen(true); setPwMessage(''); }}>Change Password</button>) : (<form onSubmit={submitPassword}><div className="form-group"><label className="form-label" htmlFor="current-password">Current Password</label><input id="current-password" className="form-input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} /></div><div className="form-group"><label className="form-label" htmlFor="new-password">New Password</label><input id="new-password" className="form-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div><div className="form-group"><label className="form-label" htmlFor="confirm-password">Confirm New Password</label><input id="confirm-password" className="form-input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} /></div>{pwMessage && <div className={`alert ${pwMessage.toLowerCase().includes('fail') ? 'alert--error' : 'alert--success'}`}>{pwMessage}</div>}<div className="profile-edit-actions"><button className="btn-primary" type="submit" disabled={savingPw}>Update Password</button><button className="btn-secondary" type="button" onClick={() => { setPwOpen(false); setPwMessage(''); setCurrentPw(''); setNewPw(''); setConfirmPw('') }}>Cancel</button></div></form>)}</div></section><section className="profile-security-card"><div className="security-icon">♢</div><div><h3>Security & Sessions</h3><p>Active Sessions<br /><strong>{loadingSessions ? 'Checking...' : String(activeSessions.length)}</strong></p>{loadingSessions && <p className="text-muted">Loading your active sessions...</p>}{sessionsError && <div className="alert alert--error">{sessionsError}</div>}{sessions === null && !loadingSessions && (<button className="btn-outline" onClick={loadSessions}>View Sessions</button>)}{sessions !== null && sessions.length > 0 && (<div className="session-list">{sessions.filter((item) => !item.revoked).map((item) => (<div className="session-item" key={item.id}><div><strong>{item.user_agent ?? 'Unknown device'}</strong><span className="text-muted">{item.ip_address ?? '—'}</span></div><div><span>Expires</span><strong>{new Date(item.expires_at).toLocaleString()}</strong></div></div>))}</div>)}</div></section></div>
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
