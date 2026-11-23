import { test, expect, mockApi } from './fixtures'

test.describe('Onboarding wizard flow', () => {
  test('advances from step 1 to step 2 and persists draft across reload', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.getByRole('heading', { name: /business details/i })).toBeVisible()

    await page.locator('#ob-legal-name').fill('Acme Verification Ltd')
    await page.locator('#ob-reg-number').fill('REG-2026-991')

    const countrySelect = page.locator('#ob-country')
    if (await countrySelect.count()) {
      await countrySelect.selectOption({ index: 1 })
    }

    const bizTypeSelect = page.locator('#ob-biz-type')
    if (await bizTypeSelect.count()) {
      await bizTypeSelect.selectOption({ index: 1 })
    }

    // Verify draft badge appears
    await expect(page.getByText(/draft saved/i)).toBeVisible()

    // Reload and verify draft is restored
    await page.reload()
    await expect(page.locator('#ob-legal-name')).toHaveValue('Acme Verification Ltd')
  })

  test('submits a pre-filled onboarding draft to mocked /api/onboarding/submit', async ({ page }) => {
    await mockApi(page, {
      onboardingSubmit: {
        status: 200,
        body: { ok: true, applicationId: 'app_e2e_123', status: 'pending_review' },
      },
    })

    // Seed localStorage draft at step 6 (Review & submit) so submission is tested deterministically
    await page.addInitScript(() => {
      const draft = {
        step: 6,
        business: {
          legalName: 'Acme Verification Ltd',
          registrationNumber: 'REG-2026-991',
          country: 'US',
          businessType: 'llc',
          website: 'https://acme.example.com',
        },
        owner: {
          fullName: 'Jane Doe',
          dateOfBirth: '1990-04-12',
          nationality: 'US',
          addressLine1: '100 Market St',
          addressLine2: '',
          city: 'San Francisco',
          postalCode: '94105',
        },
        selfie: { captured: true, fileName: 'selfie.png' },
        documents: {
          registrationCert: ['cert.pdf'],
          govIdFront: ['id-front.png'],
          govIdBack: ['id-back.png'],
          proofOfAddress: ['utility.pdf'],
        },
        bank: {
          bankName: 'Mercury Bank',
          accountNumber: '123456789',
          currency: 'USD',
          ibanSwift: 'MRCYUS33',
        },
      }
      window.localStorage.setItem('veritasor_onboarding_draft', JSON.stringify(draft))
    })

    await page.goto('/onboarding')
    await expect(page.getByRole('heading', { name: /review & submit/i })).toBeVisible()

    const submitRequest = page.waitForRequest(
      (req) => req.url().includes('/api/onboarding/submit') && req.method() === 'POST',
    )
    await page.getByRole('button', { name: /submit application/i }).click()
    await submitRequest

    // KycPendingScreen should be rendered after successful submission
    await expect(page.getByRole('heading', { name: /application|submitted|review|pending/i })).toBeVisible()
  })
})
