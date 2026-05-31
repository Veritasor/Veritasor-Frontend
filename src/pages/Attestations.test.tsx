import { render, fireEvent, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import Attestations from './Attestations'

function renderWithRouter(component: ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>)
}

describe('Attestations page', () => {
  it('renders the attestation progress section and start button', () => {
    const { container } = renderWithRouter(<Attestations />)

    expect(within(container).getByRole('heading', { name: /attestations/i })).toBeInTheDocument()
    expect(within(container).getByRole('button', { name: /start attestation/i })).toBeInTheDocument()
    expect(within(container).getByRole('status')).toHaveTextContent(/ready to generate a new revenue attestation/i)
  })

  it('advances through progress steps and completes the attestation', async () => {
    const { container } = renderWithRouter(<Attestations stepDurationMs={10} />)

    const startButton = within(container).getByRole('button', { name: /start attestation/i })
    fireEvent.click(startButton)

    expect(within(container).getByRole('button', { name: /cancel attestation/i })).toBeInTheDocument()
    expect(within(container).getByRole('status')).toHaveTextContent(/collecting monthly revenue/i)

    await waitFor(() => expect(within(container).getByRole('status')).toHaveTextContent(/successfully published on stellar/i))
    expect(within(container).getByRole('button', { name: /start another attestation/i })).toBeInTheDocument()
  })

  it('cancels the attestation mid-process and shows a reset option', () => {
    const { container } = renderWithRouter(<Attestations />)

    const startButton = within(container).getByRole('button', { name: /start attestation/i })
    fireEvent.click(startButton)
    fireEvent.click(within(container).getByRole('button', { name: /cancel attestation/i }))

    expect(within(container).getByRole('status')).toHaveTextContent(/attestation processing was canceled/i)
    expect(within(container).getByRole('button', { name: /start attestation/i })).toBeInTheDocument()
  })
})
