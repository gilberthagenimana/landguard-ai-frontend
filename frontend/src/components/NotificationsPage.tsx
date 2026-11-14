import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Bell, Check, CheckCheck, Flag, Info, Search, ShieldAlert } from 'lucide-react'
import { api, type NotificationRecord } from '../lib/api'

interface Props {
  currentUserId?: number | null
  isAdmin?: boolean
  onOpenTransaction?: (transactionId: number) => void
}

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'lg-badge lg-badge--red' },
  high: { label: 'High', className: 'lg-badge lg-badge--amber' },
  medium: { label: 'Medium', className: 'lg-badge lg-badge--blue' },
  low: { label: 'Low', className: 'lg-badge lg-badge--slate' },
}

const EVENT_LABELS: Record<string, string> = {
  TRANSACTION_CREATED: 'Transaction created',
  TRANSACTION_AWAITING_REVIEW: 'Awaiting administrative review',
  TRANSACTION_VERIFIED: 'Transaction verified',
  TRANSACTION_FLAGGED: 'Transaction flagged',
  TRANSACTION_REJECTED: 'Transaction rejected',
  HIGH_AI_FRAUD_RISK_DETECTED: 'High AI fraud risk detected',
  OWNERSHIP_CONFLICT_DETECTED: 'Ownership conflict detected',
  PARCEL_REGISTERED: 'Parcel registered',
  USER_REGISTERED: 'User registered',
  OWNERSHIP_TRANSFER_CONFIRMED: 'Ownership transfer confirmed',
  TRANSACTION_EVIDENCE_UPLOADED: 'Evidence uploaded',
}

export default function NotificationsPage({ currentUserId, isAdmin = false, onOpenTransaction }: Props) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [eventType, setEventType] = useState('')
  const [priority, setPriority] = useState('')
  const [readFilter, setReadFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [markingAll, setMarkingAll] = useState(false)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [items, unread] = await Promise.all([
        (isAdmin ? api.notifications : api.myNotifications)({
          event_type: eventType || undefined,
          priority: priority || undefined,
          is_read: readFilter === 'all' ? undefined : readFilter === 'read',
          q: query.trim() || undefined,
        }),
        isAdmin ? api.unreadNotificationCount() : api.myUnreadNotificationCount(),
      ])
      setNotifications(items || [])
      setUnreadCount(unread?.unread_count ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [eventType, priority, readFilter, query, isAdmin])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const markRead = async (id: number) => {
    try {
      const wasUnread = notifications.some((notification) => notification.id === id && !notification.is_read)
      const updated = await (isAdmin ? api.markNotificationRead : api.markMyNotificationRead)(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: updated?.read_at ?? new Date().toISOString() } : n)))
      if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read')
    }
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      const result = await (isAdmin ? api.markAllNotificationsRead : api.markMyNotificationsRead)()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() })))
      setUnreadCount(result?.unread_count ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notifications as read')
    } finally {
      setMarkingAll(false)
    }
  }

  const sorted = [...(notifications || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const eventTypes = Array.from(new Set((notifications || []).map((n) => n.event_type).filter(Boolean))).sort()

  const handleOpenRelated = async (notification: NotificationRecord) => {
    if (!notification.related_transaction_code) return
    try {
      const transactions = await api.transactions()
      const transaction = (transactions || []).find((t) => t.transaction_code === notification.related_transaction_code)
      if (transaction && onOpenTransaction) {
        onOpenTransaction(transaction.id)
      }
    } catch {
      setError('Unable to open the related transaction.')
    }
  }

  const inputStyle: CSSProperties = {
    padding: '9px 11px',
    color: '#315d79',
    border: '1px solid #cfe3ef',
    borderRadius: '5px',
    fontSize: '13px',
    background: '#fff',
  }

  return (
    <div className="workspace-page">
      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="card">
        <div className="card-header">
          <h3><Bell size={16} /> Notifications</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="text-muted">{unreadCount} unread</span>
            <button type="button" className="btn-secondary btn-sm" onClick={() => void markAllRead()} disabled={markingAll || unreadCount === 0}>
              <CheckCheck size={14} /> Mark all as read
            </button>
          </div>
        </div>
        <p className="card-sub">{isAdmin ? 'Administrative alerts and security notifications generated from live system events.' : 'Notifications concerning your transactions, ownership and account activity.'}</p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              className="search-input"
              style={{ ...inputStyle, paddingLeft: '30px', width: '100%' }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications"
              aria-label="Search notifications"
            />
          </div>
          <select className="filter-select" style={inputStyle} value={eventType} onChange={(e) => setEventType(e.target.value)} aria-label="Filter by event type">
            <option value="">All event types</option>
            {eventTypes.map((event) => (
              <option key={event} value={event}>{EVENT_LABELS[event] ?? event}</option>
            ))}
          </select>
          <select className="filter-select" style={inputStyle} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="filter-select" style={inputStyle} value={readFilter} onChange={(e) => setReadFilter(e.target.value)} aria-label="Filter by read state">
            <option value="all">All states</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => { setEventType(''); setPriority(''); setReadFilter('all'); setQuery('') }}
          >
            Reset
          </button>
        </div>

        {loading ? (
          <p className="text-muted">Loading notifications...</p>
        ) : error ? (
          <div className="alert alert--error">{error}</div>
        ) : sorted.length === 0 ? (
          <div className="lg-empty">No notifications found.</div>
        ) : (
          <div className="alert-list">
            {sorted.map((notification) => {
              const meta = PRIORITY_META[notification.priority] ?? PRIORITY_META.medium
              const Icon = notification.priority === 'critical' ? ShieldAlert : notification.priority === 'high' ? Flag : notification.priority === 'low' ? Check : Info
              return (
                <div key={notification.id} className="alert-item">
                  <div className={`alert-icon ${notification.is_read ? '' : 'alert-icon--red'}`}>
                    <Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{notification.title}</strong>
                    {notification.description ? <span>{notification.description}</span> : null}
                    <span>
                      {EVENT_LABELS[notification.event_type] ?? notification.event_type}
                      {notification.related_transaction_code ? ` · Transaction ${notification.related_transaction_code}` : ''}
                      {notification.related_parcel_upi ? ` · Parcel ${notification.related_parcel_upi}` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={meta.className}>{meta.label}</span>
                    <span className="text-muted">{new Date(notification.created_at).toLocaleString()}</span>
                    {!notification.is_read ? (
                      <button type="button" className="btn-secondary btn-sm" onClick={() => void markRead(notification.id)}>
                        <Check size={13} /> Mark read
                      </button>
                    ) : null}
                    {notification.related_transaction_code ? (
                      <button type="button" className="btn-secondary btn-sm" onClick={() => void handleOpenRelated(notification)}>
                        Open
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
