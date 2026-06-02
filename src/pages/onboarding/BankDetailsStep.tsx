import { useState } from 'react'
import type { BankDetails } from '../../hooks/useOnboardingDraft'

type Props = {
  data: BankDetails
  onBack: () => void
  onNext: (data: BankDetails) => void
}

type Errors = Partial<Record<keyof BankDetails, string>>

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'Other']

function validate(d: BankDetails): Errors {
  const e: Errors = {}
  if (!d.bankName.trim()) e.bankName = 'Bank name is required'
  if (!d.accountNumber.trim()) e.accountNumber = 'Account number is required'
  if (!d.ibanSwift.trim()) e.ibanSwift = 'IBAN or SWIFT/BIC is required'
  if (!d.currency) e.currency = 'Currency is required'
  return e
}

export default function BankDetailsStep({ data, onBack, onNext }: Props) {
  const [form, setForm] = useState<BankDetails>(data)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState(false)

  function set(field: keyof BankDetails, value: string) {
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
    <form className="ob-form" onSubmit={handleSubmit} noValidate aria-label="Bank and payout details">
      <div className="ob-field">
        <label className="ob-label ob-label-required" htmlFor="ob-bank-name">Bank name</label>
        <input
          id="ob-bank-name"
          className={`ob-input${errors.bankName ? ' ob-input-error' : ''}`}
          type="text"
          value={form.bankName}
          onChange={e => set('bankName', e.target.value)}
          placeholder="First Bank of Nigeria"
          aria-required="true"
          aria-describedby={errors.bankName ? 'ob-bank-name-err' : undefined}
        />
        {errors.bankName && <span id="ob-bank-name-err" className="ob-error" role="alert">{errors.bankName}</span>}
      </div>

      <div className="ob-grid-2">
        <div className="ob-field">
          <label className="ob-label ob-label-required" htmlFor="ob-account-number">Account number</label>
          <input
            id="ob-account-number"
            className={`ob-input${errors.accountNumber ? ' ob-input-error' : ''}`}
            type="text"
            value={form.accountNumber}
            onChange={e => set('accountNumber', e.target.value)}
            placeholder="0123456789"
            autoComplete="off"
            aria-required="true"
            aria-describedby={errors.accountNumber ? 'ob-account-number-err' : undefined}
          />
          {errors.accountNumber && <span id="ob-account-number-err" className="ob-error" role="alert">{errors.accountNumber}</span>}
        </div>

        <div className="ob-field">
          <label className="ob-label ob-label-required" htmlFor="ob-currency">Settlement currency</label>
          <select
            id="ob-currency"
            className={`ob-select${errors.currency ? ' ob-input-error' : ''}`}
            value={form.currency}
            onChange={e => set('currency', e.target.value)}
            aria-required="true"
            aria-describedby={errors.currency ? 'ob-currency-err' : undefined}
          >
            <option value="">Select currency…</option>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.currency && <span id="ob-currency-err" className="ob-error" role="alert">{errors.currency}</span>}
        </div>
      </div>

      <div className="ob-field">
        <label className="ob-label ob-label-required" htmlFor="ob-iban-swift">IBAN / SWIFT-BIC</label>
        <input
          id="ob-iban-swift"
          className={`ob-input${errors.ibanSwift ? ' ob-input-error' : ''}`}
          type="text"
          value={form.ibanSwift}
          onChange={e => set('ibanSwift', e.target.value)}
          placeholder="GB29 NWBK 6016 1331 9268 19 or AAAABBCC"
          autoComplete="off"
          aria-required="true"
          aria-describedby={errors.ibanSwift ? 'ob-iban-swift-err' : 'ob-iban-swift-hint'}
        />
        {errors.ibanSwift
          ? <span id="ob-iban-swift-err" className="ob-error" role="alert">{errors.ibanSwift}</span>
          : <span id="ob-iban-swift-hint" className="ob-hint">Enter your IBAN for SEPA accounts or SWIFT/BIC for international wires</span>}
      </div>

      <div className="ob-actions">
        <button type="button" className="ob-btn ob-btn-secondary" onClick={onBack}>← Back</button>
        <button type="submit" className="ob-btn ob-btn-primary">Continue →</button>
      </div>
    </form>
  )
}
