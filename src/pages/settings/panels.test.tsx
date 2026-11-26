import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocaleProvider } from '../../i18n/provider'
import Settings from '../Settings'

function renderSettingsPanel(hash: string) {
  const router = createMemoryRouter(
    [{ path: '/settings', element: <Settings /> }],
    { initialEntries: [`/settings#${hash}`] },
  )

  return render(
    <LocaleProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </LocaleProvider>,
  )
}

describe('settings panel modules', () => {
  it.each([
    ['profile', 'Profile'],
    ['notifications', 'Notifications'],
    ['api-keys', 'API Keys'],
    ['billing', 'Billing'],
    ['security', 'Security'],
    ['webhooks', 'Webhooks'],
    ['tokens', 'Design tokens'],
    ['audit-log', 'Audit Log'],
    ['team', 'Team'],
    ['appearance', 'Appearance'],
  ])('renders the %s panel heading', (tab, heading) => {
    renderSettingsPanel(tab)
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
  })
})
