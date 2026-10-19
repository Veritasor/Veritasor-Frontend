import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ResultAnimation, {
  RESULT_ANIMATION_LABELS,
  type ResultOutcome,
} from './ResultAnimation'

const OUTCOMES: ResultOutcome[] = ['success', 'failure']

/**
 * Overrides `window.matchMedia` so tests can simulate
 * `prefers-reduced-motion: reduce` (and restore after each test).
 */
function mockPrefersReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: reduced,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ResultAnimation', () => {
  it.each(OUTCOMES)('renders an SVG for the %s outcome', (outcome) => {
    const { container } = render(<ResultAnimation outcome={outcome} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '72')
    expect(svg).toHaveAttribute('viewBox', '0 0 96 96')
    // The checkmark (success) has 1 stroke path, the cross (failure) has 2.
    const strokes = svg!.querySelectorAll('.va-result-stroke')
    expect(strokes.length).toBe(outcome === 'success' ? 1 : 2)
    expect(svg!.querySelector('.va-result-ring')).toBeInTheDocument()
  })

  it.each(OUTCOMES)('marks the SVG as decorative for %s', (outcome) => {
    const { container } = render(<ResultAnimation outcome={outcome} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    // Nothing inside the animation may be focusable (no focus trap).
    expect(svg!.querySelector('[tabindex]')).toBeNull()
  })

  it('exposes a default sr-only label for each outcome', () => {
    render(<ResultAnimation outcome="success" />)
    expect(screen.getByText(RESULT_ANIMATION_LABELS.success)).toHaveClass(
      'sr-only',
    )
  })

  it('accepts a custom sr-only label', () => {
    render(<ResultAnimation outcome="failure" label="Custom failure note" />)
    expect(screen.getByText('Custom failure note')).toHaveClass('sr-only')
  })

  it('plays the animation when motion is allowed', () => {
    mockPrefersReducedMotion(false)
    const { container } = render(<ResultAnimation outcome="success" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('va-result-animate')
    expect(svg!.parentElement).toHaveAttribute('data-reduced-motion', 'false')
  })

  it('shows the static fallback frame under prefers-reduced-motion', () => {
    mockPrefersReducedMotion(true)
    const { container } = render(<ResultAnimation outcome="success" />)
    const svg = container.querySelector('svg')
    // Static frame: fully drawn stroke, no animation class.
    expect(svg).not.toHaveClass('va-result-animate')
    expect(svg!.querySelector('.va-result-stroke')).toBeInTheDocument()
    expect(svg!.parentElement).toHaveAttribute('data-reduced-motion', 'true')
  })

  it('applies a custom size', () => {
    const { container } = render(
      <ResultAnimation outcome="failure" size={96} />,
    )
    expect(container.querySelector('svg')).toHaveAttribute('width', '96')
    expect(container.querySelector('svg')).toHaveAttribute('height', '96')
  })

  it('swaps the stroke shape when the outcome changes', () => {
    const { rerender, container } = render(
      <ResultAnimation outcome="success" />,
    )
    expect(
      container.querySelectorAll('.va-result-stroke').length,
    ).toBe(1)
    rerender(<ResultAnimation outcome="failure" />)
    expect(
      container.querySelectorAll('.va-result-stroke').length,
    ).toBe(2)
  })
})
