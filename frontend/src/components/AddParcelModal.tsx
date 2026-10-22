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
