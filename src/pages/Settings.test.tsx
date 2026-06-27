/**
 * Settings page tests
 *
 * Covers the tabbed navigation pattern for issue #172:
 * - WAI-ARIA tablist / tab / tabpanel roles
 * - Arrow-key navigation (Left / Right / Home / End)
 * - Deep-link URL-hash routing
 * - Responsive select collapse
 */

import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Settings from '../pages/Settings'

function renderSettings(hash = '') {
  return render(
    <MemoryRouter initialEntries={[`/settings${hash}`]}>
      <Routes>
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ─── Basic rendering ──────────────────────────────────────────────────────────

describe('Settings — rendering', () => {
  it('renders the page heading', () => {
    renderSettings()
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument()
  })

  it('renders a tablist with aria-label', () => {
    renderSettings()
    expect(screen.getByRole('tablist', { name: /settings tabs/i })).toBeInTheDocument()
  })

  it('renders all 5 tabs', () => {
    renderSettings()
    expect(screen.getAllByRole('tab')).toHaveLength(5)
  })

  it('renders all 5 tab panels (including hidden)', () => {
    renderSettings()
    expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(5)
  })

  it('renders a select for mobile collapse', () => {
    renderSettings()
    expect(screen.getByRole('combobox', { name: /settings section/i })).toBeInTheDocument()
  })

  it('renders tab labels: Profile, Notifications, API Keys, Billing, Security', () => {
    renderSettings()
    expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /notifications/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /api keys/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /billing/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument()
  })
})

// ─── Default active tab ───────────────────────────────────────────────────────

describe('Settings — default tab', () => {
  it('activates the Profile tab by default', () => {
    renderSettings()
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('Profile panel is visible by default (not hidden)', () => {
    renderSettings()
    expect(document.getElementById('panel-profile')).not.toHaveAttribute('hidden')
  })

  it('Profile tab has tabIndex 0; others have -1', () => {
    renderSettings()
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: /notifications/i })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tab', { name: /billing/i })).toHaveAttribute('tabindex', '-1')
  })
})

// ─── Deep links ───────────────────────────────────────────────────────────────

describe('Settings — deep links (URL hash)', () => {
  it('activates Notifications tab when hash is #notifications', () => {
    renderSettings('#notifications')
    expect(screen.getByRole('tab', { name: /notifications/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('activates API Keys tab when hash is #api-keys', () => {
    renderSettings('#api-keys')
    expect(screen.getByRole('tab', { name: /api keys/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('activates Billing tab when hash is #billing', () => {
    renderSettings('#billing')
    expect(screen.getByRole('tab', { name: /billing/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('activates Security tab when hash is #security', () => {
    renderSettings('#security')
    expect(screen.getByRole('tab', { name: /security/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('falls back to Profile for an unknown hash', () => {
    renderSettings('#unknown')
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true')
  })
})

// ─── Tab click navigation ─────────────────────────────────────────────────────

describe('Settings — click navigation', () => {
  it('clicking Notifications activates it and shows its panel', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('tab', { name: /notifications/i }))
    expect(screen.getByRole('tab', { name: /notifications/i })).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('panel-notifications')).not.toHaveAttribute('hidden')
  })

  it('clicking a new tab deactivates the previous one', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('tab', { name: /billing/i }))
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('clicking Billing shows the Billing panel content', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('tab', { name: /billing/i }))
    expect(screen.getByRole('heading', { name: /billing/i })).toBeInTheDocument()
  })

  it('clicking Security shows the Security panel content', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('tab', { name: /security/i }))
    expect(screen.getByRole('heading', { name: /security/i })).toBeInTheDocument()
  })

  it('clicking API Keys shows the API Keys panel content', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('tab', { name: /api keys/i }))
    expect(screen.getByRole('heading', { name: /api keys/i })).toBeInTheDocument()
  })
})

// ─── ARIA attributes ──────────────────────────────────────────────────────────

describe('Settings — ARIA attributes', () => {
  it('each tab has aria-controls pointing to its panel id', () => {
    renderSettings()
    const profileTab = screen.getByRole('tab', { name: /profile/i })
    expect(profileTab).toHaveAttribute('aria-controls', 'panel-profile')
    expect(document.getElementById('panel-profile')).toBeInTheDocument()
  })

  it('each tabpanel has aria-labelledby pointing to its tab id', () => {
    renderSettings()
    const profilePanel = document.getElementById('panel-profile')
    expect(profilePanel).toHaveAttribute('aria-labelledby', 'tab-profile')
    expect(document.getElementById('tab-profile')).toBeInTheDocument()
  })

  it('inactive panels have hidden attribute', () => {
    renderSettings()
    expect(document.getElementById('panel-notifications')).toHaveAttribute('hidden')
    expect(document.getElementById('panel-billing')).toHaveAttribute('hidden')
    expect(document.getElementById('panel-security')).toHaveAttribute('hidden')
  })

  it('active panel does not have hidden attribute', () => {
    renderSettings()
    expect(document.getElementById('panel-profile')).not.toHaveAttribute('hidden')
  })

  it('tabpanels have tabIndex 0', () => {
    renderSettings()
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    panels.forEach((panel) => expect(panel).toHaveAttribute('tabindex', '0'))
  })
})

// ─── Keyboard navigation ──────────────────────────────────────────────────────

describe('Settings — keyboard navigation', () => {
  it('ArrowRight moves focus from Profile to Notifications', () => {
    renderSettings()
    const profileTab = screen.getByRole('tab', { name: /profile/i })
    fireEvent.keyDown(profileTab, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /notifications/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowLeft moves focus from Notifications to Profile', () => {
    renderSettings('#notifications')
    const notifTab = screen.getByRole('tab', { name: /notifications/i })
    fireEvent.keyDown(notifTab, { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowRight wraps from last tab to first', () => {
    renderSettings('#security')
    const securityTab = screen.getByRole('tab', { name: /security/i })
    fireEvent.keyDown(securityTab, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowLeft wraps from first tab to last', () => {
    renderSettings()
    const profileTab = screen.getByRole('tab', { name: /profile/i })
    fireEvent.keyDown(profileTab, { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: /security/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('Home key navigates to the first tab', () => {
    renderSettings('#security')
    const securityTab = screen.getByRole('tab', { name: /security/i })
    fireEvent.keyDown(securityTab, { key: 'Home' })
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('End key navigates to the last tab', () => {
    renderSettings()
    const profileTab = screen.getByRole('tab', { name: /profile/i })
    fireEvent.keyDown(profileTab, { key: 'End' })
    expect(screen.getByRole('tab', { name: /security/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('unrelated key does not change the active tab', () => {
    renderSettings()
    const profileTab = screen.getByRole('tab', { name: /profile/i })
    fireEvent.keyDown(profileTab, { key: 'Tab' })
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true')
  })
})

// ─── Mobile select ────────────────────────────────────────────────────────────

describe('Settings — mobile select', () => {
  it('changing the select switches the active tab', () => {
    renderSettings()
    const select = screen.getByRole('combobox', { name: /settings section/i })
    fireEvent.change(select, { target: { value: 'billing' } })
    expect(screen.getByRole('tab', { name: /billing/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('select has the correct initial value', () => {
    renderSettings()
    const select = screen.getByRole('combobox', { name: /settings section/i }) as HTMLSelectElement
    expect(select.value).toBe('profile')
  })

  it('select options include all 5 tabs', () => {
    renderSettings()
    const select = screen.getByRole('combobox', { name: /settings section/i })
    const options = Array.from((select as HTMLSelectElement).options)
    expect(options).toHaveLength(5)
  })
})

// ─── Panel content spot checks ────────────────────────────────────────────────

describe('Settings — panel content', () => {
  it('Profile panel contains a display-name input', () => {
    renderSettings()
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
  })

  it('Profile panel contains an email input', () => {
    renderSettings()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('Notifications panel lists notification items', () => {
    renderSettings('#notifications')
    expect(screen.getByLabelText(/attestation completed/i)).toBeInTheDocument()
  })

  it('API Keys panel shows a code element', () => {
    renderSettings('#api-keys')
    expect(document.querySelector('code')).toBeInTheDocument()
  })

  it('Billing panel shows a description list', () => {
    renderSettings('#billing')
    expect(document.querySelector('dl')).toBeInTheDocument()
  })

  it('Security panel contains a current-password input', () => {
    renderSettings('#security')
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
  })
})
