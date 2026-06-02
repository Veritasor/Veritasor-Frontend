import { useState } from 'react'
import type { BusinessDetails } from '../../hooks/useOnboardingDraft'

type Props = {
  data: BusinessDetails
  onNext: (data: BusinessDetails) => void
}

type Errors = Partial<Record<keyof BusinessDetails, string>>

const BUSINESS_TYPES = ['Sole Proprietorship', 'Partnership', 'LLC', 'Corporation', 'Non-Profit', 'Other']

function validate(d: BusinessDetails): Errors {
  const e: Errors = {}
  if (!d.legalName.trim()) e.legalName = 'Legal name is required'
  if (!d.registrationNumber.trim()) e.registrationNumber = 'Registration number is required'
  if (!d.country) e.country = 'Country is required'
  if (!d.businessType) e.businessType = 'Business type is required'
  if (d.website && !/^https?:\/\/.+/.test(d.website)) e.website = 'Enter a valid URL starting with http:// or https://'
  return e
}

export default function BusinessDetailsStep({ data, onNext }: Props) {
  const [form, setForm] = useState<BusinessDetails>(data)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState(false)

  function set(field: keyof BusinessDetails, value: string) {
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
    <form className="ob-form" onSubmit={handleSubmit} noValidate aria-label="Business details">
      <div className="ob-grid-2">
        <div className="ob-field">
          <label className="ob-label ob-label-required" htmlFor="ob-legal-name">Legal business name</label>
          <input
            id="ob-legal-name"
            className={`ob-input${errors.legalName ? ' ob-input-error' : ''}`}
            type="text"
            value={form.legalName}
            onChange={e => set('legalName', e.target.value)}
            placeholder="Acme Corp Ltd."
            autoComplete="organization"
            aria-required="true"
            aria-describedby={errors.legalName ? 'ob-legal-name-err' : undefined}
          />
          {errors.legalName && <span id="ob-legal-name-err" className="ob-error" role="alert">{errors.legalName}</span>}
        </div>

        <div className="ob-field">
          <label className="ob-label ob-label-required" htmlFor="ob-reg-number">Registration number</label>
          <input
            id="ob-reg-number"
            className={`ob-input${errors.registrationNumber ? ' ob-input-error' : ''}`}
            type="text"
            value={form.registrationNumber}
            onChange={e => set('registrationNumber', e.target.value)}
            placeholder="RC-1234567"
            aria-required="true"
            aria-describedby={errors.registrationNumber ? 'ob-reg-number-err' : undefined}
          />
          {errors.registrationNumber && <span id="ob-reg-number-err" className="ob-error" role="alert">{errors.registrationNumber}</span>}
        </div>
      </div>

      <div className="ob-grid-2">
        <div className="ob-field">
          <label className="ob-label ob-label-required" htmlFor="ob-country">Country of incorporation</label>
          <input
            id="ob-country"
            className={`ob-input${errors.country ? ' ob-input-error' : ''}`}
            type="text"
            value={form.country}
            onChange={e => set('country', e.target.value)}
            placeholder="Nigeria"
            aria-required="true"
            aria-describedby={errors.country ? 'ob-country-err' : undefined}
          />
          {errors.country && <span id="ob-country-err" className="ob-error" role="alert">{errors.country}</span>}
        </div>

        <div className="ob-field">
          <label className="ob-label ob-label-required" htmlFor="ob-biz-type">Business type</label>
          <select
            id="ob-biz-type"
            className={`ob-select${errors.businessType ? ' ob-input-error' : ''}`}
            value={form.businessType}
            onChange={e => set('businessType', e.target.value)}
            aria-required="true"
            aria-describedby={errors.businessType ? 'ob-biz-type-err' : undefined}
          >
            <option value="">Select type…</option>
            {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.businessType && <span id="ob-biz-type-err" className="ob-error" role="alert">{errors.businessType}</span>}
        </div>
      </div>

      <div className="ob-field">
        <label className="ob-label" htmlFor="ob-website">Website <span className="ob-hint" style={{ fontWeight: 400 }}>(optional)</span></label>
        <input
          id="ob-website"
          className={`ob-input${errors.website ? ' ob-input-error' : ''}`}
          type="url"
          value={form.website}
          onChange={e => set('website', e.target.value)}
          placeholder="https://acmecorp.com"
          autoComplete="url"
          aria-describedby={errors.website ? 'ob-website-err' : 'ob-website-hint'}
        />
        {errors.website
          ? <span id="ob-website-err" className="ob-error" role="alert">{errors.website}</span>
          : <span id="ob-website-hint" className="ob-hint">Include https://</span>}
      </div>

      <div className="ob-actions">
        <button type="submit" className="ob-btn ob-btn-primary">Continue →</button>
      </div>
    </form>
  )
}
