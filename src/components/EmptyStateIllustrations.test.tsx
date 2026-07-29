import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  EmptyStateIllustration,
  ILLUSTRATION_META,
  type IllustrationType,
} from './EmptyStateIllustrations'

const TYPES: IllustrationType[] = ['attestations', 'revenue-sources', 'data-export']

describe('EmptyStateIllustrations', () => {
  it.each(TYPES)('renders %s illustration without crashing', (type) => {
    const { container } = render(<EmptyStateIllustration type={type} />)
    // Should render an SVG
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it.each(TYPES)('renders a descriptive sr-only span for %s', (type) => {
    const { container } = render(<EmptyStateIllustration type={type} />)
    const srSpan = container.querySelector('.sr-only')
    expect(srSpan).toBeInTheDocument()
    expect(srSpan).toHaveTextContent(ILLUSTRATION_META[type].description)
  })

  it('has unique descriptions for each illustration type', () => {
    const descriptions = TYPES.map((t) => ILLUSTRATION_META[t].description)
    const unique = new Set(descriptions)
    expect(unique.size).toBe(descriptions.length)
  })

  it('has meta labels for all types', () => {
    for (const type of TYPES) {
      expect(ILLUSTRATION_META[type].label).toBeTruthy()
      expect(ILLUSTRATION_META[type].description).toBeTruthy()
    }
  })

  it('wraps illustration in a presentation role div', () => {
    const { container } = render(<EmptyStateIllustration type="attestations" />)
    const wrapper = container.querySelector('[role="presentation"]')
    expect(wrapper).toBeInTheDocument()
  })
})
