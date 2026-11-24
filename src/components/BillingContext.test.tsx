import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BillingProvider,
  INITIAL_INVOICES,
  INITIAL_PAYMENT_METHODS,
  useBilling,
  type BillingContextValue,
  type BillingProviderProps,
} from './BillingContext'
import FailedPaymentBanner from './FailedPaymentBanner'
import type { FailedPaymentInfo } from './FailedPaymentBanner'
import UsageMeter from './UsageMeter'
import { LocaleProvider } from '../i18n/provider'
import Settings from '../pages/Settings'

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FAILURE_A: FailedPaymentInfo = {
  id: 'fp_001',
  invoiceId: 'inv_005',
  invoicePeriod: 'March 2026',
  amount: 29.0,
  dueDate: '2026-03-15',
  failureReason: 'Card declined',
  lastAttemptAt: '2026-07-28T09:00:00Z',
}

const FAILURE_B: FailedPaymentInfo = {
  id: 'fp_002',
  invoiceId: 'inv_006',
  invoicePeriod: 'April 2026',
  amount: 149.5,
  dueDate: '2026-04-15',
  failureReason: 'Insufficient funds',
  lastAttemptAt: '2026-08-02T11:30:00Z',
}

const lastOf = (renders: BillingContextValue[]) =>
  renders[renders.length - 1] as BillingContextValue

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Probe() {
  const { failedPayment, plan, currentPlan } = useBilling()
  return (
    <div>
      <span data-testid="presence">{failedPayment ? 'present' : 'absent'}</span>
      <span data-testid="failure-id">{failedPayment?.id ?? 'none'}</span>
      <span data-testid="plan-id">{plan}</span>
      <span data-testid="plan-limit">{currentPlan.limits.attestations}</span>
    </div>
  )
}

function useRecorder(renders: BillingContextValue[]) {
  const api = useBilling()
  useEffect(() => {
    renders.push(api)
  })
}

function renderProvider(
  ui: ReactNode = <Probe />,
  options: { router?: boolean; providerProps?: Omit<BillingProviderProps, 'children'> } = {},
) {
  const renders: BillingContextValue[] = []

  function Capture() {
    useRecorder(renders)
    return null
  }

  const tree = (
    <BillingProvider {...options.providerProps}>
      <Capture />
      {ui}
    </BillingProvider>
  )

  render(options.router ? <MemoryRouter>{tree}</MemoryRouter> : tree)

  return { latest: () => lastOf(renders), renders: () => renders }
}

function renderOrphaned() {
  const renders: BillingContextValue[] = []

  function Capture() {
    useRecorder(renders)
    return null
  }

  render(<Capture />)

  return { latest: () => lastOf(renders), renders: () => renders }
}

