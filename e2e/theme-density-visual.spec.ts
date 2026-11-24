import { expect, test } from '@playwright/test'
import {
  gotoVisualPage,
  type VisualDensity,
  type VisualTheme,
} from './rtl-helper'

const visualMatrix: Array<{ theme: VisualTheme; density: VisualDensity }> = [
  { theme: 'dark', density: 'comfortable' },
  { theme: 'dark', density: 'compact' },
  { theme: 'high-contrast', density: 'comfortable' },
  { theme: 'high-contrast', density: 'compact' },
]

const settingsTabs = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'team', label: 'Team' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
  { id: 'audit-log', label: 'Audit Log' },
  { id: 'a11y-audit', label: 'Accessibility' },
]

function snapshotName(
  page: string,
  theme: VisualTheme,
  density: VisualDensity,
) {
  return `${page}-${theme}-${density}-ar.png`
}

for (const { theme, density } of visualMatrix) {
  test.describe(`${theme} theme, ${density} density, Arabic RTL`, () => {
    test('captures dashboard and confirmation dialog', async ({ page }) => {
      await gotoVisualPage(page, '/dashboard', { theme, density })

      await expect(page).toHaveScreenshot(
        snapshotName('dashboard', theme, density),
        { animations: 'disabled', fullPage: true },
      )

      await page
        .getByRole('button', { name: 'Trigger monthly revenue report' })
        .click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page).toHaveScreenshot(
        snapshotName('dashboard-dialog', theme, density),
        { animations: 'disabled', fullPage: true },
      )
    })

    for (const { id, label } of settingsTabs) {
      test(`captures Settings ${label} tab`, async ({ page }) => {
        await gotoVisualPage(page, `/settings?visual=${id}#${id}`, {
          theme,
          density,
        })

        const mobileTabTrigger = page.locator('#settings-sheet-trigger')
        if (await mobileTabTrigger.isVisible()) {
          await expect(mobileTabTrigger).toContainText(label)
        } else {
          await expect(page.getByRole('tab', { name: label })).toHaveAttribute(
            'aria-selected',
            'true',
          )
        }
        await expect(page).toHaveScreenshot(
          snapshotName(`settings-${id}`, theme, density),
          { animations: 'disabled', fullPage: true },
        )
      })
    }

    test('captures the unsaved-changes dialog', async ({ page }) => {
      await gotoVisualPage(page, '/settings#profile', { theme, density })
      await page.getByLabel('Display name').fill('Visual Regression User')
      const mobileTabTrigger = page.locator('#settings-sheet-trigger')
      if (await mobileTabTrigger.isVisible()) {
        await mobileTabTrigger.click()
        await page
          .getByRole('dialog', { name: 'Settings sections' })
          .getByRole('button', { name: 'Notifications' })
          .click()
      } else {
        await page.getByRole('tab', { name: 'Notifications' }).click()
      }

      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toBeVisible()
      await expect(page).toHaveScreenshot(
        snapshotName('settings-unsaved-dialog', theme, density),
        { animations: 'disabled', fullPage: true },
      )
    })
  })
}
