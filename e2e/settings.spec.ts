import { test, expect } from './fixtures'

test.describe('Settings hash tabs', () => {
  test('switches tabs and syncs URL hash', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: /settings/i, level: 1 })).toBeVisible()

    const profileTab = page.getByRole('tab', { name: /^profile$/i })
    const notificationsTab = page.getByRole('tab', { name: /^notifications$/i })
    const securityTab = page.getByRole('tab', { name: /^security$/i })

    await expect(profileTab).toHaveAttribute('aria-selected', 'true')

    await notificationsTab.click()
    await expect(page).toHaveURL(/\/settings#notifications/)
    await expect(notificationsTab).toHaveAttribute('aria-selected', 'true')

    await securityTab.click()
    await expect(page).toHaveURL(/\/settings#security/)
    await expect(securityTab).toHaveAttribute('aria-selected', 'true')
  })

  test('loads the requested tab directly from URL hash', async ({ page }) => {
    await page.goto('/settings#appearance')
    const appearanceTab = page.getByRole('tab', { name: /^appearance$/i })
    await expect(appearanceTab).toHaveAttribute('aria-selected', 'true')
  })
})
