import { Page, expect } from '@playwright/test'

export async function gotoRTL(page: Page, path: string) {
  // Navigate to page
  await page.goto(path)

  // Switch locale or toggle RTL direction on the root HTML element
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')
  })

  // Ensure the page rendered in RTL mode before taking snapshots
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
}