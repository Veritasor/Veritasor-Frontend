import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { gotoRTL } from './rtl-helper'

const pagesToTest = [
  { name: 'Dashboard', path: '/' },
  { name: 'Attestations', path: '/attestations' },
  { name: 'Settings', path: '/settings' },
  { name: 'Login', path: '/login' },
]

test.describe('RTL Visual Regression & Accessibility', () => {
  for (const { name, path } of pagesToTest) {
    test(`${name} page RTL layout`, async ({ page }) => {
      await gotoRTL(page, path)

      // Visual snapshot
      await expect(page).toHaveScreenshot(`${name.toLowerCase()}-rtl.png`)

      // WCAG 2.1 AA Accessibility check
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })
  }
})