import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Attestations from './Attestations'

function renderWithRouter(component: ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>)
}

describe('Attestations page', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders the attestation progress section and start button', () => {
    renderWithRouter(<Attestations />)

    expect(screen.getByRole('heading', { name: /attestations/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start attestation/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/ready to generate a new revenue attestation/i)
  })

  it('advances through progress steps and completes the attestation', () => {
    renderWithRouter(<Attestations />)

    fireEvent.click(screen.getByRole('button', { name: /start attestation/i }))

    expect(screen.getByRole('button', { name: /cancel attestation/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/collecting monthly revenue/i)

    vi.advanceTimersByTime(1200)
    expect(screen.getByText(/verifying input sources/i)).toBeInTheDocument()

    vi.advanceTimersByTime(1200)
    expect(screen.getByText(/building merkle root/i)).toBeInTheDocument()

    vi.advanceTimersByTime(1200)
    expect(screen.getByText(/publishing attestation to stellar/i)).toBeInTheDocument()

    vi.advanceTimersByTime(1200)
    expect(screen.getByRole('status')).toHaveTextContent(/successfully published on stellar/i)
    expect(screen.getByRole('button', { name: /start another attestation/i })).toBeInTheDocument()
  })

  it('cancels the attestation mid-process and shows a reset option', () => {
    renderWithRouter(<Attestations />)

    fireEvent.click(screen.getByRole('button', { name: /start attestation/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel attestation/i }))

    expect(screen.getByRole('status')).toHaveTextContent(/attestation processing was canceled/i)
    expect(screen.getByRole('button', { name: /start attestation/i })).toBeInTheDocument()
  })
})
