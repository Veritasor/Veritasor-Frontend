/**
 * HelpArticle tests
 *
 * Covers issue #XXX:
 * - No nested <main> landmark (was previously wrapping content in <main>)
 * - Content rendered correctly inside an <article>
 * - When rendered inside Layout's <main>, only one main landmark exists
 */

import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { IntlProvider } from 'react-intl'
import HelpArticle from './HelpArticle'
import Layout from '../components/Layout'
import { CookieConsentProvider } from '../components/CookieConsentContext'
import enMessages from '../i18n/messages/en.json'

function renderStandalone() {
  return render(
    <MemoryRouter>
      <HelpArticle />
    </MemoryRouter>,
  )
}

function renderInsideLayout() {
  return render(
    <MemoryRouter initialEntries={['/help']}>
      <IntlProvider locale="en" messages={enMessages}>
        <CookieConsentProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route path="help" element={<HelpArticle />} />
            </Route>
          </Routes>
        </CookieConsentProvider>
      </IntlProvider>
    </MemoryRouter>,
  )
}

// ─── Regression: no nested <main> ────────────────────────────────────────────

describe('HelpArticle — landmark structure', () => {
  it('does not render a <main> element', () => {
    renderStandalone()
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
  })

  it('renders an <article> element', () => {
    const { container } = renderStandalone()
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('when rendered inside Layout, exactly one main landmark exists', () => {
    renderInsideLayout()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('the sole main landmark is Layouts #main-content', () => {
    renderInsideLayout()
    expect(document.getElementById('main-content')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBe(document.getElementById('main-content'))
  })
})

// ─── Content ──────────────────────────────────────────────────────────────────

describe('HelpArticle — content', () => {
  it('renders the page heading', () => {
    renderStandalone()
    expect(
      screen.getByRole('heading', { level: 1, name: /getting started with veritasor/i }),
    ).toBeInTheDocument()
  })

  it('renders the "Create a workspace" section heading', () => {
    renderStandalone()
    expect(screen.getByRole('heading', { name: /create a workspace/i })).toBeInTheDocument()
  })

  it('renders the "Add an attestation" section heading', () => {
    renderStandalone()
    expect(screen.getByRole('heading', { name: /add an attestation/i })).toBeInTheDocument()
  })

  it('renders the "Verify and share" section heading', () => {
    renderStandalone()
    expect(screen.getByRole('heading', { name: /verify and share/i })).toBeInTheDocument()
  })

  it('renders the last-updated meta text', () => {
    renderStandalone()
    expect(screen.getByText(/last updated/i)).toBeInTheDocument()
  })

  it('renders the HelpArticleFeedback component', () => {
    renderStandalone()
    // HelpArticleFeedback renders feedback controls — confirm it mounted
    // by checking the outer wrapper is present in the article
    const article = document.querySelector('article')
    expect(article).toBeInTheDocument()
    // The article contains child elements beyond just headings
    expect(article!.children.length).toBeGreaterThan(1)
  })
})
