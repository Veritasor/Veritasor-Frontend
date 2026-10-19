import React, { createContext, useContext, useState, useCallback } from "react"
import type { FailedPaymentInfo } from "./FailedPaymentBanner"

interface BillingContextValue {
  failedPayment: FailedPaymentInfo | null
  setFailedPayment: (f: FailedPaymentInfo | null) => void
  dismissFailedPayment: () => void
}

const BillingContext = createContext<BillingContextValue | undefined>(undefined)

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [failedPayment, setFailedPayment] = useState<FailedPaymentInfo | null>(null)

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
