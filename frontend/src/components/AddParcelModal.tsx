/**
 * Add Parcel form. Calls the existing POST /api/parcels endpoint
 * (the backend already restricts it to Admin and Officer).
 */
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { api } from '../lib/api'

const empty = {
  upi: '', parcel_code: '', location: '', province: '', district: '',
  sector: '', cell: '', village: '', area_ha: '', registration_reference: '',
}

const emptyOwner = {
  owner_type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'ORGANIZATION',
  full_name: '', identification_number: '', phone: '', email: '',
  organization_name: '', registration_number: '',
}

const fields: { key: keyof typeof empty; label: string; required?: boolean; type?: string; hint?: string }[] = [
  { key: 'upi', label: 'UPI', required: true, hint: 'Unique parcel identifier, for example 1/02/03/04/567' },
  { key: 'parcel_code', label: 'Parcel code', required: true },
  { key: 'location', label: 'Location description', required: true },
  { key: 'province', label: 'Province', required: true },
  { key: 'district', label: 'District', required: true },
  { key: 'sector', label: 'Sector', required: true },
  { key: 'cell', label: 'Cell', required: true },
  { key: 'village', label: 'Village', required: true },
  { key: 'area_ha', label: 'Area (hectares)', required: true, type: 'number' },
  { key: 'registration_reference', label: 'Registration reference (optional)' },
]

export default function AddParcelModal({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const [form, setForm] = useState(empty)
  const [owner, setOwner] = useState(emptyOwner)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const area = Number(form.area_ha)
    if (!(area > 0)) { setError('Enter an area greater than 0 hectares.'); return }
    setSubmitting(true)
    try {
      const parcel = await api.createParcel({
        upi: form.upi.trim(),
        parcel_code: form.parcel_code.trim(),
        location: form.location.trim(),
        province: form.province.trim(),
        district: form.district.trim(),
        sector: form.sector.trim(),
        cell: form.cell.trim(),
        village: form.village.trim(),
        area_ha: area,
        ...(form.registration_reference.trim() ? { registration_reference: form.registration_reference.trim() } : {}),
        owner: {
          owner_type: owner.owner_type,
          full_name: owner.full_name.trim(),
          identification_number: owner.identification_number.trim(),
          ...(owner.phone.trim() ? { phone: owner.phone.trim() } : {}),
          ...(owner.email.trim() ? { email: owner.email.trim() } : {}),
          ...(owner.owner_type === 'ORGANIZATION' ? {
            organization_name: owner.organization_name.trim(),
            registration_number: owner.registration_number.trim(),
          } : {}),
        },
      })
      setCreated(parcel.parcel_code)
      onCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The parcel could not be saved. Check the details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" role="dialog" aria-modal="true" aria-labelledby="add-parcel-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 id="add-parcel-title">Add parcel</h2>
            <p>Register a new land parcel in the cadastre.</p>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>

        {created ? (
          <>
            <p className="lg-form-ok" role="status">Parcel {created} was added.</p>
            <div className="modal-actions"><button type="button" className="btn-primary btn-sm" onClick={onClose}>Done</button></div>
          </>
        ) : (
          <form onSubmit={submit}>
            {error && <p className="lg-form-error" role="alert">{error}</p>}
            {fields.map((f) => (
              <div className="form-group" key={f.key}>
                <label className="form-label" htmlFor={`parcel-${f.key}`}>{f.label}</label>
                <input
                  id={`parcel-${f.key}`}
                  className="form-input"
                  type={f.type ?? 'text'}
                  step={f.type === 'number' ? 'any' : undefined}
                  min={f.type === 'number' ? 0 : undefined}
                  required={f.required}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
                {f.hint && <div className="form-hint">{f.hint}</div>}
              </div>
            ))}
            <fieldset className="form-section">
              <legend>Parcel Owner Information</legend>
              <div className="form-group">
                <label className="form-label" htmlFor="parcel-owner-type">Owner type</label>
                <select
                  id="parcel-owner-type"
                  className="form-input"
                  value={owner.owner_type}
                  onChange={(e) => setOwner({ ...owner, owner_type: e.target.value as typeof owner.owner_type })}
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="ORGANIZATION">Organization</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="parcel-owner-name">Owner full name</label>
                <input id="parcel-owner-name" className="form-input" required value={owner.full_name} onChange={(e) => setOwner({ ...owner, full_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="parcel-owner-id">National ID number</label>
                <input id="parcel-owner-id" className="form-input" required value={owner.identification_number} onChange={(e) => setOwner({ ...owner, identification_number: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="parcel-owner-phone">Phone number (optional)</label>
                <input id="parcel-owner-phone" className="form-input" type="tel" value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="parcel-owner-email">Email address (optional)</label>
                <input id="parcel-owner-email" className="form-input" type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
              </div>
              {owner.owner_type === 'ORGANIZATION' && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="parcel-organization-name">Organization name</label>
                    <input id="parcel-organization-name" className="form-input" required value={owner.organization_name} onChange={(e) => setOwner({ ...owner, organization_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="parcel-registration-number">Organization registration number</label>
                    <input id="parcel-registration-number" className="form-input" required value={owner.registration_number} onChange={(e) => setOwner({ ...owner, registration_number: e.target.value })} />
                  </div>
                </>
              )}
            </fieldset>
            <div className="modal-actions">
              <button type="button" className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary btn-sm" disabled={submitting}>{submitting ? 'Saving…' : 'Add parcel'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
