import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LocaleProvider } from '../i18n/provider'
import Landing from './Landing'

function renderLanding() {
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    </LocaleProvider>,
  )
}

describe('Landing — landmarks and skip link', () => {
  it('renders a skip-to-content link targeting main', () => {
    renderLanding()

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('renders exactly one banner, one main, and one contentinfo landmark', () => {
    renderLanding()

    const banners = screen.getAllByRole('banner')
    expect(banners).toHaveLength(1)

    const mains = screen.getAllByRole('main')
    expect(mains).toHaveLength(1)
    expect(mains[0]).toHaveAttribute('id', 'main-content')
    expect(mains[0]).toHaveAttribute('tabindex', '-1')

    const footers = screen.getAllByRole('contentinfo')
    expect(footers).toHaveLength(1)
  })

  it('exposes uniquely labelled primary and footer navigation landmarks', () => {
    renderLanding()

    const navs = screen.getAllByRole('navigation')
    expect(navs).toHaveLength(2)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument()
  })
})

describe('Landing — heading structure', () => {
  it('renders exactly one h1 inside the main landmark', () => {
    renderLanding()

    const main = screen.getByRole('main')
    const allH1s = screen.getAllByRole('heading', { level: 1 })
    expect(allH1s).toHaveLength(1)
    expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(allH1s[0]).toHaveTextContent('Prove your revenue. Without exposing your books.')
  })

  it('maintains a valid heading hierarchy without skipping levels', () => {
    renderLanding()

    const headings = screen.getAllByRole('heading')
    const levels = headings.map((h) => Number(h.tagName.replace('H', '')))

    expect(levels[0]).toBe(1)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
    }
  })
})

describe('Landing — CTAs and decorative elements', () => {
  it('provides descriptive accessible names for all CTA links', () => {
    renderLanding()

    const navCta = screen.getByRole('link', {
      name: 'Get started — create a Veritasor account',
    })
    expect(navCta).toHaveAttribute('href', '/signup')

    const heroCreateCta = screen.getByRole('link', {
      name: 'Create a Veritasor account',
    })
    expect(heroCreateCta).toHaveAttribute('href', '/signup')

    const heroDemoCta = screen.getByRole('link', {
      name: 'Explore the demo dashboard',
    })
    expect(heroDemoCta).toHaveAttribute('href', '/dashboard')

    const finalCta = screen.getByRole('link', {
      name: 'Get started — attest your first period',
    })
    expect(finalCta).toHaveAttribute('href', '/signup')
  })

  it('hides decorative step numbers from assistive technology', () => {
    const { container } = renderLanding()

    const stepBadges = container.querySelectorAll('.landing-step-n')
    expect(stepBadges.length).toBeGreaterThan(0)
    stepBadges.forEach((badge) => {
      expect(badge).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
