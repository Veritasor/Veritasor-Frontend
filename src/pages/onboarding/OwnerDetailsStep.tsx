import { useState } from 'react'
import type { OwnerDetails } from '../../hooks/useOnboardingDraft'

type Props = {
  data: OwnerDetails
  onBack: () => void
  onNext: (data: OwnerDetails) => void
}

type Errors = Partial<Record<keyof OwnerDetails, string>>

function validate(d: OwnerDetails): Errors {
  const e: Errors = {}
  if (!d.fullName.trim()) e.fullName = 'Full name is required'
  if (!d.dateOfBirth) e.dateOfBirth = 'Date of birth is required'
  if (!d.nationality.trim()) e.nationality = 'Nationality is required'
  if (!d.addressLine1.trim()) e.addressLine1 = 'Address is required'
  if (!d.city.trim()) e.city = 'City is required'
  if (!d.postalCode.trim()) e.postalCode = 'Postal code is required'
  return e
}

export default function OwnerDetailsStep({ data, onBack, onNext }: Props) {
  const [form, setForm] = useState<OwnerDetails>(data)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState(false)

  function set(field: keyof OwnerDetails, value: string) {
    const next = { ...form, [field]: value }
    setForm(next)
    if (touched) setErrors(validate(next))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    setTouched(true)
    if (Object.keys(errs).length === 0) onNext(form)
  }

  return (
    <form className="ob-form" onSubmit={handleSubmit} noValidate aria-label="Owner details">
      <div className="ob-grid-2">
        <div className="ob-field">
          <label className="ob-label ob-label-required" htmlFor="ob-full-name">Full legal name</label>
          <input
            id="ob-full-name"
            className={`ob-input${errors.fullName ? ' ob-input-error' : ''}`}
            type="text"
            value={form.fullName}
            onChange={e => set('fullName', e.target.value)}
            placeholder="Amina Adeyemi"
            autoComplete="name"
            aria-required="true"
            aria-describedby={errors.fullName ? 'ob-full-name-err' : undefined}
          />
          {errors.fullName && <span id="ob-full-name-err" className="ob-error" role="alert">{errors.fullName}</span>}
        </div>

        <div className="ob-field">
          <label className="ob-label ob-label-required" htmlFor="ob-dob">Date of birth</label>
          <input
            id="ob-dob"
            className={`ob-input${errors.dateOfBirth ? ' ob-input-error' : ''}`}
            type="date"
            value={form.dateOfBirth}
            onChange={e => set('dateOfBirth', e.target.value)}
            aria-required="true"
            aria-describedby={errors.dateOfBirth ? 'ob-dob-err' : undefined}
          />
          {errors.dateOfBirth && <span id="ob-dob-err" className="ob-error" role="alert">{errors.dateOfBirth}</span>}
        </div>
      </div>

      <div className="ob-field">
        <label className="ob-label ob-label-required" htmlFor="ob-nationality">Nationality</label>
        <input
          id="ob-nationality"
          className={`ob-input${errors.nationality ? ' ob-input-error' : ''}`}
          type="text"
          value={form.nationality}
          onChange={e => set('nationality', e.target.value)}
          placeholder="Nigerian"
          aria-required="true"
          aria-describedby={errors.nationality ? 'ob-nationality-err' : undefined}
        />
        {errors.nationality && <span id="ob-nationality-err" className="ob-error" role="alert">{errors.nationality}</span>}
      </div>

      <div className="ob-field">
        <label className="ob-label ob-label-required" htmlFor="ob-addr1">Address line 1</label>
        <input
          id="ob-addr1"
          className={`ob-input${errors.addressLine1 ? ' ob-input-error' : ''}`}
          type="text"
          value={form.addressLine1}
          onChange={e => set('addressLine1', e.target.value)}
          placeholder="12 Victoria Island"
          autoComplete="address-line1"
          aria-required="true"
          aria-describedby={errors.addressLine1 ? 'ob-addr1-err' : undefined}
        />
        {errors.addressLine1 && <span id="ob-addr1-err" className="ob-error" role="alert">{errors.addressLine1}</span>}
      </div>

      <div className="ob-field">
        <label className="ob-label" htmlFor="ob-addr2">Address line 2 <span className="ob-hint" style={{ fontWeight: 400 }}>(optional)</span></label>
        <input
          id="ob-addr2"
          className="ob-input"
          type="text"
          value={form.addressLine2}
          onChange={e => set('addressLine2', e.target.value)}
          placeholder="Suite 4B"
          autoComplete="address-line2"
        />
      </div>

      <div className="ob-grid-2">
        <div className="ob-field">
          <label className="ob-label ob-label-required" htmlFor="ob-city">City</label>
          <input
            id="ob-city"
            className={`ob-input${errors.city ? ' ob-input-error' : ''}`}
            type="text"
            value={form.city}
            onChange={e => set('city', e.target.value)}
            placeholder="Lagos"
            autoComplete="address-level2"
            aria-required="true"
            aria-describedby={errors.city ? 'ob-city-err' : undefined}
          />
          {errors.city && <span id="ob-city-err" className="ob-error" role="alert">{errors.city}</span>}
        </div>

        <div className="ob-field">
          <label className="ob-label ob-label-required" htmlFor="ob-postal">Postal code</label>
          <input
            id="ob-postal"
            className={`ob-input${errors.postalCode ? ' ob-input-error' : ''}`}
            type="text"
            value={form.postalCode}
            onChange={e => set('postalCode', e.target.value)}
            placeholder="100001"
            autoComplete="postal-code"
            aria-required="true"
            aria-describedby={errors.postalCode ? 'ob-postal-err' : undefined}
          />
          {errors.postalCode && <span id="ob-postal-err" className="ob-error" role="alert">{errors.postalCode}</span>}
        </div>
      </div>

      <div className="ob-actions">
        <button type="button" className="ob-btn ob-btn-secondary" onClick={onBack}>← Back</button>
        <button type="submit" className="ob-btn ob-btn-primary">Continue →</button>
      </div>
    </form>
  )
}
