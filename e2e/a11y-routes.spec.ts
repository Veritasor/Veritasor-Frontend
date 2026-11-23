import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

/**
 * Every route registered in `src/App.tsx`.
 * Each route is scanned with axe-core against WCAG 2.0 A & AA rules.
 */
const APP_ROUTES: Array<{ name: string; path: string }> = [
  { name: 'Landing', path: '/' },
  { name: 'Login', path: '/login' },
  { name: 'Signup', path: '/signup' },
  { name: 'Forgot Password', path: '/forgot-password' },
  { name: 'Onboarding', path: '/onboarding' },
  { name: 'Server Error (500)', path: '/500' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Attestations', path: '/attestations' },
  { name: 'Attestation Detail', path: '/attestations/att_001' },
  { name: 'Revenue Sources', path: '/sources' },
  { name: 'Settings', path: '/settings' },
  { name: 'API Keys', path: '/api-keys' },
  { name: 'Help Article', path: '/help' },
  { name: 'Consent Preferences', path: '/consent-preferences' },
  { name: 'Connect Source - Provider', path: '/connect-source/provider' },
  { name: 'Connect Source - Authorize', path: '/connect-source/authorize' },
  { name: 'Connect Source - Callback', path: '/connect-source/callback' },
  { name: 'Connect Source - Scope', path: '/connect-source/scope' },
  { name: 'Connect Source - Mapping', path: '/connect-source/mapping' },
  { name: 'Connect Source - Confirm', path: '/connect-source/confirm' },
  { name: 'Not Found (404)', path: '/this-route-does-not-exist' },
]

test.describe('Route accessibility scans (WCAG 2.0 A / AA)', () => {
  for (const { name, path } of APP_ROUTES) {
    test(`${name} (${path}) has no axe violations`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('domcontentloaded')
      await expect(page.locator('main, [role="main"], h1').first()).toBeVisible()

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()

      expect(results.violations).toEqual([])
    })
  }
})
