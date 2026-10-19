import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ContextualHelpSearch, { HELP_ARTICLES } from '../components/ContextualHelpSearch'

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderHelpSearch(props: { open?: boolean; onClose?: () => void } = {}) {
  const onClose = props.onClose ?? vi.fn()
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ContextualHelpSearch open={props.open ?? true} onClose={onClose} />
    </MemoryRouter>,
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ContextualHelpSearch', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('rendering', () => {
    it('renders nothing when open is false', () => {
      const { container } = renderHelpSearch({ open: false })
      expect(container.innerHTML).toBe('')
    })

    it('renders dialog with title when open', () => {
      renderHelpSearch()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Help & Support')).toBeInTheDocument()
    })

    it('renders search input with combobox role', () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-autocomplete', 'list')
      expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    it('renders close button', () => {
      renderHelpSearch()
      expect(screen.getByRole('button', { name: /close help search/i })).toBeInTheDocument()
    })

    it('renders footer keyboard hints', () => {
      renderHelpSearch()
      expect(screen.getByText('Navigate')).toBeInTheDocument()
      expect(screen.getByText('Open')).toBeInTheDocument()
      expect(screen.getByText('Close')).toBeInTheDocument()
    })
  })

  describe('empty / initial state', () => {
    it('shows contextual suggestions for the current page', () => {
      renderHelpSearch()
      // Dashboard suggestions include: getting-started, connect-sources, create-attestation
      expect(screen.getByText('Suggested for this page')).toBeInTheDocument()
    })

    it('shows "All help articles" section', () => {
      renderHelpSearch()
      expect(screen.getByText('All help articles')).toBeInTheDocument()
    })

    it('renders article titles in results', () => {
      renderHelpSearch()
      expect(screen.getByText('Getting Started with Veritasor')).toBeInTheDocument()
      expect(screen.getByText('Connecting Revenue Sources')).toBeInTheDocument()
    })

    it('renders article descriptions in results', () => {
      renderHelpSearch()
      expect(
        screen.getByText(/Learn how to set up your workspace/),
      ).toBeInTheDocument()
    })
  })

  describe('search', () => {
    it('filters articles by title', async () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')
      fireEvent.change(input, { target: { value: 'billing' } })

      // Wait for "All help articles" to disappear (indicates search completed)
      await waitFor(() => {
        expect(screen.queryByText('All help articles')).not.toBeInTheDocument()
      })
      expect(screen.getByText('Understanding Billing & Plans')).toBeInTheDocument()
      expect(screen.queryByText('Getting Started with Veritasor')).not.toBeInTheDocument()
    })

    it('filters articles by keyword', async () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')
      fireEvent.change(input, { target: { value: 'stripe' } })

      await waitFor(() => {
        expect(screen.getByText('Connecting Revenue Sources')).toBeInTheDocument()
      })
    })

    it('filters articles by category', async () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')
      fireEvent.change(input, { target: { value: 'Security' } })

      await waitFor(() => {
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument()
      })
      expect(screen.getByText('Managing API Keys')).toBeInTheDocument()
    })

    it('shows empty state when no articles match', async () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')
      fireEvent.change(input, { target: { value: 'xyznonexistent' } })

      await waitFor(() => {
        expect(screen.getByText(/No articles match/i)).toBeInTheDocument()
      })
    })

    it('shows result count header when searching', async () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')
      fireEvent.change(input, { target: { value: 'api' } })

      await waitFor(() => {
        // Result count appears as a section header in the results area
        const results = screen.getByRole('listbox')
        expect(within(results).getByText(/articles found/)).toBeInTheDocument()
      })
    })

    it('clear button resets search', async () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')
      fireEvent.change(input, { target: { value: 'billing' } })

      await waitFor(() => {
        expect(screen.getByText('Understanding Billing & Plans')).toBeInTheDocument()
      })

      const clearBtn = screen.getByRole('button', { name: /clear search/i })
      fireEvent.click(clearBtn)
      expect(screen.getByText('All help articles')).toBeInTheDocument()
    })
  })

  describe('recent searches', () => {
    it('persists selected articles to localStorage', () => {
      renderHelpSearch()
      const article = screen.getByText('Getting Started with Veritasor')
      fireEvent.click(article)

      const stored = JSON.parse(localStorage.getItem('veritasor-recent-help-searches')!)
      expect(stored).toContain('getting-started')
    })

    it('shows recent searches on next open', () => {
      // First open: click an article
      const { unmount } = renderHelpSearch()
      fireEvent.click(screen.getByText('Connecting Revenue Sources'))
      unmount()

      // Second open: should show recent searches
      renderHelpSearch()
      expect(screen.getByText('Recent searches')).toBeInTheDocument()
      const recentBadge = screen.getByText('Recent')
      expect(recentBadge).toBeInTheDocument()
    })

    it('limits recent searches to 5', () => {
      // Store 6 recent searches
      const ids = HELP_ARTICLES.slice(0, 6).map((a) => a.id)
      localStorage.setItem('veritasor-recent-help-searches', JSON.stringify(ids))

      renderHelpSearch()
      // Only 5 should be shown in recent section
      const options = screen.getAllByRole('option')
      const recentOptions = options.filter((opt) =>
        opt.querySelector('.hs-recent-badge'),
      )
      expect(recentOptions.length).toBeLessThanOrEqual(5)
    })

    it('moves clicked article to front of recents', () => {
      localStorage.setItem(
        'veritasor-recent-help-searches',
        JSON.stringify(['api-keys', 'getting-started']),
      )

      renderHelpSearch()
      fireEvent.click(screen.getByText('Getting Started with Veritasor'))

      const stored = JSON.parse(localStorage.getItem('veritasor-recent-help-searches')!)
      expect(stored[0]).toBe('getting-started')
      expect(stored).toHaveLength(2)
    })
  })

  describe('keyboard navigation', () => {
    it('ArrowDown moves to next article', () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')

      fireEvent.keyDown(input, { key: 'ArrowDown' })
      const options = screen.getAllByRole('option')
      expect(options[1]).toHaveAttribute('aria-selected', 'true')
    })

    it('ArrowUp moves to previous article', () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')

      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
    })

    it('ArrowDown wraps from last to first', () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')
      const options = screen.getAllByRole('option')

      // Press ArrowDown for each option to wrap back to first
      for (let i = 0; i < options.length; i++) {
        fireEvent.keyDown(input, { key: 'ArrowDown' })
      }
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
    })

    it('Enter selects the active article', () => {
      const onClose = vi.fn()
      renderHelpSearch({ onClose })

      const input = screen.getByRole('combobox')
      // First article should be selected by default
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onClose).toHaveBeenCalled()
    })

    it('Escape closes the dialog', () => {
      const onClose = vi.fn()
      renderHelpSearch({ onClose })

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('click interactions', () => {
    it('clicking an article selects it and closes', () => {
      const onClose = vi.fn()
      renderHelpSearch({ onClose })

      fireEvent.click(screen.getByText('Creating an Attestation'))
      expect(onClose).toHaveBeenCalled()
    })

    it('clicking overlay backdrop closes', () => {
      const onClose = vi.fn()
      renderHelpSearch({ onClose })

      const overlay = document.querySelector('.hs-overlay')!
      fireEvent.click(overlay)
      expect(onClose).toHaveBeenCalled()
    })

    it('clicking inside dialog does not close', () => {
      const onClose = vi.fn()
      renderHelpSearch({ onClose })

      const dialog = screen.getByRole('dialog')
      fireEvent.click(dialog)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('close button closes the dialog', () => {
      const onClose = vi.fn()
      renderHelpSearch({ onClose })

      fireEvent.click(screen.getByRole('button', { name: /close help search/i }))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('dialog has aria-modal="true"', () => {
      renderHelpSearch()
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('input has aria-controls pointing to results', () => {
      renderHelpSearch()
      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('aria-controls', 'hs-results')
    })

    it('results have listbox role', () => {
      renderHelpSearch()
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('articles have option role', () => {
      renderHelpSearch()
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })

    it('active option has aria-selected="true"', () => {
      renderHelpSearch()
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
    })

    it('has live region for screen reader announcements', () => {
      renderHelpSearch()
      const status = screen.getByRole('status')
      expect(status).toHaveClass('sr-only')
    })
  })

  describe('contextual suggestions by route', () => {
    it('shows attestation suggestions on /attestations', () => {
      render(
        <MemoryRouter initialEntries={['/attestations']}>
          <ContextualHelpSearch open={true} onClose={vi.fn()} />
        </MemoryRouter>,
      )
      expect(screen.getByText('Creating an Attestation')).toBeInTheDocument()
      expect(screen.getByText('Verifying Attestation Proofs')).toBeInTheDocument()
    })

    it('shows settings suggestions on /settings', () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <ContextualHelpSearch open={true} onClose={vi.fn()} />
        </MemoryRouter>,
      )
      expect(screen.getByText('Managing API Keys')).toBeInTheDocument()
      expect(screen.getByText('Managing Team Access & Permissions')).toBeInTheDocument()
    })

    it('shows default suggestions for unknown routes', () => {
      render(
        <MemoryRouter initialEntries={['/unknown-route']}>
          <ContextualHelpSearch open={true} onClose={vi.fn()} />
        </MemoryRouter>,
      )
      // Should still show the default suggestions section
      expect(screen.getByText('Suggested for this page')).toBeInTheDocument()
    })
  })

  describe('HELP_ARTICLES data', () => {
    it('all articles have required fields', () => {
      HELP_ARTICLES.forEach((article) => {
        expect(article.id).toBeTruthy()
        expect(article.title).toBeTruthy()
        expect(article.description).toBeTruthy()
        expect(article.keywords.length).toBeGreaterThan(0)
        expect(article.href).toBeTruthy()
        expect(article.categories.length).toBeGreaterThan(0)
      })
    })

    it('article IDs are unique', () => {
      const ids = HELP_ARTICLES.map((a) => a.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
})
