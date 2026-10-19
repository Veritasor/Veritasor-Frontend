import { useState } from "react"
import { Link } from "react-router-dom"

export interface FailedPaymentInfo {
  id: string
  invoiceId: string
  invoicePeriod: string
  amount: number
  dueDate: string
  failureReason: string
  lastAttemptAt: string
}

interface Props {
  failure: FailedPaymentInfo | null
  onDismiss?: () => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

export default function FailedPaymentBanner({ failure, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (!failure || dismissed) return null

  function handleDismiss() {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Payment failure notice"
      className="failed-payment-banner"
    >
      <div
        className="failed-payment-banner-inner"
        role="status"
      >
        <div
          className="failed-payment-icon-wrap"
          aria-hidden="true"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div className="failed-payment-content">
          <div className="failed-payment-heading">
            <strong>Payment failed</strong>
            <span className="failed-payment-amount">
              {formatCurrency(failure.amount)} due {formatDate(failure.dueDate)}
            </span>
          </div>
          <p className="failed-payment-description">
            Your {failure.invoicePeriod} invoice ({failure.invoiceId}) could not be charged.
            Update your payment method to restore service and avoid interruption.
          </p>
          <div className="failed-payment-actions">
            <Link
              to="/settings#billing"
              className="failed-payment-cta"
              aria-label="Update payment method to resolve failed payment"
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Update payment method
            </Link>
            <Link
              to={`/settings#billing`}
              className="failed-payment-secondary-link"
              aria-label={`View invoice ${failure.invoiceId} for ${failure.invoicePeriod}`}
            >
              View affected invoice
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17L17 7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </Link>
          </div>
        </div>

        <button
          type="button"
          className="failed-payment-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss payment failure notice"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
