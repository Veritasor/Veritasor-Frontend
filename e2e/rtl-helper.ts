import { Page, expect } from '@playwright/test'

export type VisualTheme = 'dark' | 'high-contrast'
export type VisualDensity = 'comfortable' | 'compact'

export interface VisualPreferences {
  theme: VisualTheme
  density: VisualDensity
}

const FIXED_VISUAL_TIME = new Date('2026-07-15T12:00:00.000Z')

export async function gotoVisualPage(
  page: Page,
  path: string,
  { theme = 'dark', density = 'comfortable' }: Partial<VisualPreferences> = {},
) {
  await page.clock.setFixedTime(FIXED_VISUAL_TIME)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/v1/preferences/density**', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ density }),
      })
    }

    return route.fulfill({ status: 200 })
  })
  await page.addInitScript(({ selectedTheme, selectedDensity }) => {
    localStorage.setItem('preferred-locale', 'ar')
    localStorage.setItem('veritasor-theme', selectedTheme)
    localStorage.setItem('veritasor_density_default-workspace', selectedDensity)
    localStorage.setItem('veritasor_density_default', selectedDensity)
  }, { selectedTheme: theme, selectedDensity: density })

  await page.goto(path)
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.evaluate(
    ({ selectedTheme, selectedDensity }) => {
      document.documentElement.setAttribute('data-theme', selectedTheme)
      document.documentElement.setAttribute('data-density', selectedDensity)
    },
    { selectedTheme: theme, selectedDensity: density },
  )

  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  await expect(page.locator('html')).toHaveAttribute('data-density', density)
}

export async function gotoRTL(page: Page, path: string) {
  await gotoVisualPage(page, path)
}