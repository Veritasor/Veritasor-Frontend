import React, { createContext, useContext, useState, useCallback, useMemo } from "react"
import type { FailedPaymentInfo } from "./FailedPaymentBanner"
import {
  DEFAULT_BILLING_CYCLE,
  DEFAULT_PLAN_ID,
  getPlanById,
  type BillingCycle,
  type PlanId,
  type PlanMeta,
} from "./billing/plans"

export type InvoiceStatus = "paid" | "open" | "overdue" | "void"

export interface Invoice {
  id: string
  period: string
  amount: number
  status: InvoiceStatus
  dueDate: string
  pdfUrl: string
}

export type CardBrand = "visa" | "mastercard" | "amex" | "discover"
export type PaymentMethodStatus = "ok" | "expiring" | "expired"

export interface PaymentMethod {
  id: string
  brand: CardBrand
  last4: string
  expMonth: number
  expYear: number
  status: PaymentMethodStatus
  isDefault: boolean
}

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: "inv_001",
    period: "June 2026",
    amount: 49.0,
    status: "paid",
    dueDate: "2026-06-01",
    pdfUrl: "#invoice-001",
  },
  {
    id: "inv_002",
    period: "May 2026",
    amount: 49.0,
    status: "paid",
    dueDate: "2026-05-01",
    pdfUrl: "#invoice-002",
  },
  {
    id: "inv_003",
    period: "April 2026",
    amount: 49.0,
    status: "paid",
    dueDate: "2026-04-01",
    pdfUrl: "#invoice-003",
  },
  {
    id: "inv_004",
    period: "July 2026",
    amount: 49.0,
    status: "open",
    dueDate: "2026-07-15",
    pdfUrl: "#invoice-004",
  },
  {
    id: "inv_005",
    period: "March 2026",
    amount: 29.0,
    status: "overdue",
    dueDate: "2026-03-15",
    pdfUrl: "#invoice-005",
  },
  {
    id: "inv_006",
    period: "February 2026",
    amount: 29.0,
    status: "void",
    dueDate: "2026-02-15",
    pdfUrl: "#invoice-006",
  },
  {
    id: "inv_007",
    period: "January 2026",
    amount: 29.0,
    status: "paid",
    dueDate: "2026-01-15",
    pdfUrl: "#invoice-007",
  },
  {
    id: "inv_008",
    period: "December 2025",
    amount: 29.0,
    status: "paid",
    dueDate: "2025-12-15",
    pdfUrl: "#invoice-008",
  },
  {
    id: "inv_009",
    period: "November 2025",
    amount: 29.0,
    status: "paid",
    dueDate: "2025-11-15",
    pdfUrl: "#invoice-009",
  },
  {
    id: "inv_010",
    period: "October 2025",
    amount: 29.0,
    status: "paid",
    dueDate: "2025-10-15",
    pdfUrl: "#invoice-010",
  },
  {
    id: "inv_011",
    period: "September 2025",
    amount: 29.0,
    status: "paid",
    dueDate: "2025-09-15",
    pdfUrl: "#invoice-011",
  },
  {
    id: "inv_012",
    period: "August 2025",
    amount: 29.0,
    status: "paid",
    dueDate: "2025-08-15",
    pdfUrl: "#invoice-012",
  },
]

export const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "pm_001",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2028,
    status: "ok",
    isDefault: true,
  },
  {
    id: "pm_002",
    brand: "mastercard",
    last4: "5678",
    expMonth: 8,
    expYear: 2026,
    status: "expiring",
    isDefault: false,
  },
  {
    id: "pm_003",
    brand: "amex",
    last4: "0005",
    expMonth: 3,
    expYear: 2025,
    status: "expired",
    isDefault: false,
  },
]

function deriveFailedPaymentForMethod(
  method: PaymentMethod | undefined,
  invoices: Invoice[],
): FailedPaymentInfo | null {
  if (!method || method.status !== "expired") return null
  const overdue = invoices.find((inv) => inv.status === "overdue") ?? invoices[0]
  return {
    id: `fp_${method.id}`,
    invoiceId: overdue?.id ?? "inv_005",
    invoicePeriod: overdue?.period ?? "March 2026",
    amount: overdue?.amount ?? 29.0,
    dueDate: overdue?.dueDate ?? "2026-03-15",
    failureReason: `Card ending in ${method.last4} has expired`,
    lastAttemptAt: "2026-07-28T09:00:00Z",
  }
}

