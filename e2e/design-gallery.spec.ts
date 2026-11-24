import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

test.describe('DesignGallery accessibility (WCAG 2.0 A / AA)', () => {
  test('renders component gallery in dev with zero axe violations', async ({ page }) => {
    await page.goto('/design-gallery')
    await page.waitForLoadState('domcontentloaded')

    const heading = page.getByRole('heading', { level: 1, name: /component gallery/i })
    const isDevGallery = await heading.isVisible().catch(() => false)

    // In production preview builds, /design-gallery is excluded and falls through to 404.
    test.skip(!isDevGallery, 'DesignGallery is gated on import.meta.env.DEV')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
