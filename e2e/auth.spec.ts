import { test, expect, login } from './fixtures'

test.describe('Authentication flow', () => {
  test('validates required fields and moves focus to invalid input', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText('Email is required.')).toBeVisible()
    await expect(page.getByText('Password is required.')).toBeVisible()
    await expect(page.getByLabel(/work email/i)).toBeFocused()
  })

  test('completes login with MFA challenge and lands on dashboard', async ({ page }) => {
    await login(page)

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /key metrics/i })).toBeVisible()
  })
})
