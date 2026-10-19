import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StaleDataChip from '../components/StaleDataChip'

describe('StaleDataChip', () => {
  it('renders nothing when fetchedAt is not provided', () => {
    const { container } = render(<StaleDataChip />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when fetchedAt is undefined', () => {
    const { container } = render(<StaleDataChip fetchedAt={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the Stale label when fetchedAt is provided', () => {
    render(<StaleDataChip fetchedAt="2026-07-27T10:00:00Z" />)
    expect(screen.getByText('Stale')).toBeInTheDocument()
  })

  it('has role=status for screen readers', () => {
    render(<StaleDataChip fetchedAt="2026-07-27T10:00:00Z" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('includes fetchedAt in the aria-label', () => {
    render(<StaleDataChip fetchedAt="2026-07-27T10:00:00Z" />)
    expect(screen.getByRole('status')).toHaveAccessibleName(/2026-07-27/i)
  })

  it('applies additional className', () => {
    render(<StaleDataChip fetchedAt="2026-07-27T10:00:00Z" className="extra" />)
    const chip = screen.getByText('Stale')
    expect(chip).toHaveClass('stale-data-chip')
    expect(chip).toHaveClass('extra')
  })

  it('trims extra whitespace in className', () => {
    render(<StaleDataChip fetchedAt="2026-07-27T10:00:00Z" className="  " />)
    const chip = screen.getByText('Stale')
    expect(chip.className).toBe('stale-data-chip')
  })
})
