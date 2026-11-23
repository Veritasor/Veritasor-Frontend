import { test as base, expect, type Page, type Route } from '@playwright/test'

export interface MockApiOptions {
  /** Override response for POST /api/onboarding/submit */
  onboardingSubmit?: {
    status?: number
    body?: Record<string, unknown>
  }
  /** Override initial density preference returned by GET /v1/preferences/density */
  density?: 'comfortable' | 'compact'
}

/**
 * Registers deterministic `page.route` handlers for all backend endpoints
 * touched by the frontend so E2E tests never depend on a live API server.
 */
export async function mockApi(page: Page, options: MockApiOptions = {}) {
  const initialDensity = options.density ?? 'comfortable'
  let currentDensity = initialDensity

  await page.route('**/v1/preferences/density', async (route: Route) => {
    const method = route.request().method()
    if (method === 'PUT' || method === 'POST') {
      try {
        const payload = route.request().postDataJSON() as { density?: 'comfortable' | 'compact' } | null
        if (payload?.density === 'comfortable' || payload?.density === 'compact') {
          currentDensity = payload.density
        }
      } catch {
        // ignore malformed body in mock
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, density: currentDensity }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ density: currentDensity }),
    })
  })

  await page.route('**/api/onboarding/submit', async (route: Route) => {
    const status = options.onboardingSubmit?.status ?? 200
    const body = options.onboardingSubmit?.body ?? {
      ok: true,
      applicationId: 'app_e2e_001',
      status: 'pending_review',
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })

  await page.route('**/api/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })
}

export interface LoginOptions {
  email?: string
  password?: string
}

/**
 * Completes the full sign-in flow (`/login` credentials -> MFA challenge -> `/dashboard`)
 * without using any fixed sleeps.
 */
export async function login(page: Page, options: LoginOptions = {}) {
  const email = options.email ?? 'ops@veritasor.com'
  const password = options.password ?? 'Veritasor!2026'

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

  await page.getByLabel(/work email/i).fill(email)
  await page.getByLabel(/^password$/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for MFA challenge step
  await expect(page.getByRole('heading', { name: /verify your sign-in/i })).toBeVisible()

  // Submit the default security-key MFA challenge
  await page.getByRole('button', { name: /use security key|verify|continue/i }).first().click()

  // Wait for redirect to Dashboard
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

type VeritasorFixtures = {
  /** Automatically mocks API routes before each test */
  autoMockApi: void
}

export const test = base.extend<VeritasorFixtures>({
  autoMockApi: [
    async ({ page }, use) => {
      await mockApi(page)
      await use()
    },
    { auto: true },
  ],
})

export { expect }
