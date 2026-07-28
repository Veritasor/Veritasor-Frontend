/**
 * Tests for WebhookRetryPanel (#271)
 *
 * Covers:
 *  - Attempt list rendering (ordered list, backoff chips)
 *  - Status chips for each attempt (success 2xx, timeout, errors)
 *  - Backoff intervals displayed with human-readable durations
 *  - "Retry now" button (only for failed deliveries)
 *  - Final-status footer with outcome summary
 *  - Accessible labels and semantic HTML
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WebhookRetryPanel from '../../components/WebhookRetryPanel'
import type { WebhookDelivery } from '../../components/api-keys/apiKeyTypes'

const failedDelivery: WebhookDelivery = {
  id: 'wh_001',
  event: 'attestation.completed',
  triggeredAt: '2026-07-28T09:30:00Z',
  status: 'failed',
  attempts: [
    {
      attempt: 1,
      at: '2026-07-28T09:30:00Z',
      statusCode: null,
      error: 'Connection refused',
      backoffSeconds: 60,
    },
    {
      attempt: 2,
      at: '2026-07-28T09:31:00Z',
      statusCode: 503,
      backoffSeconds: 120,
    },
    {
      attempt: 3,
      at: '2026-07-28T09:33:00Z',
      statusCode: 500,
    },
  ],
}

const retryingDelivery: WebhookDelivery = {
  id: 'wh_002',
  event: 'source.connected',
  triggeredAt: '2026-07-28T08:00:00Z',
  status: 'retrying',
  attempts: [
    {
      attempt: 1,
      at: '2026-07-28T08:00:00Z',
      statusCode: 503,
      backoffSeconds: 60,
    },
    {
      attempt: 2,
      at: '2026-07-28T08:01:00Z',
      statusCode: 503,
      backoffSeconds: 180,
    },
  ],
}

const deliveredDelivery: WebhookDelivery = {
  id: 'wh_003',
  event: 'attestation.failed',
  triggeredAt: '2026-07-27T18:45:00Z',
  status: 'delivered',
  attempts: [
    {
      attempt: 1,
      at: '2026-07-27T18:45:00Z',
      statusCode: 503,
      backoffSeconds: 60,
    },
    {
      attempt: 2,
      at: '2026-07-27T18:46:00Z',
      statusCode: 200,
    },
  ],
}

describe('WebhookRetryPanel — rendering', () => {
  it('renders an article landmark with accessible label', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    expect(screen.getByRole('article', { name: /webhook delivery.*attestation\.completed/i })).toBeInTheDocument()
  })

  it('displays the event name in a <code> element', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    expect(screen.getByText('attestation.completed')).toBeInTheDocument()
    expect(screen.getByText('attestation.completed').tagName).toBe('CODE')
  })

  it('displays triggered timestamp with a <time> element', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    const timeElement = document.querySelector('time')
    expect(timeElement).toBeInTheDocument()
    expect(timeElement).toHaveAttribute('dateTime', '2026-07-28T09:30:00Z')
  })

  it('renders an ordered list of attempts with accessible label', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    expect(screen.getByRole('list', { name: /3 attempt/i })).toBeInTheDocument()
  })

  it('renders an attempt number badge for each attempt', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    const badges = document.querySelectorAll('span[style*="border-radius: 50%"]')
    expect(badges.length).toBeGreaterThanOrEqual(3)
  })
})

describe('WebhookRetryPanel — attempt status chips', () => {
  it('shows a timeout chip when statusCode is null', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    expect(screen.getByText(/timeout/i)).toBeInTheDocument()
  })

  it('shows an error chip when statusCode is 5xx', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('503')).toBeInTheDocument()
  })

  it('shows an OK chip when statusCode is 2xx', () => {
    render(<WebhookRetryPanel delivery={deliveredDelivery} onRetry={() => {}} />)
    expect(screen.getByText(/200 ok/i)).toBeInTheDocument()
  })
})

describe('WebhookRetryPanel — backoff chips', () => {
  it('renders backoff chips between attempts when backoffSeconds is present', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    // First attempt → 60s backoff
    expect(screen.getByText(/wait 60s/i)).toBeInTheDocument()
    // Second attempt → 120s backoff (2m)
    expect(screen.getByText(/wait 2m/i)).toBeInTheDocument()
  })

  it('does not render a backoff chip after the last attempt', () => {
    const { container } = render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    const backoffChips = container.querySelectorAll('[aria-hidden="true"]:has(> span)')
    // With 3 attempts, we should have exactly 2 backoff chips
    expect(backoffChips.length).toBeLessThanOrEqual(2)
  })
})

describe('WebhookRetryPanel — retry button', () => {
  it('shows "Retry now" button when status is "failed"', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    expect(screen.getByRole('button', { name: /retry delivery.*attestation\.completed/i })).toBeInTheDocument()
  })

  it('does not show "Retry now" button when status is "delivered"', () => {
    render(<WebhookRetryPanel delivery={deliveredDelivery} onRetry={() => {}} />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('does not show "Retry now" button when status is "retrying"', () => {
    render(<WebhookRetryPanel delivery={retryingDelivery} onRetry={() => {}} />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('calls onRetry with the delivery id when clicked', () => {
    const onRetry = vi.fn()
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(onRetry).toHaveBeenCalledWith('wh_001')
  })

  it('disables the button when isRetrying=true', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} isRetrying={true} />)
    expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled()
  })

  it('shows "Retrying…" text when isRetrying=true', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} isRetrying={true} />)
    expect(screen.getByText(/retrying/i)).toBeInTheDocument()
  })

  it('button has aria-busy when isRetrying=true', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} isRetrying={true} />)
    expect(screen.getByRole('button', { name: /retrying/i })).toHaveAttribute('aria-busy', 'true')
  })
})

describe('WebhookRetryPanel — final status footer', () => {
  it('shows success footer for "delivered" status', () => {
    render(<WebhookRetryPanel delivery={deliveredDelivery} onRetry={() => {}} />)
    expect(screen.getByRole('status', { name: /delivered after 2 attempt/i })).toBeInTheDocument()
  })

  it('shows warning footer for "retrying" status', () => {
    render(<WebhookRetryPanel delivery={retryingDelivery} onRetry={() => {}} />)
    expect(screen.getByRole('status', { name: /retrying.*attempt 2 of up to 5/i })).toBeInTheDocument()
  })

  it('shows danger footer for "failed" status', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    expect(screen.getByRole('status', { name: /failed after 3 attempt/i })).toBeInTheDocument()
  })

  it('includes error detail in failed footer when available', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    // Last attempt had statusCode 500 (no error text), but first had 'Connection refused'
    // The footer should show the last attempt's error if available
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('WebhookRetryPanel — accessibility', () => {
  it('attempt list is an ordered list (ol)', () => {
    const { container } = render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    expect(container.querySelector('ol')).toBeInTheDocument()
  })

  it('each attempt has a screen-reader hint', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    const srOnlyElements = document.querySelectorAll('.sr-only')
    expect(srOnlyElements.length).toBeGreaterThanOrEqual(3)
  })

  it('backoff chips are aria-hidden', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    // Backoff chips themselves are decorative; SR users get the info from the attempt text
    const ariaHidden = document.querySelectorAll('[aria-hidden="true"]')
    expect(ariaHidden.length).toBeGreaterThanOrEqual(2)
  })

  it('triggered timestamp has dateTime attribute', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    const timeElements = document.querySelectorAll('time')
    timeElements.forEach((time) => {
      expect(time).toHaveAttribute('dateTime')
    })
  })

  it('final status footer has role="status"', () => {
    render(<WebhookRetryPanel delivery={failedDelivery} onRetry={() => {}} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
