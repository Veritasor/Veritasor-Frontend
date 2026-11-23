import { test, expect } from './fixtures'

test.describe('Attestations flow', () => {
  test('triggers a new attestation from dashboard and displays it on /attestations', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

    // Open attestation confirmation modal
    await page.getByRole('button', { name: /trigger monthly revenue report/i }).click()
    const dialog = page.getByRole('dialog', { name: /confirm revenue attestation/i })
    await expect(dialog).toBeVisible()

    // Confirm attestation submission
    await dialog.getByRole('button', { name: /confirm|submit|attest/i }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(/attestation submitted successfully/i)).toBeVisible()

    // Navigate to attestations list and verify the run is listed
    await page.getByRole('link', { name: /view attestation history/i }).click()
    await expect(page).toHaveURL(/\/attestations/)
    await expect(page.getByRole('heading', { name: 'Attestations', level: 1 })).toBeVisible()

    const runsSection = page.getByRole('region', { name: /attestation runs/i })
    await expect(runsSection).toBeVisible()
    await expect(runsSection.locator('ol > li').first()).toBeVisible()
  })

  test('closes attestation confirmation modal with Escape and restores focus', async ({ page }) => {
    await page.goto('/dashboard')
    const triggerButton = page.getByRole('button', { name: /trigger monthly revenue report/i })
    await triggerButton.click()

    const dialog = page.getByRole('dialog', { name: /confirm revenue attestation/i })
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(triggerButton).toBeFocused()
  })
})
