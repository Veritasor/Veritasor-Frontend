import { useState } from 'react'
import type { BusinessDetails } from '../../hooks/useOnboardingDraft'

type Props = {
  data: BusinessDetails
  onNext: (data: BusinessDetails) => void
}

type Errors = Partial<Record<keyof BusinessDetails, string>>

interface EntityType {
  value: string
  label: string
  description: string
  icon: JSX.Element
}

function LIIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="15" x2="20" y2="15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function CorpIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="7" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="14" width="10" height="2" rx="1" fill="currentColor" />
    </svg>
  )
}

function SolePropIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 15C10.134 15 7 18.134 7 22h20c0-3.866-3.134-7-7-7z" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="20" x2="19" y2="20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function NonProfitIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M14 5.5c-3 0-5.5 2.5-5.5 5.5s2.5 5.5 5.5 5.5 5.5-2.5 5.5-5.5-2.5-5.5-5.5-5.5z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14.5a5.5 5.5 0 0 0 5.5 5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14.5a5.5 5.5 0 0 1 -5.5 5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PartnershipIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="9" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 15C5.134 15 2 18.134 2 22h10c0-3.866-3.134-7-7-7z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19 15c3.866 0 7 3.134 7 7H9c0-3.866 3.134-7 7-7z" stroke="currentColor" strokeWidth="1.5" />
      <line x1="14" y1="18" x2="14" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function OtherIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 9v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 17v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const ENTITY_TYPES: EntityType[] = [
  { value: 'LLC', label: 'LLC', description: 'Flexible structure with personal asset protection and pass-through taxation.', icon: <LIIcon /> },
  { value: 'Corporation', label: 'C-Corp', description: 'Separate legal entity able to raise capital through equity; subject to corporate tax.', icon: <CorpIcon /> },
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship', description: 'Unincorporated business owned by one person; simplest structure with no corporate separation.', icon: <SolePropIcon /> },
  { value: 'Non-Profit', label: 'Nonprofit', description: 'Mission-driven organization exempt from income tax; profits reinvested in the mission.', icon: <NonProfitIcon /> },
  { value: 'Partnership', label: 'Partnership', description: 'Business owned by two or more individuals sharing profits, losses, and management duties.', icon: <PartnershipIcon /> },
  { value: 'Other', label: 'Other', description: 'Another entity type not listed above; please specify during review.', icon: <OtherIcon /> },
]

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
          <label className="ob-label ob-label-required" htmlFor="ob-website">Website <span className="ob-hint" style={{ fontWeight: 400 }}>(optional)</span></label>
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
      </div>

      <div className="ob-field">
        <fieldset className="ob-biz-fieldset">
          <legend className="ob-biz-legend">Business type</legend>
          {errors.businessType && <span id="ob-biz-type-err" className="ob-error" role="alert">{errors.businessType}</span>}

          <div className="ob-biz-grid">
            {ENTITY_TYPES.map((entity) => {
              const inputId = `ob-biz-type-${entity.value.toLowerCase().replace(/\s+/g, '-')}`
              const isChecked = form.businessType === entity.value

              return (
                <label key={entity.value} className="ob-biz-card">
                  <input
                    id={inputId}
                    className="ob-biz-input"
                    type="radio"
                    name="ob-biz-type"
                    value={entity.value}
                    checked={isChecked}
                    onChange={() => set('businessType', entity.value)}
                    aria-describedby={errors.businessType ? 'ob-biz-type-err' : undefined}
                  />
                  <span className="ob-biz-surface">
                    <span className="ob-biz-headline">
                      <span className="ob-biz-icon" aria-hidden="true">{entity.icon}</span>
                      <span className="ob-biz-title">{entity.label}</span>
                    </span>
                    <span className="ob-biz-description">{entity.description}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      </div>

      <div className="ob-actions">
        <button type="submit" className="ob-btn ob-btn-primary">Continue →</button>
      </div>
    </form>
  )
}
