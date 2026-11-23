import { test, expect } from './fixtures'

test.describe('API keys flow', () => {
  test('creates a new API key and displays the one-time secret', async ({ page }) => {
    await page.goto('/api-keys')
    await expect(page.getByRole('heading', { name: 'API keys', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: /^create key$/i }).click()
    const createDialog = page.getByRole('dialog').first()
    await expect(createDialog).toBeVisible()

    // Submit the create key form and confirm if a confirmation dialog appears
    await createDialog.getByRole('button', { name: /create|mint|generate/i }).last().click()

    const confirmDialog = page.getByRole('dialog').last()
    if (await confirmDialog.isVisible()) {
      const confirmBtn = confirmDialog.getByRole('button', { name: /confirm|create|mint/i }).last()
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
      }
    }

    const revealedBanner = page.getByRole('region', { name: /new api key revealed/i })
    await expect(revealedBanner).toBeVisible()
    await expect(revealedBanner.getByRole('heading', { name: /key created/i })).toBeVisible()

    await revealedBanner.getByRole('button', { name: /^done$/i }).click()
    await expect(revealedBanner).toBeHidden()
  })

  test('revokes an active API key after typing its exact label', async ({ page }) => {
    await page.goto('/api-keys')
    await expect(page.getByRole('heading', { name: 'API keys', level: 1 })).toBeVisible()

    const targetRow = page.getByRole('group', { name: /API key Auditor \(read-only\), Active/i })
    await expect(targetRow).toBeVisible()

    await targetRow.getByRole('button', { name: /revoke/i }).click()

    const revokeDialog = page.getByRole('dialog')
    await expect(revokeDialog).toBeVisible()

    const confirmButton = revokeDialog.getByRole('button', { name: /revoke/i }).last()
    await expect(confirmButton).toBeDisabled()

    await revokeDialog.getByRole('textbox').fill('Auditor (read-only)')
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()

    await expect(revokeDialog).toBeHidden()
    await expect(
      page.getByRole('group', { name: /API key Auditor \(read-only\), Revoked/i }),
    ).toBeVisible()
  })
})
