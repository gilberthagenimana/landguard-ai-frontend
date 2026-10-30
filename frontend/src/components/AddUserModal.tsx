/**
 * Add User modal for administrator user management.
 * Calls POST /api/users to register a new Officer, Auditor, or Admin.
 */
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, Shield, UserPlus, X } from 'lucide-react'
import { api, type CreateUserPayload, type UserRecord } from '../lib/api'

interface AddUserModalProps {
  onClose: () => void
  onCreated?: (user: UserRecord) => void
}

export default function AddUserModal({ onClose, onCreated }: AddUserModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'OFFICER' | 'AUDITOR' | 'ADMIN'>('OFFICER')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdUser, setCreatedUser] = useState<UserRecord | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()
    const trimmedUsername = username.trim()

    if (!trimmedName) {
      setError('Full name is required.')
      return
    }
    if (!trimmedEmail) {
      setError('Email address is required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateUserPayload = {
        full_name: trimmedName,
        email: trimmedEmail,
        username: trimmedUsername || undefined,
        role,
        password,
        is_active: isActive,
      }
      const newUser = await api.createUser(payload)
      setCreatedUser(newUser)
      onCreated?.(newUser)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create user. Please check the details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-user-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <UserPlus size={18} />
            </div>
            <div>
              <h2 id="add-user-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Add New User
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Create an authorized user with defined role access.
              </p>
            </div>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {createdUser ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ color: '#10b981', display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <CheckCircle2 size={44} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a' }}>
              User Created Successfully
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              <strong>{createdUser.full_name}</strong> ({createdUser.email}) has been registered as{' '}
              <strong style={{ color: '#2563eb' }}>{createdUser.roles[0]?.name || role}</strong>.
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert--error" role="alert" style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="user-fullname">
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="user-fullname"
                className="form-input"
                type="text"
                required
                placeholder="e.g. Marie Claire Habyarimana"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="user-email">
                  Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="user-email"
                  className="form-input"
                  type="email"
                  required
                  placeholder="e.g. marie@landguard.gov.rw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="user-username">
                  Username <span style={{ color: '#94a3b8', fontSize: '12px' }}>(optional)</span>
                </label>
                <input
                  id="user-username"
                  className="form-input"
                  type="text"
                  placeholder="e.g. mhabyarimana"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div className="form-hint" style={{ marginTop: '4px', marginBottom: '14px' }}>
              If left blank, username is automatically generated from the email.
            </div>

            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="user-role">
                  Role <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="user-role"
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
                <label className="form-label" htmlFor="user-status">
                  Initial Status
                </label>
                <select
                  id="user-status"
                  className="form-select"
                  value={String(isActive)}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                >
                  <option value="true">Active (Can sign in)</option>
                  <option value="false">Inactive (Revoked)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label" htmlFor="user-password">
                Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="user-password"
                className="form-input"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="form-hint">Must be at least 8 characters long.</div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Creating User…' : 'Add User'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
