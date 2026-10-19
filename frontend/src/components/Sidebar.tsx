import {
  LayoutDashboard,
  Search,
  ArrowRightLeft,
  FolderOpen,
  ShieldCheck,
  Clock,
  UserRound,
  LogOut,
  X,
} from 'lucide-react'

interface SidebarProps {
  activeNav: string
  onNavigate: (page: string) => void
  currentUser: any
  pendingCount: number
  onLogout: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Search Parcel', icon: Search },
  { label: 'Transactions', icon: ArrowRightLeft },
  { label: 'Evidence', icon: FolderOpen },
  { label: 'Verification', icon: ShieldCheck },
  { label: 'Pending Reviews', icon: Clock },
  { label: 'Profile', icon: UserRound },
]

export default function Sidebar({
  activeNav,
  onNavigate,
  currentUser,
  pendingCount,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark">
          <ShieldCheck size={17} strokeWidth={2.4} />
        </div>
        <span>LandGuard AI</span>
        <button
          className="icon-button mobile-close"
          aria-label="Close navigation"
          onClick={onCloseMobile}
        >
          <X size={18} />
        </button>
      </div>

      <nav className="primary-nav">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`nav-item ${activeNav === label ? 'nav-item--active' : ''}`}
            onClick={() => {
              onNavigate(label)
              onCloseMobile()
            }}
          >
            <Icon size={16} strokeWidth={1.9} />
            <span>{label}</span>
            {label === 'Pending Reviews' && pendingCount > 0 && (
              <span className="nav-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="user-card">
          <div className="avatar">
            {currentUser?.full_name
              ? currentUser.full_name
                  .split(' ')
                  .map((p: string) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'OF'}
          </div>
          <div>
            <strong>{currentUser?.full_name ?? 'Officer User'}</strong>
            <span>{currentUser?.roles?.[0] ?? 'Verification Officer'}</span>
          </div>
        </div>
        <button className="logout-button" onClick={onLogout}>
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
