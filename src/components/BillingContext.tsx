import React, { createContext, useContext, useState, useCallback } from "react"
import type { FailedPaymentInfo } from "./FailedPaymentBanner"

interface BillingContextValue {
  failedPayment: FailedPaymentInfo | null
  setFailedPayment: (f: FailedPaymentInfo | null) => void
  dismissFailedPayment: () => void
}

const BillingContext = createContext<BillingContextValue | undefined>(undefined)

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [failedPayment, setFailedPayment] = useState<FailedPaymentInfo | null>({
    id: "fp_001",
    invoiceId: "inv_005",
    invoicePeriod: "March 2026",
    amount: 29.0,
    dueDate: "2026-03-15",
    failureReason: "Card declined",
    lastAttemptAt: "2026-07-28T09:00:00Z",
  })

  const dismissFailedPayment = useCallback(() => {
    setFailedPayment(null)
  }, [])

  return (
    <BillingContext.Provider value={{ failedPayment, setFailedPayment, dismissFailedPayment }}>
      {children}
    </BillingContext.Provider>
  )
}

export const useBilling = () => {
  const context = useContext(BillingContext)
  if (!context) {
    return {
      failedPayment: null as FailedPaymentInfo | null,
      setFailedPayment: () => {},
      dismissFailedPayment: () => {},
    }
  }
  return context
}