function BillingScreen() {
  const { failedPayment, setFailedPayment, dismissFailedPayment } = useBilling()
  return (
    <div>
      <FailedPaymentBanner failure={failedPayment} onDismiss={dismissFailedPayment} />
      <button type="button" onClick={dismissFailedPayment}>
        Dismiss notice
      </button>
      <button type="button" onClick={() => setFailedPayment(FAILURE_B)}>
        Report new failure
      </button>
      <button type="button" onClick={() => setFailedPayment(null)}>
        Mark billing healthy
      </button>
    </div>
  )
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe('BillingProvider — initial state', () => {
  it('seeds default plan, payment methods, invoices, and no failed payment for valid default card', () => {
    const { latest } = renderProvider()

    expect(latest().plan).toBe('growth')
    expect(latest().currentPlan.name).toBe('Growth')
    expect(latest().billingCycle).toBe('monthly')
    expect(latest().paymentMethods).toEqual(INITIAL_PAYMENT_METHODS)
    expect(latest().invoices).toEqual(INITIAL_INVOICES)
    expect(latest().failedPayment).toBeNull()
  })

  it('derives an initial failed payment when the initial default payment method is expired', () => {
    const expiredDefault = INITIAL_PAYMENT_METHODS.map((m) => ({
      ...m,
      isDefault: m.id === 'pm_003',
    }))
    const { latest } = renderProvider(<Probe />, {
      providerProps: { initialPaymentMethods: expiredDefault },
    })

    expect(latest().failedPayment).not.toBeNull()
    expect(latest().failedPayment?.failureReason).toMatch(/0005/)
  })

  it('renders without throwing when no children are supplied', () => {
    expect(() => render(<BillingProvider>{null}</BillingProvider>)).not.toThrow()
  })
})

// ─── Plan and payment method mutations ───────────────────────────────────────

describe('BillingProvider — plan & payment method mutations', () => {
  it('updates plan and currentPlan limits when changePlan is called', () => {
    const { latest } = renderProvider()

    expect(latest().plan).toBe('growth')
    expect(latest().currentPlan.limits.attestations).toBe(10_000)

    act(() => {
      latest().changePlan('enterprise')
    })

    expect(latest().plan).toBe('enterprise')
    expect(latest().currentPlan.limits.attestations).toBe(100_000)
    expect(screen.getByTestId('plan-id')).toHaveTextContent('enterprise')
    expect(screen.getByTestId('plan-limit')).toHaveTextContent('100000')
  })

  it('sets failedPayment when an expired card becomes default and clears it when a valid card becomes default', () => {
    const { latest } = renderProvider()
    expect(latest().failedPayment).toBeNull()

    // Make expired Amex (pm_003) the default
    act(() => {
      latest().setDefaultMethod('pm_003')
    })

    expect(latest().paymentMethods.find((m) => m.id === 'pm_003')?.isDefault).toBe(true)
    expect(latest().failedPayment).not.toBeNull()
    expect(latest().failedPayment?.failureReason).toMatch(/0005/)

    // Replace with valid Visa (pm_001)
    act(() => {
      latest().setDefaultMethod('pm_001')
    })

    expect(latest().paymentMethods.find((m) => m.id === 'pm_001')?.isDefault).toBe(true)
    expect(latest().failedPayment).toBeNull()
  })

  it('removes a non-default payment method and refuses to remove the default method', () => {
    const { latest } = renderProvider()

    act(() => {
      latest().removeMethod('pm_002')
    })
    expect(latest().paymentMethods.some((m) => m.id === 'pm_002')).toBe(false)

    // Default method pm_001 should not be removed
    act(() => {
      latest().removeMethod('pm_001')
    })
    expect(latest().paymentMethods.some((m) => m.id === 'pm_001')).toBe(true)
  })
})

// ─── setFailedPayment & dismissFailedPayment ─────────────────────────────────

describe('BillingProvider — setFailedPayment & dismissFailedPayment', () => {
  it('publishes, replaces, and dismisses failed payment records', () => {
    const { latest } = renderProvider()

    act(() => {
      latest().setFailedPayment(FAILURE_A)
    })
    expect(latest().failedPayment).toBe(FAILURE_A)
    expect(screen.getByTestId('failure-id')).toHaveTextContent('fp_001')

    act(() => {
      latest().setFailedPayment(FAILURE_B)
    })
    expect(latest().failedPayment).toBe(FAILURE_B)
    expect(screen.getByTestId('failure-id')).toHaveTextContent('fp_002')

    act(() => {
      latest().dismissFailedPayment()
    })
    expect(latest().failedPayment).toBeNull()
    expect(screen.getByTestId('presence')).toHaveTextContent('absent')
  })

  it('keeps mutator references stable across re-renders', () => {
    const { latest, renders } = renderProvider()

    act(() => {
      latest().setFailedPayment(FAILURE_B)
    })
    act(() => {
      latest().dismissFailedPayment()
    })

    const captured = renders()
    expect(captured.length).toBeGreaterThanOrEqual(3)
    for (const api of captured) {
      expect(api.setFailedPayment).toBe(captured[0].setFailedPayment)
      expect(api.dismissFailedPayment).toBe(captured[0].dismissFailedPayment)
      expect(api.changePlan).toBe(captured[0].changePlan)
      expect(api.setDefaultMethod).toBe(captured[0].setDefaultMethod)
      expect(api.removeMethod).toBe(captured[0].removeMethod)
    }
  })
})

// ─── useBilling outside a provider ────────────────────────────────────────────

describe('useBilling — outside BillingProvider', () => {
  it('does not throw and returns an inert fallback API', () => {
    const { latest } = renderOrphaned()
    const api = latest()

    expect(api.failedPayment).toBeNull()
    expect(api.plan).toBe('growth')
    expect(() => api.setFailedPayment(FAILURE_A)).not.toThrow()
    expect(() => api.dismissFailedPayment()).not.toThrow()
    expect(() => api.changePlan('enterprise')).not.toThrow()
    expect(() => api.setDefaultMethod('pm_003')).not.toThrow()
    expect(() => api.removeMethod('pm_002')).not.toThrow()
  })
})

// ─── Integration: FailedPaymentBanner + UsageMeter + Settings ────────────────

describe('BillingProvider — integration with UsageMeter, FailedPaymentBanner, and Settings', () => {
  const notice = () => screen.queryByRole('region', { name: 'Payment failure notice' })

  it('renders and clears FailedPaymentBanner via context transitions', () => {
    renderProvider(<BillingScreen />, {
      router: true,
      providerProps: { initialFailedPayment: FAILURE_A },
    })

    expect(notice()).toBeInTheDocument()
    expect(screen.getByText(/\$29\.00/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss payment failure notice' }))
    expect(notice()).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Report new failure' }))
    expect(notice()).toBeInTheDocument()
    expect(screen.getByText(/\$149\.50/)).toBeInTheDocument()
  })

  it('upgrade updates UsageMeter limit and tier automatically', () => {
    function PlanAndMeter() {
      const { changePlan } = useBilling()
      return (
        <div>
          <UsageMeter
            label="Attestations"
            used={900}
            metric="attestations"
            unit="attestations"
          />
          <button type="button" onClick={() => changePlan('growth')}>
            Upgrade to Growth
          </button>
        </div>
      )
    }

    renderProvider(<PlanAndMeter />, {
      providerProps: { initialPlan: 'starter' },
    })

    // On Starter (limit 1,000), 900 used is 90% -> Critical
    const meter = screen.getByRole('meter', { name: 'Attestations' })
    expect(meter).toHaveAttribute('aria-valuenow', '90')
    expect(meter).toHaveAttribute('aria-valuetext', '900 of 1,000 attestations used (90%)')
    expect(screen.getByText('Critical')).toBeInTheDocument()

    // Upgrade to Growth (limit 10,000) -> 900 / 10,000 = 9% -> On track
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Growth' }))

    expect(meter).toHaveAttribute('aria-valuenow', '9')
    expect(meter).toHaveAttribute('aria-valuetext', '900 of 10,000 attestations used (9%)')
    expect(screen.getByText('On track')).toBeInTheDocument()
  })

  it('failing card shows banner and replacing it with a valid card clears it in Settings', () => {
    function BannerSlot() {
      const { failedPayment, dismissFailedPayment } = useBilling()
      return <FailedPaymentBanner failure={failedPayment} onDismiss={dismissFailedPayment} />
    }

    const router = createMemoryRouter(
      [
        {
          path: '/settings',
          element: (
            <BillingProvider initialPlan="starter">
              <BannerSlot />
              <UsageMeter
                label="Attestations"
                used={900}
                metric="attestations"
                unit="attestations"
              />
              <Settings />
            </BillingProvider>
          ),
        },
      ],
      { initialEntries: ['/settings#billing'] },
    )

    render(
      <LocaleProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </LocaleProvider>,
    )

    // Initially no banner (Visa 4242 is default and valid)
    expect(notice()).not.toBeInTheDocument()

    // Set expired Amex 0005 as default -> banner appears
    fireEvent.click(screen.getByRole('button', { name: /Set Amex ending 0005 as default/i }))
    expect(notice()).toBeInTheDocument()

    // Replace with valid Visa 4242 as default -> banner clears
    fireEvent.click(screen.getByRole('button', { name: /Set Visa ending 4242 as default/i }))
    expect(notice()).not.toBeInTheDocument()

    // Upgrade plan from Starter to Enterprise in Settings -> UsageMeter updates
    fireEvent.click(screen.getByRole('button', { name: /Upgrade to Enterprise plan/i }))
    fireEvent.click(screen.getByRole('button', { name: /Confirm upgrade/i }))

    const meter = screen.getByRole('meter', { name: 'Attestations' })
    expect(meter).toHaveAttribute('aria-valuetext', '900 of 100,000 attestations used (1%)')
  })
})
