export type PlanId = "starter" | "growth" | "enterprise"

export type BillingCycle = "monthly" | "annual"

export interface PlanLimits {
  attestations: number
  apiCalls: number
}

export interface PlanFeature {
  label: string
  values: Record<PlanId, string | boolean>
}

export interface PlanMeta {
  id: PlanId
  name: string
  monthlyPrice: number
  annualPrice: number
  description: string
  recommended?: boolean
  limits: PlanLimits
}

export interface ProratedImpact {
  label: string
  amount: string
  rawAmount: number
  isCredit: boolean
  isNoChange: boolean
}

export const PLANS: PlanMeta[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    annualPrice: 290,
    description: "For small teams getting started with attestations.",
    limits: {
      attestations: 1_000,
      apiCalls: 10_000,
    },
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 49,
    annualPrice: 490,
    description: "For growing businesses that need more capacity.",
    limits: {
      attestations: 10_000,
      apiCalls: 100_000,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 99,
    annualPrice: 990,
    description: "For organizations with advanced compliance needs.",
    recommended: true,
    limits: {
      attestations: 100_000,
      apiCalls: 1_000_000,
    },
  },
]

export const PLAN_FEATURES: PlanFeature[] = [
  {
    label: "Attestations per month",
    values: { starter: "1,000", growth: "10,000", enterprise: "Unlimited" },
  },
  {
    label: "Team members",
    values: { starter: "3", growth: "10", enterprise: "Unlimited" },
  },
  {
    label: "API access",
    values: { starter: true, growth: true, enterprise: true },
  },
  {
    label: "Webhook integrations",
    values: { starter: "5", growth: "20", enterprise: "Unlimited" },
  },
  {
    label: "Audit log retention",
    values: { starter: "30 days", growth: "90 days", enterprise: "365 days" },
  },
  {
    label: "Custom branding",
    values: { starter: false, growth: true, enterprise: true },
  },
  {
    label: "Priority support",
    values: { starter: false, growth: "Email", enterprise: "24/7 Phone + Email" },
  },
  {
    label: "SSO / SAML",
    values: { starter: false, growth: false, enterprise: true },
  },
  {
    label: "Dedicated account manager",
    values: { starter: false, growth: false, enterprise: true },
  },
  {
    label: "SLA guarantee",
    values: { starter: "99.5%", growth: "99.9%", enterprise: "99.99%" },
  },
]

export const DEFAULT_PLAN_ID: PlanId = "growth"
export const DEFAULT_BILLING_CYCLE: BillingCycle = "monthly"

export function getPlanById(id: PlanId): PlanMeta {
  return PLANS.find((p) => p.id === id) ?? PLANS[1]
}

export function getPrice(plan: PlanMeta, cycle: BillingCycle = "monthly"): number {
  return cycle === "annual" ? plan.annualPrice : plan.monthlyPrice
}

export function formatProratedImpact(
  from: PlanMeta,
  to: PlanMeta,
  cycle: BillingCycle = "monthly",
  daysRemaining?: number,
): ProratedImpact {
  const fromPrice = getPrice(from, cycle)
  const toPrice = getPrice(to, cycle)
  const diff = toPrice - fromPrice
  const totalDays = cycle === "annual" ? 365 : 30
  const remaining = daysRemaining ?? totalDays / 2
  const clampedRemaining = Math.max(0, Math.min(remaining, totalDays))
  const rawAmount = Math.round((Math.abs(diff) / totalDays) * clampedRemaining * 100) / 100
  const isCredit = diff < 0
  const isNoChange = diff === 0

  return {
    label: isNoChange
      ? "No prorated adjustment"
      : isCredit
        ? "Prorated credit for remaining billing period"
        : "Prorated charge for remaining billing period",
    amount: `$${rawAmount.toFixed(2)}`,
    rawAmount,
    isCredit,
    isNoChange,
  }
}
