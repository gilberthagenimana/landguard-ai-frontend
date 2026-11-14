const apiUrl = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export function getToken() {
  return localStorage.getItem('landguard_access_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers })
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('landguard_access_token')
      localStorage.removeItem('landguard_demo_session')
      window.dispatchEvent(new Event('landguard-auth-expired'))
    }
    let detail = 'Request failed'
    if (typeof data.detail === 'string' && data.detail) {
      detail = data.detail
    } else if (response.status === 401) {
      detail = 'Your session has expired. Please sign in again.'
    } else if (Array.isArray(data.detail)) {
      detail = data.detail
        .map((err: { msg?: string; loc?: (string | number)[] }) => {
          const field = err.loc && err.loc.length > 1 ? `${err.loc[err.loc.length - 1]}: ` : ''
          return `${field}${err.msg || 'Invalid value'}`
        })
        .join('; ')
    } else if (data.message && typeof data.message === 'string') {
      detail = data.message
    }
    throw new Error(detail)
  }
  return data as T
}

export const api = {
  login: (email: string, password: string, role: string) =>
    request<{ access_token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
  me: () => request<CurrentUser>('/api/auth/me'),
  updateMe: (payload: { full_name?: string; password?: string }) => request<{ message: string }>('/api/auth/me', { method: 'PUT', body: JSON.stringify(payload) }),
  changePassword: (currentPassword: string, newPassword: string) => request<{ message: string }>('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }),
  sessions: () => request<AuthSession[]>('/api/auth/sessions'),
  getSettings: () => request<Setting[]>('/api/settings'),
  updateSetting: (key: string, value: string) => request<Setting>(`/api/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  getFileStorage: () => request<FileStoragePolicy>('/api/settings/file-storage'),
  getDatabaseHealth: () => request<DatabaseHealth>('/api/settings/database/health'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  stats: () => request<DashboardStats>('/api/dashboard/stats'),
  users: () => request<UserRecord[]>('/api/users'),
  createUser: (payload: CreateUserPayload | object) => request<UserRecord>('/api/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id: number, payload: UpdateUserPayload | object) => request<UserRecord>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  disableUser: (id: number) => request(`/api/users/${id}`, { method: 'DELETE' }),
  reactivateUser: (id: number) => request<UserRecord>(`/api/users/${id}/reactivate`, { method: 'POST' }),
  parcels: (query: ParcelQuery = {}) => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request<ParcelPage | ParcelRecord[]>(`/api/parcels${suffix}`)
  },

  createParcel: (payload: ParcelCreatePayload) => request<ParcelRecord>('/api/parcels', { method: 'POST', body: JSON.stringify(payload) }),
  parcelByUpi: (upi: string) => request<ParcelRecord>(`/api/parcels/upi/${encodeURIComponent(upi)}`),
  parcel: (id: number) => request<ParcelRecord>(`/api/parcels/${id}`),
  ownership: (id: number) => request<OwnershipRecord[]>(`/api/parcels/${id}/ownership-history`),
  parcelTransactions: (id: number) => request<TransactionRecord[]>(`/api/parcels/${id}/transactions`),
  owners: (q = '') => request<OwnerRecord[]>(`/api/owners${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createOwner: (payload: object) => request<OwnerRecord>('/api/owners', { method: 'POST', body: JSON.stringify(payload) }),
  transactions: () => request<TransactionRecord[]>('/api/transactions'),
  transaction: (id: number) => request<TransactionRecord>(`/api/transactions/${id}`),
  createTransaction: (payload: object) => request<TransactionRecord>('/api/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteTransaction: (id: number, reason: string) => request(`/api/transactions/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  archiveTransaction: (id: number) => request<TransactionRecord>(`/api/transactions/${id}/archive`, { method: 'POST' }),
  verify: (id: number) => request<VerificationResponse>(`/api/verification/transactions/${id}`, { method: 'POST' }),

  storedVerification: (id: number) => request<VerificationResult[]>(`/api/transactions/${id}/verification`),
  transactionReviewDetails: (id: number) => request<TransactionReviewDetails>(`/api/transactions/${id}/review-details`),
  submitReviewDecision: (id: number, payload: { action: string; explanation: string; evidence_notes?: string; investigation_findings?: string }) =>
    request<TransactionRecord>(`/api/transactions/${id}/review-decision`, { method: 'POST', body: JSON.stringify(payload) }),
  confirmTransfer: (id: number, payload: { supporting_reference: string; notes?: string }) =>
    request<TransactionRecord>(`/api/transactions/${id}/confirm-transfer`, { method: 'POST', body: JSON.stringify(payload) }),
  transactionStatusHistory: (id: number) => request<TransactionStatusHistoryRecord[]>(`/api/transactions/${id}/status-history`),
  analyze: (id: number) => request<RiskResponse>(`/api/risk-analysis/transactions/${id}`, { method: 'POST' }),
  storedRisk: (id: number) => request<RiskResponse[]>(`/api/risk-analysis/transactions/${id}`),
  cases: () => request<CaseRecord[]>('/api/cases'),
  caseDetail: (id: number) => request<CaseDetail>(`/api/cases/${id}`),
  updateCase: (id: number, payload: object) => request<CaseRecord>(`/api/cases/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateTransactionStatus: (id: number, payload: { status: string; reason?: string }) => request<TransactionRecord>(`/api/transactions/${id}/status`, { method: 'PUT', body: JSON.stringify(payload) }),
  audit: () => request<AuditRecord[]>('/api/audit-logs'),
  notifications: (query: { event_type?: string; priority?: string; is_read?: boolean; q?: string } = {}) => {
    const params = new URLSearchParams()
    if (query.event_type) params.set('event_type', query.event_type)
    if (query.priority) params.set('priority', query.priority)
    if (query.is_read !== undefined) params.set('is_read', String(query.is_read))
    if (query.q) params.set('q', query.q)
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request<NotificationRecord[]>(`/api/notifications${suffix}`)
  },
  unreadNotificationCount: () => request<{ unread_count: number }>('/api/notifications/unread-count'),
  markNotificationRead: (id: number) => request<NotificationRecord>(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<{ unread_count: number; updated: number }>('/api/notifications/mark-all-read', { method: 'POST' }),
  myNotifications: (query: { event_type?: string; priority?: string; is_read?: boolean; q?: string } = {}) => {
    const params = new URLSearchParams()
    if (query.event_type) params.set('event_type', query.event_type)
    if (query.priority) params.set('priority', query.priority)
    if (query.is_read !== undefined) params.set('is_read', String(query.is_read))
    if (query.q) params.set('q', query.q)
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request<NotificationRecord[]>(`/api/notifications/me${suffix}`)
  },
  myUnreadNotificationCount: () => request<{ unread_count: number }>('/api/notifications/me/unread-count'),
  markMyNotificationRead: (id: number) => request<NotificationRecord>(`/api/notifications/me/${id}/read`, { method: 'POST' }),
  markMyNotificationsRead: () => request<{ unread_count: number; updated: number }>('/api/notifications/me/read-all', { method: 'POST' }),
  report: (name: string) => request<Record<string, unknown>>(`/api/reports/${name}`),
  publicParcelCheck: (upi: string) => request<PublicParcelOut>(`/api/public/parcels/${upi}`),
  publicParcelByCode: (parcelCode: string) => request<PublicParcelOut>(`/api/public/parcels/by-code/${encodeURIComponent(parcelCode)}`),
  evidenceForTransaction: (transactionId: number) => request<EvidenceOut[]>(`/api/evidence/transactions/${transactionId}`),
  uploadEvidence: (transactionId: number, file: File, documentType: string, metadata: { statedPaymentAmount?: string; paymentReference?: string; notes?: string }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', documentType)
    if (metadata.statedPaymentAmount) formData.append('stated_payment_amount', metadata.statedPaymentAmount)
    if (metadata.paymentReference) formData.append('payment_reference', metadata.paymentReference)
    if (metadata.notes) formData.append('notes', metadata.notes)
    return request<EvidenceOut>(`/api/evidence/transactions/${transactionId}`, { method: 'POST', body: formData })
  },
  reviewEvidence: (evidenceId: number, payload: { status: string; reviewNotes: string }) => request<EvidenceOut>(`/api/evidence/${evidenceId}/review`, { method: 'PUT', body: JSON.stringify(payload) }),
  downloadEvidence: async (evidenceId: number) => {
    const token = getToken()
    const headers: Record<string, string> = { Accept: 'application/octet-stream' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const response = await fetch(`${apiUrl}/api/evidence/${evidenceId}`, { headers })
    if (!response.ok) {
      let detail = 'Failed to download evidence'
      try { const data = await response.json(); if (typeof data?.detail === 'string') detail = data.detail } catch { /* ignore */ }
      throw new Error(detail)
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'evidence'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  },
  // The backend has no 'list all evidence' route, so gather evidence per transaction (latest 100).
  evidenceList: async (): Promise<EvidenceOut[]> => {
    const txs = await request<TransactionRecord[]>('/api/transactions')
    const results = await Promise.allSettled(txs.slice(0, 100).map((t) => request<EvidenceOut[]>(`/api/evidence/transactions/${t.id}`)))
    return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  },
}

export type DashboardStats = {
  total_parcels: number
  total_owners: number
  total_transactions: number
  transactions_under_review: number
  low_risk_transactions: number
  medium_risk_transactions: number
  high_risk_transactions: number
  recent_verification_activity: { action: string; entity: string; entity_id: string | null; created_at: string }[]
  recent_alerts: { id: string; title: string; meta: string; risk: string }[]
}

export type NotificationRecord = {
  id: number
  recipient_user_id: number
  event_type: string
  title: string
  description?: string | null
  priority: 'critical' | 'high' | 'medium' | 'low'
  related_parcel_upi?: string | null
  related_transaction_code?: string | null
  is_read: boolean
  created_at: string
  read_at?: string | null
}

export type ParcelCreatePayload = {
  upi: string
  parcel_code: string
  location: string
  province: string
  district: string
  sector: string
  cell: string
  village: string
  area_ha: number
  status?: string
  registration_reference?: string
  owner: {
    owner_type: 'INDIVIDUAL' | 'ORGANIZATION'
    full_name: string
    identification_number: string
    phone?: string
    email?: string
    organization_name?: string
    registration_number?: string
  }
}

export type RoleRecord = { name: string }
export type CurrentUser = { id: number; username?: string; full_name: string; email: string; is_active: boolean; roles: string[] }
export type UserRecord = Omit<CurrentUser, 'roles'> & { roles: RoleRecord[] }
export type CreateUserPayload = {
  full_name: string
  email: string
  username?: string
  password: string
  role: 'ADMIN' | 'OFFICER' | 'AUDITOR'
  is_active?: boolean
}
export type UpdateUserPayload = {
  full_name?: string
  email?: string
  username?: string
  password?: string
  role?: 'ADMIN' | 'OFFICER' | 'AUDITOR'
  is_active?: boolean
}

export type AuthSession = {
  id: number
  created_at: string
  expires_at: string
  ip_address?: string | null
  user_agent?: string | null
  revoked: boolean
}
export type Setting = { id: number; key: string; value: string; description?: string | null; updated_by?: number | null; updated_at?: string | null }
export type FileStoragePolicy = { allowed_file_types: string[]; max_file_size_mb: number; storage_provider: string }
export type DatabaseHealth = { status: string; service: string; database: string }
export type ParcelRecord = {
  id: number
  parcel_code: string
  upi?: string | null
  location: string
  province: string
  district: string
  sector: string
  cell: string
  village: string
  area_ha: number
  status: string
  created_at: string
  current_owner_name?: string | null
  current_owner_id?: number | null
  current_owner_type?: 'INDIVIDUAL' | 'ORGANIZATION' | null
  current_organization_name?: string | null
  owner?: {
    id: number
    full_name: string
    owner_type: 'INDIVIDUAL' | 'ORGANIZATION'
    organization_name?: string | null
  } | null
  updated_at: string
  latitude?: number | null
  longitude?: number | null
  geometry?: unknown
  boundary_geometry?: unknown
  location_data_source?: string | null
  location_verification_status?: string
  location_verification_metadata?: Record<string, unknown> | null
}
export type ParcelQuery = {
  q?: string
  parcel_code?: string
  upi?: string
  owner_name?: string
  province?: string
  district?: string
  sector?: string
  status?: string
  page?: number
  page_size?: number
  sort_by?: 'parcel_code' | 'created_at' | 'status' | 'area_ha'
  sort_order?: 'asc' | 'desc'
}
export type ParcelPage = {
  items: ParcelRecord[]
  total: number
  page: number
  page_size: number
  pages: number
}
export type OwnerRecord = {
  id: number
  owner_code: string
  full_name: string
  identification_number?: string | null
  phone?: string | null
  email?: string | null
  status: string
  parcels_owned: number
}
export type OwnershipRecord = {
  id: number
  transfer_date: string
  previous_owner_name?: string | null
  new_owner_name?: string | null
  reason_type: string
  supporting_reference?: string | null
}
export type TransactionRecord = {
  id: number
  transaction_code: string
  parcel_id: number
  parcel_code?: string | null
  upi?: string | null
  seller_name?: string | null
  buyer_name?: string | null
  seller_owner_id?: number | null
  buyer_owner_id?: number | null
  transaction_type: string
  transaction_date: string
  declared_value?: string | number | null
  supporting_reference?: string | null
  status: string
  latest_risk_level?: string | null
  latest_risk_score?: number | null
  is_disposable?: boolean
  is_archived?: boolean
  archived_at?: string | null
}
export type VerificationResult = { rule_name: string; status: string; severity: string; explanation: string }
export type VerificationResponse = { transaction_id: number; overall_status: string; verified_at: string; results: VerificationResult[] }
export type RiskResponse = { transaction_id: number; risk_score: number; risk_level: string; model_version: string; reasons: string[]; analyzed_at: string }
export type CaseRecord = {
  id: number
  case_code: string
  transaction_id: number
  parcel_code?: string | null
  status: string
  review_notes?: string | null
  assigned_name?: string | null
  created_at: string
  updated_at: string
  risk_level?: string | null
}
export type CaseDetail = {
  case: CaseRecord
  transaction: TransactionRecord | null
  ownership_history: OwnershipRecord[]
  verification_results: VerificationResult[]
  risk: { risk_score: number; risk_level: string; reasons: string[] } | null
  disclaimer: string
}
export type AuditRecord = {
  id: number
  created_at: string
  user_name?: string | null
  action: string
  entity: string
  entity_id?: string | null
}

export type PublicParcelOut = {
  upi: string | null
  parcel_code: string
  location: string
  district: string
  status: string
  availability: string
  has_pending_transaction: boolean
  transaction_id?: number | null
  transaction_code?: string | null
  transaction_status?: string | null
  warning_message: string | null
  registered_owner_name?: string | null
  registered_owner_id?: number | null
  public_notice: string
}

export type EvidenceOut = {
  id: number
  transaction_id: number
  document_type: string
  original_filename: string
  file_size: number
  mime_type: string
  status: string
  stated_payment_amount: string | null
  stated_payment_date: string | null
  payment_reference: string | null
  notes: string | null
  uploaded_by: number
  reviewed_by: number | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export type EvidenceReviewHistoryOut = {
  id: number
  evidence_id: number
  previous_status: string | null
  new_status: string
  changed_by: number | null
  reason: string | null
  created_at: string
}

export type TransactionStatusHistoryRecord = {
  id?: number
  previous_status: string | null
  new_status: string
  changed_by: number | null
  reason: string | null
  created_at: string
}

export type TransactionReviewDetails = {
  transaction: TransactionRecord
  parcel: ParcelRecord | null
  current_owner: OwnerRecord | null
  seller: OwnerRecord | null
  buyer: OwnerRecord | null
  evidence: EvidenceOut[]
  ownership_history: OwnershipRecord[]
  ai_risk: {
    risk_score: number
    risk_level: string
    explanation: string
    indicators: string[]
    model_version?: string
    disclaimer: string
  } | null
  verification_results: VerificationResult[]
  review_decisions: TransactionStatusHistoryRecord[]
  can_review: boolean
  cannot_review_reason: string | null
}
