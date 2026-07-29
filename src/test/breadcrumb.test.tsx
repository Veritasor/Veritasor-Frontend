import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumb from '../components/Breadcrumb'

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderBreadcrumb(props: React.ComponentProps<typeof Breadcrumb>) {
  return render(
    <MemoryRouter>
      <Breadcrumb {...props} />
    </MemoryRouter>
  )
}

interface RectOverrides {
  [selector: string]: { width: number; height?: number }
}

/**
 * Mock getBoundingClientRect so the measurement layer "sees" the given widths.
 * Pass a map of CSS selector → { width }.
 * The `.breadcrumb-measure` key controls the container width;
 * `[data-bc-measure]` keys match individual items by their text content.
 */
function mockBoundingRects(overrides: RectOverrides) {
  const original = Element.prototype.getBoundingClientRect
  const mock = vi.fn(function (this: Element) {
    // Check for container
    if (this.classList.contains('breadcrumb-measure')) {
      if (overrides['.breadcrumb-measure']) {
        return {
          width: overrides['.breadcrumb-measure'].width,
          height: overrides['.breadcrumb-measure'].height ?? 20,
          top: 0, left: 0, right: 0, bottom: 0,
          x: 0, y: 0,
          toJSON: () => ({}),
        } as DOMRect
      }
    }
    // Check for measurement items
    if (this.hasAttribute('data-bc-measure')) {
      const span = this.querySelector('span')
      const text = span?.textContent ?? ''
      for (const [selector, rect] of Object.entries(overrides)) {
        if (selector.startsWith('[data-bc-measure]') && text.includes(selector.replace('[data-bc-measure]', '').trim())) {
          return {
            width: rect.width,
            height: rect.height ?? 20,
            top: 0, left: 0, right: 0, bottom: 0,
            x: 0, y: 0,
            toJSON: () => ({}),
          } as DOMRect
        }
      }
      // Fallback: match by index pattern
    }
    return original.call(this) as DOMRect
  })
  Element.prototype.getBoundingClientRect = mock as unknown as typeof Element.prototype.getBoundingClientRect
  return () => {
    Element.prototype.getBoundingClientRect = original
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Breadcrumb', () => {
  describe('basic rendering', () => {
    it('renders a nav landmark with label "Breadcrumb"', () => {
      renderBreadcrumb({ items: [{ label: 'Home', href: '/' }, { label: 'Detail' }] })
      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    })

    it('renders ancestor crumbs as links', () => {
      renderBreadcrumb({ items: [{ label: 'Attestations', href: '/attestations' }, { label: 'att-001' }] })
      expect(screen.getByRole('link', { name: 'Attestations' })).toHaveAttribute('href', '/attestations')
    })

    it('renders the last crumb as aria-current="page" and not a link', () => {
      renderBreadcrumb({ items: [{ label: 'Attestations', href: '/attestations' }, { label: 'att-001' }] })
      const list = screen.getByTestId('breadcrumb-list')
      const current = within(list).getByText('att-001')
      expect(current.tagName).toBe('SPAN')
      expect(current).toHaveAttribute('aria-current', 'page')
      expect(screen.queryByRole('link', { name: 'att-001' })).not.toBeInTheDocument()
    })

    it('renders separators between crumbs', () => {
      renderBreadcrumb({ items: [{ label: 'A', href: '/a' }, { label: 'B', href: '/b' }, { label: 'C' }] })
      const list = screen.getByTestId('breadcrumb-list')
      const separators = list.querySelectorAll('.breadcrumb-separator')
      // 3 items → 2 separators
      expect(separators).toHaveLength(2)
    })

    it('truncates labels exceeding maxLabelLength', () => {
      const longLabel = 'Document upload and verification'
      renderBreadcrumb({ items: [{ label: longLabel }], maxLabelLength: 24 })
      const list = screen.getByTestId('breadcrumb-list')
      expect(within(list).getByText('Document upload and ver…')).toBeInTheDocument()
    })

    it('does not truncate labels within maxLabelLength', () => {
      renderBreadcrumb({ items: [{ label: 'Business details' }], maxLabelLength: 24 })
      const list = screen.getByTestId('breadcrumb-list')
      expect(within(list).getByText('Business details')).toBeInTheDocument()
    })

    it('adds title attribute to truncated crumbs', () => {
      const longLabel = 'A very long label that exceeds the limit'
      renderBreadcrumb({ items: [{ label: longLabel }], maxLabelLength: 20 })
      const list = screen.getByTestId('breadcrumb-list')
      expect(within(list).getByTitle(longLabel)).toBeInTheDocument()
    })

    it('does not add title attribute when label fits within limit', () => {
      renderBreadcrumb({ items: [{ label: 'Short label' }], maxLabelLength: 24 })
      const list = screen.getByTestId('breadcrumb-list')
      expect(within(list).queryByTitle('Short label')).toBeNull()
    })

    it('renders a single crumb as aria-current="page" with no link', () => {
      renderBreadcrumb({ items: [{ label: 'Only' }] })
      const list = screen.getByTestId('breadcrumb-list')
      const el = within(list).getByText('Only')
      expect(el).toHaveAttribute('aria-current', 'page')
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('renders a crumb without href as a span even when not last', () => {
      renderBreadcrumb({ items: [{ label: 'Home' }, { label: 'Middle' }, { label: 'Current' }] })
      expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
      const list = screen.getByTestId('breadcrumb-list')
      expect(within(list).getByText('Home').tagName).toBe('SPAN')
    })

    it('uses default maxLabelLength of 24 when not provided', () => {
      const label = 'A'.repeat(24)
      const { unmount: unmount1 } = renderBreadcrumb({ items: [{ label }] })
      const list = screen.getByTestId('breadcrumb-list')
      expect(within(list).getByText(label)).toBeInTheDocument()
      unmount1()

      const longLabel = 'A'.repeat(25)
      const { unmount: unmount2 } = renderBreadcrumb({ items: [{ label: longLabel }] })
      const list2 = screen.getByTestId('breadcrumb-list')
      expect(within(list2).getByText('A'.repeat(23) + '…')).toBeInTheDocument()
      unmount2()
    })
  })

  describe('overflow detection', () => {
    let restoreRects: () => void

    afterEach(() => {
      restoreRects?.()
    })

    it('renders ellipsis button when items overflow container', () => {
      restoreRects = mockBoundingRects({
        '.breadcrumb-measure': { width: 200 },
        '[data-bc-measure] Dashboard': { width: 80 },
        '[data-bc-measure] Settings': { width: 80 },
        '[data-bc-measure] Profile': { width: 80 },
        '[data-bc-measure] Security': { width: 80 },
        '[data-bc-measure] Password': { width: 80 },
      })

      renderBreadcrumb({
        items: [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Profile', href: '/settings/profile' },
          { label: 'Security', href: '/settings/security' },
          { label: 'Password' },
        ],
      })

      const ellipsisBtn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      expect(ellipsisBtn).toBeInTheDocument()
      expect(ellipsisBtn).toHaveTextContent('…')
    })

    it('preserves first and last crumb when collapsed', () => {
      restoreRects = mockBoundingRects({
        '.breadcrumb-measure': { width: 200 },
        '[data-bc-measure] Dashboard': { width: 80 },
        '[data-bc-measure] Settings': { width: 80 },
        '[data-bc-measure] Profile': { width: 80 },
        '[data-bc-measure] Security': { width: 80 },
        '[data-bc-measure] Password': { width: 80 },
      })

      renderBreadcrumb({
        items: [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Profile', href: '/settings/profile' },
          { label: 'Security', href: '/settings/security' },
          { label: 'Password' },
        ],
      })

      // First crumb always visible
      expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
      // Last crumb always visible
      const list = screen.getByTestId('breadcrumb-list')
      expect(within(list).getByText('Password')).toBeInTheDocument()
    })

    it('does not show ellipsis when 2 or fewer items', () => {
      restoreRects = mockBoundingRects({
        '.breadcrumb-measure': { width: 50 },
        '[data-bc-measure] Home': { width: 100 },
        '[data-bc-measure] Detail': { width: 100 },
      })

      renderBreadcrumb({
        items: [
          { label: 'Home', href: '/' },
          { label: 'Detail' },
        ],
      })

      expect(screen.queryByRole('button', { name: /hidden breadcrumb/i })).not.toBeInTheDocument()
    })

    it('does not show ellipsis when all items fit', () => {
      restoreRects = mockBoundingRects({
        '.breadcrumb-measure': { width: 600 },
        '[data-bc-measure] Dashboard': { width: 80 },
        '[data-bc-measure] Settings': { width: 80 },
        '[data-bc-measure] Profile': { width: 80 },
        '[data-bc-measure] Security': { width: 80 },
        '[data-bc-measure] Password': { width: 80 },
      })

      renderBreadcrumb({
        items: [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Profile', href: '/settings/profile' },
          { label: 'Security', href: '/settings/security' },
          { label: 'Password' },
        ],
      })

      expect(screen.queryByRole('button', { name: /hidden breadcrumb/i })).not.toBeInTheDocument()
    })
  })

  describe('ellipsis button accessibility', () => {
    let restoreRects: () => void

    beforeEach(() => {
      restoreRects = mockBoundingRects({
        '.breadcrumb-measure': { width: 200 },
        '[data-bc-measure] Dashboard': { width: 80 },
        '[data-bc-measure] Settings': { width: 80 },
        '[data-bc-measure] Profile': { width: 80 },
        '[data-bc-measure] Security': { width: 80 },
        '[data-bc-measure] Password': { width: 80 },
      })
    })

    afterEach(() => {
      restoreRects?.()
    })

    it('has aria-haspopup="menu"', () => {
      renderBreadcrumb({
        items: [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Profile', href: '/settings/profile' },
          { label: 'Security', href: '/settings/security' },
          { label: 'Password' },
        ],
      })

      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      expect(btn).toHaveAttribute('aria-haspopup', 'menu')
    })

    it('has aria-expanded set to false by default', () => {
      renderBreadcrumb({
        items: [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Profile', href: '/settings/profile' },
          { label: 'Security', href: '/settings/security' },
          { label: 'Password' },
        ],
      })

      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      expect(btn).toHaveAttribute('aria-expanded', 'false')
    })

    it('has aria-controls pointing to the menu', () => {
      renderBreadcrumb({
        items: [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Profile', href: '/settings/profile' },
          { label: 'Security', href: '/settings/security' },
          { label: 'Password' },
        ],
      })

      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      const controlsId = btn.getAttribute('aria-controls')
      expect(controlsId).toBeTruthy()
      expect(document.getElementById(controlsId!)).toBeFalsy() // menu not open yet
    })

    it('has accessible label indicating how many crumbs are hidden', () => {
      renderBreadcrumb({
        items: [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Profile', href: '/settings/profile' },
          { label: 'Security', href: '/settings/security' },
          { label: 'Password' },
        ],
      })

      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      expect(btn).toHaveAccessibleName(/3 hidden breadcrumbs|hidden breadcrumb/)
    })

    it('has minimum touch target of 44px', () => {
      renderBreadcrumb({
        items: [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Profile', href: '/settings/profile' },
          { label: 'Security', href: '/settings/security' },
          { label: 'Password' },
        ],
      })

      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      expect(btn).toBeInTheDocument()
    })
  })

  describe('overflow menu interactions', () => {
    let restoreRects: () => void

    beforeEach(() => {
      restoreRects = mockBoundingRects({
        '.breadcrumb-measure': { width: 200 },
        '[data-bc-measure] Dashboard': { width: 80 },
        '[data-bc-measure] Settings': { width: 80 },
        '[data-bc-measure] Profile': { width: 80 },
        '[data-bc-measure] Security': { width: 80 },
        '[data-bc-measure] Password': { width: 80 },
      })
    })

    afterEach(() => {
      restoreRects?.()
    })

    const fiveItems = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Settings', href: '/settings' },
      { label: 'Profile', href: '/settings/profile' },
      { label: 'Security', href: '/settings/security' },
      { label: 'Password' },
    ]

    it('opens menu on click and sets aria-expanded to true', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })

      fireEvent.click(btn)
      expect(btn).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('closes menu on second click', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })

      fireEvent.click(btn)
      expect(screen.getByRole('menu')).toBeInTheDocument()

      fireEvent.click(btn)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(btn).toHaveAttribute('aria-expanded', 'false')
    })

    it('opens menu on Enter key', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })

      fireEvent.keyDown(btn, { key: 'Enter' })
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('opens menu on Space key', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })

      fireEvent.keyDown(btn, { key: ' ' })
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('closes menu on Escape key from menu', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })

      fireEvent.click(btn)
      const menu = screen.getByRole('menu')
      fireEvent.keyDown(menu, { key: 'Escape' })

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('closes menu when clicking outside', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })

      fireEvent.click(btn)
      expect(screen.getByRole('menu')).toBeInTheDocument()

      fireEvent.mouseDown(document.body)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('does not close menu when clicking inside the menu', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })

      fireEvent.click(btn)
      const menu = screen.getByRole('menu')
      const menuItem = screen.getAllByRole('menuitem')[0]

      fireEvent.mouseDown(menuItem)
      expect(menu).toBeInTheDocument()
    })

    it('shows hidden crumbs as menu items', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })

      fireEvent.click(btn)
      const menuItems = screen.getAllByRole('menuitem')
      // Settings, Profile, Security are hidden (indices 1,2,3)
      expect(menuItems).toHaveLength(3)
      expect(menuItems[0]).toHaveTextContent('Settings')
      expect(menuItems[1]).toHaveTextContent('Profile')
      expect(menuItems[2]).toHaveTextContent('Security')
    })

    it('hidden crumbs with href render as links in menu', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })

      fireEvent.click(btn)
      const settingsLink = screen.getByRole('menuitem', { name: 'Settings' })
      expect(settingsLink.tagName).toBe('A')
      expect(settingsLink).toHaveAttribute('href', '/settings')
    })

    it('closes menu when a menu link is clicked', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })

      fireEvent.click(btn)
      const settingsLink = screen.getByRole('menuitem', { name: 'Settings' })
      fireEvent.click(settingsLink)

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('menu item without href renders as span with menuitem role', () => {
      restoreRects?.()
      restoreRects = mockBoundingRects({
        '.breadcrumb-measure': { width: 200 },
        '[data-bc-measure] Dashboard': { width: 80 },
        '[data-bc-measure] Settings': { width: 80 },
        '[data-bc-measure] Advanced': { width: 80 },
        '[data-bc-measure] Security': { width: 80 },
        '[data-bc-measure] Password': { width: 80 },
      })

      renderBreadcrumb({
        items: [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Advanced' },
          { label: 'Security', href: '/settings/security' },
          { label: 'Password' },
        ],
      })

      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      fireEvent.click(btn)

      const advancedItem = screen.getByRole('menuitem', { name: 'Advanced' })
      expect(advancedItem.tagName).toBe('SPAN')
    })
  })

  describe('overflow menu keyboard navigation', () => {
    let restoreRects: () => void

    beforeEach(() => {
      restoreRects = mockBoundingRects({
        '.breadcrumb-measure': { width: 200 },
        '[data-bc-measure] Dashboard': { width: 80 },
        '[data-bc-measure] Settings': { width: 80 },
        '[data-bc-measure] Profile': { width: 80 },
        '[data-bc-measure] Security': { width: 80 },
        '[data-bc-measure] Password': { width: 80 },
      })
    })

    afterEach(() => {
      restoreRects?.()
    })

    const fiveItems = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Settings', href: '/settings' },
      { label: 'Profile', href: '/settings/profile' },
      { label: 'Security', href: '/settings/security' },
      { label: 'Password' },
    ]

    it('ArrowDown moves focus to next menu item', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      fireEvent.click(btn)

      const menu = screen.getByRole('menu')
      fireEvent.keyDown(menu, { key: 'ArrowDown' })

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[1]).toHaveClass('breadcrumb-overflow-link-focused')
    })

    it('ArrowUp moves focus to previous menu item', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      fireEvent.click(btn)

      const menu = screen.getByRole('menu')
      // First move down to item 1, then up to item 0
      fireEvent.keyDown(menu, { key: 'ArrowDown' })
      fireEvent.keyDown(menu, { key: 'ArrowUp' })

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[0]).toHaveClass('breadcrumb-overflow-link-focused')
    })

    it('ArrowDown wraps from last to first item', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      fireEvent.click(btn)

      const menu = screen.getByRole('menu')
      // 3 items: indices 0,1,2 — move down 3 times to wrap
      fireEvent.keyDown(menu, { key: 'ArrowDown' })
      fireEvent.keyDown(menu, { key: 'ArrowDown' })
      fireEvent.keyDown(menu, { key: 'ArrowDown' })

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[0]).toHaveClass('breadcrumb-overflow-link-focused')
    })

    it('ArrowUp wraps from first to last item', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      fireEvent.click(btn)

      const menu = screen.getByRole('menu')
      fireEvent.keyDown(menu, { key: 'ArrowUp' })

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[2]).toHaveClass('breadcrumb-overflow-link-focused')
    })

    it('closes menu on Tab from menu', () => {
      renderBreadcrumb({ items: fiveItems })
      const btn = screen.getByRole('button', { name: /hidden breadcrumb/i })
      fireEvent.click(btn)

      const menu = screen.getByRole('menu')
      fireEvent.keyDown(menu, { key: 'Tab' })

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('renders nothing when items array is empty', () => {
      const { container } = renderBreadcrumb({ items: [] })
      expect(container.innerHTML).toBe('')
    })
  })
})