export interface BillingContextValue {
  plan: PlanId
  currentPlan: PlanMeta
  billingCycle: BillingCycle
  setBillingCycle: (cycle: BillingCycle) => void
  paymentMethods: PaymentMethod[]
  invoices: Invoice[]
  failedPayment: FailedPaymentInfo | null
  setFailedPayment: (f: FailedPaymentInfo | null) => void
  dismissFailedPayment: () => void
  changePlan: (planId: PlanId) => void
  setDefaultMethod: (id: string) => void
  removeMethod: (id: string) => void
  addPaymentMethod: (method: Omit<PaymentMethod, "id">) => void
}

export interface BillingProviderProps {
  children: React.ReactNode
  initialPlan?: PlanId
  initialBillingCycle?: BillingCycle
  initialPaymentMethods?: PaymentMethod[]
  initialInvoices?: Invoice[]
  initialFailedPayment?: FailedPaymentInfo | null
}

const BillingContext = createContext<BillingContextValue | undefined>(undefined)

export const BillingProvider: React.FC<BillingProviderProps> = ({
  children,
  initialPlan = DEFAULT_PLAN_ID,
  initialBillingCycle = DEFAULT_BILLING_CYCLE,
  initialPaymentMethods = INITIAL_PAYMENT_METHODS,
  initialInvoices = INITIAL_INVOICES,
  initialFailedPayment,
}) => {
  const [plan, setPlan] = useState<PlanId>(initialPlan)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialBillingCycle)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods)
  const [invoices] = useState<Invoice[]>(initialInvoices)
  const [failedPayment, setFailedPayment] = useState<FailedPaymentInfo | null>(() => {
    if (initialFailedPayment !== undefined) return initialFailedPayment
    const defaultMethod = initialPaymentMethods.find((m) => m.isDefault)
    return deriveFailedPaymentForMethod(defaultMethod, initialInvoices)
  })

  const currentPlan = useMemo(() => getPlanById(plan), [plan])

  const dismissFailedPayment = useCallback(() => {
    setFailedPayment(null)
  }, [])

  const changePlan = useCallback((planId: PlanId) => {
    setPlan(planId)
  }, [])

  const setDefaultMethod = useCallback(
    (id: string) => {
      setPaymentMethods((prev) => {
        const target = prev.find((m) => m.id === id)
        if (!target) return prev
        const next = prev.map((m) => ({ ...m, isDefault: m.id === id }))
        if (target.status === "expired") {
          setFailedPayment(deriveFailedPaymentForMethod(target, invoices))
        } else {
          setFailedPayment(null)
        }
        return next
      })
    },
    [invoices],
  )

  const removeMethod = useCallback((id: string) => {
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id || m.isDefault))
  }, [])

  const addPaymentMethod = useCallback(
    (method: Omit<PaymentMethod, "id">) => {
      const id = `pm_${Date.now()}`
      const newMethod: PaymentMethod = { ...method, id }
      setPaymentMethods((prev) => {
        const next = method.isDefault
          ? [...prev.map((m) => ({ ...m, isDefault: false })), newMethod]
          : [...prev, newMethod]
        if (method.isDefault) {
          if (newMethod.status === "expired") {
            setFailedPayment(deriveFailedPaymentForMethod(newMethod, invoices))
          } else {
            setFailedPayment(null)
          }
        }
        return next
      })
    },
    [invoices],
  )

  const value = useMemo<BillingContextValue>(
    () => ({
      plan,
      currentPlan,
      billingCycle,
      setBillingCycle,
      paymentMethods,
      invoices,
      failedPayment,
      setFailedPayment,
      dismissFailedPayment,
      changePlan,
      setDefaultMethod,
      removeMethod,
      addPaymentMethod,
    }),
    [
      plan,
      currentPlan,
      billingCycle,
      paymentMethods,
      invoices,
      failedPayment,
      dismissFailedPayment,
      changePlan,
      setDefaultMethod,
      removeMethod,
      addPaymentMethod,
    ],
  )

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}

const FALLBACK_BILLING_VALUE: BillingContextValue = {
  plan: DEFAULT_PLAN_ID,
  currentPlan: getPlanById(DEFAULT_PLAN_ID),
  billingCycle: DEFAULT_BILLING_CYCLE,
  setBillingCycle: () => {},
  paymentMethods: INITIAL_PAYMENT_METHODS,
  invoices: INITIAL_INVOICES,
  failedPayment: null,
  setFailedPayment: () => {},
  dismissFailedPayment: () => {},
  changePlan: () => {},
  setDefaultMethod: () => {},
  removeMethod: () => {},
  addPaymentMethod: () => {},
}

export const useBilling = (): BillingContextValue => {
  const context = useContext(BillingContext)
  if (!context) {
    return FALLBACK_BILLING_VALUE
  }
  return context
}
