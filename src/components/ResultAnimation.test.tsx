/**
 * Tests for ResultAnimation (src/components/ResultAnimation.tsx)
 *
 * Covers:
 *  - ResultOutcome type contract ('success' | 'failure')
 *  - RESULT_ANIMATION_LABELS — exhaustive key/value contract
 *  - ResultAnimation rendering for each outcome
 *  - Default prop values (size=72, label from RESULT_ANIMATION_LABELS)
 *  - Custom size and custom label overrides
 *  - data-outcome attribute reflects the active outcome
 *  - SVG accessibility attributes (aria-hidden, focusable)
 *  - Screen-reader sr-only label text
 *  - Success path: single checkmark path, correct stroke color token
 *  - Failure path: two cross paths, correct stroke color token
 *  - strokeDasharray values match expected geometry
 *  - Stroke path animationDelay values
 *  - Ring element presence and attributes
 *  - prefers-reduced-motion: disabled animation class
 *  - prefers-reduced-motion: animation class present when motion allowed
 *  - data-reduced-motion attribute reflects hook value
 *  - No focusable elements inside the SVG
 *  - Invalid/boundary inputs: label override with empty string
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ResultAnimation, {
  RESULT_ANIMATION_LABELS,
  type ResultOutcome,
} from './ResultAnimation'

// ─── Mock usePrefersReducedMotion ──────────────────────────────────────────

const mockReducedMotion = vi.fn<[], boolean>(() => false)

vi.mock('../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mockReducedMotion(),
}))

// ─── Helpers ───────────────────────────────────────────────────────────────

function renderAnimation(props: {
  outcome: ResultOutcome
  size?: number
  label?: string
}) {
  return render(<ResultAnimation {...props} />)
}

// ─── RESULT_ANIMATION_LABELS contract ─────────────────────────────────────

describe('RESULT_ANIMATION_LABELS', () => {
  it('has exactly two keys: success and failure', () => {
    const keys = Object.keys(RESULT_ANIMATION_LABELS)
    expect(keys).toHaveLength(2)
    expect(keys).toContain('success')
    expect(keys).toContain('failure')
  })

  it('success label is a non-empty string', () => {
    expect(RESULT_ANIMATION_LABELS.success).toBeTruthy()
    expect(typeof RESULT_ANIMATION_LABELS.success).toBe('string')
  })

  it('failure label is a non-empty string', () => {
    expect(RESULT_ANIMATION_LABELS.failure).toBeTruthy()
    expect(typeof RESULT_ANIMATION_LABELS.failure).toBe('string')
  })

  it('success and failure labels are distinct', () => {
    expect(RESULT_ANIMATION_LABELS.success).not.toBe(RESULT_ANIMATION_LABELS.failure)
  })

  it('success label reads "Completed successfully"', () => {
    expect(RESULT_ANIMATION_LABELS.success).toBe('Completed successfully')
  })

  it('failure label reads "Completed with an error"', () => {
    expect(RESULT_ANIMATION_LABELS.failure).toBe('Completed with an error')
  })
})

// ─── ResultOutcome type contract ───────────────────────────────────────────

describe('ResultOutcome — type contract', () => {
  it('accepts "success" without throwing', () => {
    expect(() => renderAnimation({ outcome: 'success' })).not.toThrow()
  })

  it('accepts "failure" without throwing', () => {
    expect(() => renderAnimation({ outcome: 'failure' })).not.toThrow()
  })
})

// ─── Rendering — default props ─────────────────────────────────────────────

describe('ResultAnimation — default props', () => {
  it('renders the wrapper span with class va-result-animation', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    expect(container.querySelector('.va-result-animation')).toBeInTheDocument()
  })

  it('renders an SVG element', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('SVG defaults to width=72 and height=72', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('72')
    expect(svg.getAttribute('height')).toBe('72')
  })

  it('SVG has viewBox "0 0 96 96"', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 96 96')
  })

  it('uses RESULT_ANIMATION_LABELS value as the sr-only label when no label prop given', () => {
    renderAnimation({ outcome: 'success' })
    expect(screen.getByText(RESULT_ANIMATION_LABELS.success)).toBeInTheDocument()
  })

  it('sr-only label has class "sr-only"', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const srSpan = container.querySelector('.sr-only')
    expect(srSpan).toBeInTheDocument()
    expect(srSpan!.textContent).toBe(RESULT_ANIMATION_LABELS.success)
  })
})

// ─── data-outcome attribute ────────────────────────────────────────────────

describe('ResultAnimation — data-outcome', () => {
  it('sets data-outcome="success" for success outcome', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    expect(container.querySelector('[data-outcome="success"]')).toBeInTheDocument()
  })

  it('sets data-outcome="failure" for failure outcome', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    expect(container.querySelector('[data-outcome="failure"]')).toBeInTheDocument()
  })
})

// ─── Custom size and label ─────────────────────────────────────────────────

describe('ResultAnimation — custom props', () => {
  it('applies custom size to SVG width and height', () => {
    const { container } = renderAnimation({ outcome: 'success', size: 96 })
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('96')
    expect(svg.getAttribute('height')).toBe('96')
  })

  it('applies size=48 to SVG dimensions', () => {
    const { container } = renderAnimation({ outcome: 'failure', size: 48 })
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('48')
    expect(svg.getAttribute('height')).toBe('48')
  })

  it('uses custom label in the sr-only span', () => {
    renderAnimation({ outcome: 'success', label: 'Attestation verified' })
    expect(screen.getByText('Attestation verified')).toBeInTheDocument()
  })

  it('custom label overrides the default RESULT_ANIMATION_LABELS value', () => {
    renderAnimation({ outcome: 'failure', label: 'Something went wrong' })
    expect(screen.queryByText(RESULT_ANIMATION_LABELS.failure)).not.toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('empty string label renders an empty sr-only span', () => {
    const { container } = renderAnimation({ outcome: 'success', label: '' })
    const srSpan = container.querySelector('.sr-only')
    expect(srSpan).toBeInTheDocument()
    expect(srSpan!.textContent).toBe('')
  })
})

// ─── SVG accessibility ─────────────────────────────────────────────────────

describe('ResultAnimation — SVG accessibility', () => {
  it('SVG has aria-hidden="true"', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('SVG has focusable="false"', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    expect(container.querySelector('svg')).toHaveAttribute('focusable', 'false')
  })

  it('no elements inside SVG have a tabIndex or are focusable', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const svg = container.querySelector('svg')!
    const focusable = svg.querySelectorAll('[tabindex], a, button, input, select, textarea')
    expect(focusable).toHaveLength(0)
  })
})

// ─── Success path ──────────────────────────────────────────────────────────

describe('ResultAnimation — success path', () => {
  it('renders exactly one stroke path (checkmark)', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const strokes = container.querySelectorAll('.va-result-stroke')
    expect(strokes).toHaveLength(1)
  })

  it('checkmark path d attribute contains the expected anchor points', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const path = container.querySelector('.va-result-stroke')!
    expect(path.getAttribute('d')).toBe('M30 50 L43 63 L66 38')
  })

  it('checkmark strokeDasharray is 60', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const path = container.querySelector('.va-result-stroke')!
    expect(path.getAttribute('stroke-dasharray')).toBe('60')
  })

  it('checkmark uses var(--success) stroke color', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const path = container.querySelector('.va-result-stroke')!
    expect(path.getAttribute('stroke')).toBe('var(--success)')
  })

  it('ring uses var(--success) stroke color', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const ring = container.querySelector('.va-result-ring')!
    expect(ring.getAttribute('stroke')).toBe('var(--success)')
  })

  it('checkmark animation delay is 0.14s', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const path = container.querySelector<HTMLElement>('.va-result-stroke')!
    expect(path.style.animationDelay).toBe('0.14s')
  })

  it('sr-only label defaults to RESULT_ANIMATION_LABELS.success', () => {
    renderAnimation({ outcome: 'success' })
    expect(screen.getByText('Completed successfully')).toBeInTheDocument()
  })
})

// ─── Failure path ──────────────────────────────────────────────────────────

describe('ResultAnimation — failure path', () => {
  it('renders exactly two stroke paths (cross diagonals)', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    const strokes = container.querySelectorAll('.va-result-stroke')
    expect(strokes).toHaveLength(2)
  })

  it('first cross path d attribute is "M36 36 L60 60"', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    const paths = container.querySelectorAll('.va-result-stroke')
    expect(paths[0].getAttribute('d')).toBe('M36 36 L60 60')
  })

  it('second cross path d attribute is "M60 36 L36 60"', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    const paths = container.querySelectorAll('.va-result-stroke')
    expect(paths[1].getAttribute('d')).toBe('M60 36 L36 60')
  })

  it('both cross paths have strokeDasharray of 40', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    const paths = container.querySelectorAll('.va-result-stroke')
    paths.forEach((p) => {
      expect(p.getAttribute('stroke-dasharray')).toBe('40')
    })
  })

  it('both cross paths use var(--danger) stroke color', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    const paths = container.querySelectorAll('.va-result-stroke')
    paths.forEach((p) => {
      expect(p.getAttribute('stroke')).toBe('var(--danger)')
    })
  })

  it('ring uses var(--danger) stroke color', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    const ring = container.querySelector('.va-result-ring')!
    expect(ring.getAttribute('stroke')).toBe('var(--danger)')
  })

  it('first cross path animation delay is 0.14s', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    const paths = container.querySelectorAll<HTMLElement>('.va-result-stroke')
    expect(paths[0].style.animationDelay).toBe('0.14s')
  })

  it('second cross path animation delay is 0.26s', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    const paths = container.querySelectorAll<HTMLElement>('.va-result-stroke')
    expect(paths[1].style.animationDelay).toBe('0.26s')
  })

  it('sr-only label defaults to RESULT_ANIMATION_LABELS.failure', () => {
    renderAnimation({ outcome: 'failure' })
    expect(screen.getByText('Completed with an error')).toBeInTheDocument()
  })
})

// ─── Ring element ──────────────────────────────────────────────────────────

describe('ResultAnimation — ring element', () => {
  it('renders a ring circle with class va-result-ring', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    expect(container.querySelector('.va-result-ring')).toBeInTheDocument()
  })

  it('ring is centered at cx=48, cy=48', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const ring = container.querySelector('.va-result-ring')!
    expect(ring.getAttribute('cx')).toBe('48')
    expect(ring.getAttribute('cy')).toBe('48')
  })

  it('ring radius is 34', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const ring = container.querySelector('.va-result-ring')!
    expect(ring.getAttribute('r')).toBe('34')
  })

  it('ring strokeOpacity is "0.35"', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const ring = container.querySelector('.va-result-ring')!
    expect(ring.getAttribute('stroke-opacity')).toBe('0.35')
  })

  it('ring strokeWidth is "3"', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const ring = container.querySelector('.va-result-ring')!
    expect(ring.getAttribute('stroke-width')).toBe('3')
  })
})

// ─── Stroke common attributes ──────────────────────────────────────────────

describe('ResultAnimation — stroke common attributes', () => {
  it('all strokes have strokeLinecap="round"', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    const paths = container.querySelectorAll('.va-result-stroke')
    paths.forEach((p) => {
      expect(p.getAttribute('stroke-linecap')).toBe('round')
    })
  })

  it('all strokes have strokeLinejoin="round"', () => {
    const { container } = renderAnimation({ outcome: 'failure' })
    const paths = container.querySelectorAll('.va-result-stroke')
    paths.forEach((p) => {
      expect(p.getAttribute('stroke-linejoin')).toBe('round')
    })
  })

  it('all strokes have strokeWidth="6"', () => {
    const { container } = renderAnimation({ outcome: 'success' })
    const paths = container.querySelectorAll('.va-result-stroke')
    paths.forEach((p) => {
      expect(p.getAttribute('stroke-width')).toBe('6')
    })
  })
})

// ─── prefers-reduced-motion ────────────────────────────────────────────────

describe('ResultAnimation — prefers-reduced-motion', () => {
  beforeEach(() => {
    mockReducedMotion.mockReturnValue(false)
  })

  afterEach(() => {
    mockReducedMotion.mockReturnValue(false)
  })

  it('adds va-result-animate class to SVG when motion is allowed', () => {
    mockReducedMotion.mockReturnValue(false)
    const { container } = renderAnimation({ outcome: 'success' })
    expect(container.querySelector('svg')).toHaveClass('va-result-animate')
  })

  it('does NOT add va-result-animate class when reduced motion is preferred', () => {
    mockReducedMotion.mockReturnValue(true)
    const { container } = renderAnimation({ outcome: 'success' })
    expect(container.querySelector('svg')).not.toHaveClass('va-result-animate')
  })

  it('sets data-reduced-motion="false" when motion is allowed', () => {
    mockReducedMotion.mockReturnValue(false)
    const { container } = renderAnimation({ outcome: 'success' })
    expect(container.querySelector('.va-result-animation')).toHaveAttribute(
      'data-reduced-motion',
      'false',
    )
  })

  it('sets data-reduced-motion="true" when reduced motion is preferred', () => {
    mockReducedMotion.mockReturnValue(true)
    const { container } = renderAnimation({ outcome: 'failure' })
    expect(container.querySelector('.va-result-animation')).toHaveAttribute(
      'data-reduced-motion',
      'true',
    )
  })

  it('reduced motion applies to both success and failure outcomes', () => {
    mockReducedMotion.mockReturnValue(true)

    const { container: sc } = render(<ResultAnimation outcome="success" />)
    expect(sc.querySelector('svg')).not.toHaveClass('va-result-animate')

    const { container: fc } = render(<ResultAnimation outcome="failure" />)
    expect(fc.querySelector('svg')).not.toHaveClass('va-result-animate')
  })
})

// ─── State transitions ─────────────────────────────────────────────────────

describe('ResultAnimation — state transitions', () => {
  it('re-renders correctly when outcome changes from success to failure', () => {
    const { rerender, container } = render(<ResultAnimation outcome="success" />)

    expect(container.querySelector('[data-outcome="success"]')).toBeInTheDocument()
    expect(container.querySelectorAll('.va-result-stroke')).toHaveLength(1)

    rerender(<ResultAnimation outcome="failure" />)

    expect(container.querySelector('[data-outcome="failure"]')).toBeInTheDocument()
    expect(container.querySelectorAll('.va-result-stroke')).toHaveLength(2)
  })

  it('re-renders correctly when outcome changes from failure to success', () => {
    const { rerender, container } = render(<ResultAnimation outcome="failure" />)

    expect(container.querySelectorAll('.va-result-stroke')).toHaveLength(2)

    rerender(<ResultAnimation outcome="success" />)

    expect(container.querySelectorAll('.va-result-stroke')).toHaveLength(1)
    expect(container.querySelector('[data-outcome="success"]')).toBeInTheDocument()
  })

  it('updates sr-only label when outcome changes', () => {
    const { rerender } = render(<ResultAnimation outcome="success" />)
    expect(screen.getByText(RESULT_ANIMATION_LABELS.success)).toBeInTheDocument()

    rerender(<ResultAnimation outcome="failure" />)
    expect(screen.queryByText(RESULT_ANIMATION_LABELS.success)).not.toBeInTheDocument()
    expect(screen.getByText(RESULT_ANIMATION_LABELS.failure)).toBeInTheDocument()
  })

  it('updates SVG dimensions when size prop changes', () => {
    const { rerender, container } = render(<ResultAnimation outcome="success" size={72} />)
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('72')

    rerender(<ResultAnimation outcome="success" size={120} />)
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('120')
    expect(container.querySelector('svg')!.getAttribute('height')).toBe('120')
  })

  it('updates sr-only label when label prop changes', () => {
    const { rerender } = render(<ResultAnimation outcome="success" label="Done" />)
    expect(screen.getByText('Done')).toBeInTheDocument()

    rerender(<ResultAnimation outcome="success" label="All good" />)
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('transitions from motion to reduced-motion mid-session', () => {
    mockReducedMotion.mockReturnValue(false)
    const { rerender, container } = render(<ResultAnimation outcome="success" />)
    expect(container.querySelector('svg')).toHaveClass('va-result-animate')

    mockReducedMotion.mockReturnValue(true)
    rerender(<ResultAnimation outcome="success" />)
    expect(container.querySelector('svg')).not.toHaveClass('va-result-animate')
    expect(container.querySelector('.va-result-animation')).toHaveAttribute(
      'data-reduced-motion',
      'true',
    )
  })
})
