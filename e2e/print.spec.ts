import { test, expect } from './fixtures'

test.describe('Certificate print styles', () => {
  test('hides navigation and actions in print mode', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/')
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

    // Click on the first attestation to view details
    await page.getByRole('link', { name: /view details/i }).first().click()
    await expect(page).toHaveURL(/\/attestations\/att-\d+/)

    // Wait for the certificate to be visible
    await expect(page.locator('.certificate')).toBeVisible({ timeout: 10000 })

    // Before print emulation, verify no-print elements are visible
    await expect(page.locator('.no-print').first()).toBeVisible()

    // Emulate print media
    await page.emulateMedia({ media: 'print' })

    // After print emulation, no-print elements should be hidden
    const noPrintElements = page.locator('.no-print')
    const count = await noPrintElements.count()
    
    for (let i = 0; i < count; i++) {
      const element = noPrintElements.nth(i)
      // Check that the element has display: none
      const display = await element.evaluate((el) => window.getComputedStyle(el).display)
      expect(display).toBe('none')
    }

    // Print-only elements should be visible
    const printOnlyElements = page.locator('.print-only')
    const printOnlyCount = await printOnlyElements.count()
    
    for (let i = 0; i < printOnlyCount; i++) {
      const element = printOnlyElements.nth(i)
      const display = await element.evaluate((el) => window.getComputedStyle(el).display)
      expect(display).not.toBe('none')
    }
  })

  test('applies page-break-inside: avoid to key certificate sections', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

    // Open attestation confirmation modal
    await page.getByRole('button', { name: /trigger monthly revenue report/i }).click()
    const dialog = page.getByRole('dialog', { name: /confirm revenue attestation/i })
    await expect(dialog).toBeVisible()

    // Confirm attestation submission
    await dialog.getByRole('button', { name: /confirm|submit|attest/i }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(/attestation submitted successfully/i)).toBeVisible()

    // Navigate to attestations list
    await page.getByRole('link', { name: /view attestation history/i }).click()
    await expect(page).toHaveURL(/\/attestations/)

    // Click on the first attestation to view details
    await page.getByRole('link', { name: /view details/i }).first().click()
    await expect(page).toHaveURL(/\/attestations\/att-\d+/)

    // Wait for the certificate to be visible
    await expect(page.locator('.certificate')).toBeVisible({ timeout: 10000 })

    // Emulate print media
    await page.emulateMedia({ media: 'print' })

    // Verify page-break-inside: avoid on key sections
    const selectorsWithPageBreakAvoid = [
      '.certificate-statement',
      '.certificate-data-row',
      '.certificate-seal',
      '.certificate-failure-notice',
      '.certificate-footer',
    ]

    for (const selector of selectorsWithPageBreakAvoid) {
      const elements = page.locator(selector)
      const count = await elements.count()
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i)
        const pageBreakInside = await element.evaluate(
          (el) => window.getComputedStyle(el).pageBreakInside,
        )
        expect(pageBreakInside).toBe('avoid')
      }
    }
  })

  test('applies page-break-after: avoid to header and title sections', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

    // Open attestation confirmation modal
    await page.getByRole('button', { name: /trigger monthly revenue report/i }).click()
    const dialog = page.getByRole('dialog', { name: /confirm revenue attestation/i })
    await expect(dialog).toBeVisible()

    // Confirm attestation submission
    await dialog.getByRole('button', { name: /confirm|submit|attest/i }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(/attestation submitted successfully/i)).toBeVisible()

    // Navigate to attestations list
    await page.getByRole('link', { name: /view attestation history/i }).click()
    await expect(page).toHaveURL(/\/attestations/)

    // Click on the first attestation to view details
    await page.getByRole('link', { name: /view details/i }).first().click()
    await expect(page).toHaveURL(/\/attestations\/att-\d+/)

    // Wait for the certificate to be visible
    await expect(page.locator('.certificate')).toBeVisible({ timeout: 10000 })

    // Emulate print media
    await page.emulateMedia({ media: 'print' })

    // Verify page-break-after: avoid on header and title sections
    const selectorsWithPageBreakAfterAvoid = [
      '.certificate-header',
      '.certificate-title-block',
      '.certificate-statement',
      '.certificate-status',
    ]

    for (const selector of selectorsWithPageBreakAfterAvoid) {
      const elements = page.locator(selector)
      const count = await elements.count()
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i)
        const pageBreakAfter = await element.evaluate(
          (el) => window.getComputedStyle(el).pageBreakAfter,
        )
        expect(pageBreakAfter).toBe('avoid')
      }
    }
  })

  test('applies page-break-before: avoid to footer sections', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

    // Open attestation confirmation modal
    await page.getByRole('button', { name: /trigger monthly revenue report/i }).click()
    const dialog = page.getByRole('dialog', { name: /confirm revenue attestation/i })
    await expect(dialog).toBeVisible()

    // Confirm attestation submission
    await dialog.getByRole('button', { name: /confirm|submit|attest/i }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(/attestation submitted successfully/i)).toBeVisible()

    // Navigate to attestations list
    await page.getByRole('link', { name: /view attestation history/i }).click()
    await expect(page).toHaveURL(/\/attestations/)

    // Click on the first attestation to view details
    await page.getByRole('link', { name: /view details/i }).first().click()
    await expect(page).toHaveURL(/\/attestations\/att-\d+/)

    // Wait for the certificate to be visible
    await expect(page.locator('.certificate')).toBeVisible({ timeout: 10000 })

    // Emulate print media
    await page.emulateMedia({ media: 'print' })

    // Verify page-break-before: avoid on footer sections
    const selectorsWithPageBreakBeforeAvoid = [
      '.certificate-footer',
      '.certificate-authenticity',
    ]

    for (const selector of selectorsWithPageBreakBeforeAvoid) {
      const elements = page.locator(selector)
      const count = await elements.count()
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i)
        const pageBreakBefore = await element.evaluate(
          (el) => window.getComputedStyle(el).pageBreakBefore,
        )
        expect(pageBreakBefore).toBe('avoid')
      }
    }
  })
})
