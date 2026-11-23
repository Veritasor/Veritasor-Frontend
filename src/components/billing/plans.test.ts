import { describe, expect, it } from "vitest"
import {
  PLANS,
  getPlanById,
  getPrice,
  formatProratedImpact,
} from "./plans"

const starter = getPlanById("starter")
const growth = getPlanById("growth")
const enterprise = getPlanById("enterprise")

describe("plans and pricing helpers", () => {
  it("resolves plans by id", () => {
    expect(starter.name).toBe("Starter")
    expect(growth.name).toBe("Growth")
    expect(enterprise.name).toBe("Enterprise")
    expect(PLANS).toHaveLength(3)
  })

  it("returns monthly and annual prices via getPrice", () => {
    expect(getPrice(starter, "monthly")).toBe(29)
    expect(getPrice(starter, "annual")).toBe(290)
    expect(getPrice(growth, "monthly")).toBe(49)
    expect(getPrice(growth, "annual")).toBe(490)
    expect(getPrice(enterprise, "monthly")).toBe(99)
    expect(getPrice(enterprise, "annual")).toBe(990)
  })

  describe("formatProratedImpact — monthly", () => {
    it("calculates prorated charge on upgrade (default half-cycle)", () => {
      const impact = formatProratedImpact(growth, enterprise, "monthly")
      expect(impact.isCredit).toBe(false)
      expect(impact.isNoChange).toBe(false)
      expect(impact.rawAmount).toBe(25)
      expect(impact.amount).toBe("$25.00")
      expect(impact.label).toBe("Prorated charge for remaining billing period")
    })

    it("calculates prorated credit on downgrade (default half-cycle)", () => {
      const impact = formatProratedImpact(growth, starter, "monthly")
      expect(impact.isCredit).toBe(true)
      expect(impact.isNoChange).toBe(false)
      expect(impact.rawAmount).toBe(10)
      expect(impact.amount).toBe("$10.00")
      expect(impact.label).toBe("Prorated credit for remaining billing period")
    })

    it("calculates custom daysRemaining accurately", () => {
      // Starter ($29) -> Enterprise ($99): diff = $70, 6 of 30 days = $14.00
      const impact = formatProratedImpact(starter, enterprise, "monthly", 6)
      expect(impact.isCredit).toBe(false)
      expect(impact.rawAmount).toBe(14)
      expect(impact.amount).toBe("$14.00")
    })

    it("returns no change when upgrading to the same plan", () => {
      const impact = formatProratedImpact(growth, growth, "monthly")
      expect(impact.isCredit).toBe(false)
      expect(impact.isNoChange).toBe(true)
      expect(impact.rawAmount).toBe(0)
      expect(impact.amount).toBe("$0.00")
      expect(impact.label).toBe("No prorated adjustment")
    })
  })

  describe("formatProratedImpact — annual", () => {
    it("calculates prorated charge on annual upgrade (default half-cycle)", () => {
      // Growth ($490) -> Enterprise ($990): diff = $500, half-year = $250.00
      const impact = formatProratedImpact(growth, enterprise, "annual")
      expect(impact.isCredit).toBe(false)
      expect(impact.rawAmount).toBe(250)
      expect(impact.amount).toBe("$250.00")
    })

    it("calculates prorated credit on annual downgrade (default half-cycle)", () => {
      // Growth ($490) -> Starter ($290): diff = -$200, half-year = $100.00
      const impact = formatProratedImpact(growth, starter, "annual")
      expect(impact.isCredit).toBe(true)
      expect(impact.rawAmount).toBe(100)
      expect(impact.amount).toBe("$100.00")
    })

    it("clamps daysRemaining to [0, totalDays]", () => {
      const zero = formatProratedImpact(starter, enterprise, "annual", -10)
      expect(zero.rawAmount).toBe(0)
      expect(zero.amount).toBe("$0.00")

      const full = formatProratedImpact(starter, enterprise, "annual", 500)
      expect(full.rawAmount).toBe(700)
      expect(full.amount).toBe("$700.00")
    })
  })
})
