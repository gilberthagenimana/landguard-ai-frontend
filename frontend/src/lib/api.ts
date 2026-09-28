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
    const detail = typeof data.detail === 'string' ? data.detail : 'Request failed'
    throw new Error(detail)
  }
  return data as T
}

export const api = {
  login: (email: string, password: string, role: string) =>
    request<{ access_token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
  me: () => request<CurrentUser>('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  stats: () => request<DashboardStats>('/api/dashboard/stats'),
  users: () => request<UserRecord[]>('/api/users'),
  createUser: (payload: object) => request<UserRecord>('/api/users', { method: 'POST', body: JSON.stringify(payload) }),
  disableUser: (id: number) => request(`/api/users/${id}`, { method: 'DELETE' }),
  parcels: (q = '') => request<ParcelRecord[]>(`/api/parcels${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  parcel: (id: number) => request<ParcelRecord>(`/api/parcels/${id}`),
  ownership: (id: number) => request<OwnershipRecord[]>(`/api/parcels/${id}/ownership-history`),
  parcelTransactions: (id: number) => request<TransactionRecord[]>(`/api/parcels/${id}/transactions`),
  owners: (q = '') => request<OwnerRecord[]>(`/api/owners${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createOwner: (payload: object) => request<OwnerRecord>('/api/owners', { method: 'POST', body: JSON.stringify(payload) }),
  transactions: () => request<TransactionRecord[]>('/api/transactions'),
  transaction: (id: number) => request<TransactionRecord>(`/api/transactions/${id}`),
  createTransaction: (payload: object) => request<TransactionRecord>('/api/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  verify: (id: number) => request<VerificationResponse>(`/api/verification/transactions/${id}`, { method: 'POST' }),
  storedVerification: (id: number) => request<VerificationResult[]>(`/api/transactions/${id}/verification`),
  analyze: (id: number) => request<RiskResponse>(`/api/risk-analysis/transactions/${id}`, { method: 'POST' }),
  storedRisk: (id: number) => request<RiskResponse[]>(`/api/risk-analysis/transactions/${id}`),
  cases: () => request<CaseRecord[]>('/api/cases'),
  caseDetail: (id: number) => request<CaseDetail>(`/api/cases/${id}`),
  updateCase: (id: number, payload: object) => request<CaseRecord>(`/api/cases/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  audit: () => request<AuditRecord[]>('/api/audit-logs'),
  report: (name: string) => request<Record<string, unknown>>(`/api/reports/${name}`),
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

export type RoleRecord = { name: string }
export type CurrentUser = { id: number; username?: string; full_name: string; email: string; is_active: boolean; roles: string[] }
export type UserRecord = Omit<CurrentUser, 'roles'> & { roles: RoleRecord[] }
export type ParcelRecord = {
  id: number
  parcel_code: string
  location: string
  province: string
  district: string
  sector: string
  cell: string
  village: string
  area_ha: number
  status: string
  current_owner_name?: string | null
  current_owner_id?: number | null
  updated_at: string
}
export type OwnerRecord = {
  id: number
  owner_code: string
  full_name: string
  identification_number?: string | null
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
  seller_name?: string | null
  buyer_name?: string | null
  seller_owner_id?: number | null
  buyer_owner_id?: number | null
  transaction_type: string
  transaction_date: string
  declared_value?: string | number | null
  status: string
  latest_risk_level?: string | null
  latest_risk_score?: number | null
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
