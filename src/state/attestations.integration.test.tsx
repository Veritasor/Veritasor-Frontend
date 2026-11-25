import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../components/ToastContext'
import ToastContainer from '../components/ToastContainer'
import { ApiError, type AttestationsApi } from '../services/attestationsApi'
import { MOCK_ATTESTATIONS } from './attestationMocks'
import { AttestationsProvider } from './attestations'
import Dashboard from '../pages/Dashboard'
import Attestations from '../pages/Attestations'
import AttestationDetail from '../pages/AttestationDetail'

function renderApp(initialPath: string, api?: AttestationsApi) {
  return render(
    <AttestationsProvider api={api}>
      <ToastProvider>
        <ToastContainer />
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attestations" element={<Attestations />} />
            <Route path="/attestations/:id" element={<AttestationDetail />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </AttestationsProvider>,
  )
}

describe('Dashboard attestation flow', () => {
  it('creates a run visible in the attestations list and detail page', async () => {
    renderApp('/dashboard')

    fireEvent.click(screen.getByRole('button', { name: 'Trigger monthly revenue report' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm & Attest' }))
    expect(await screen.findByText('Attestation submitted successfully.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'View attestation history' }))
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /view details/i })).toHaveLength(4)
    })

    const newDetailLink = screen.getAllByRole('link', { name: /view details/i })[0]
    const newAttestationId = newDetailLink.getAttribute('href')?.split('/').pop()
    expect(newAttestationId).toMatch(/^att-/)
    fireEvent.click(newDetailLink)

    expect(await screen.findByRole('article', { name: new RegExp(newAttestationId!) })).toBeInTheDocument()
  })
})

describe('AttestationsProvider async states with slow and failing API mocks', () => {
  it('shows skeleton while loading, renders error with retry, and loads more without duplicates', async () => {
    let resolveFirst!: (value: { items: typeof MOCK_ATTESTATIONS; nextCursor: string | null; hasMore: boolean }) => void
    const listAttestations = vi
      .fn<AttestationsApi['listAttestations']>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockRejectedValueOnce(new Error('Upstream 503'))
      .mockResolvedValueOnce({
        items: [MOCK_ATTESTATIONS[0], MOCK_ATTESTATIONS[1]],
        nextCursor: 'cursor-2',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        // Includes duplicate att-002 to verify deduplication
        items: [MOCK_ATTESTATIONS[1], MOCK_ATTESTATIONS[2]],
        nextCursor: null,
        hasMore: false,
      })

    const api: AttestationsApi = {
      listAttestations,
      getAttestation: vi.fn(),
      createAttestation: vi.fn(),
    }

    renderApp('/attestations', api)

    // Slow initial load shows skeleton
    expect(screen.getByRole('status', { name: /loading attestations list/i })).toBeInTheDocument()

    // Resolve first call with empty list -> empty state
    resolveFirst({ items: [], nextCursor: null, hasMore: false })
    expect(await screen.findByText(/no attestations yet/i)).toBeInTheDocument()

    // Trigger a failing refresh via a second mount to test error + retry
    const failingApi: AttestationsApi = {
      listAttestations: vi
        .fn<AttestationsApi['listAttestations']>()
        .mockRejectedValueOnce(new Error('Upstream 503'))
        .mockResolvedValueOnce({
          items: [MOCK_ATTESTATIONS[0], MOCK_ATTESTATIONS[1]],
          nextCursor: 'cursor-2',
          hasMore: true,
        })
        .mockResolvedValueOnce({
          items: [MOCK_ATTESTATIONS[1], MOCK_ATTESTATIONS[2]],
          nextCursor: null,
          hasMore: false,
        }),
      getAttestation: vi.fn(),
      createAttestation: vi.fn(),
    }

    renderApp('/attestations', failingApi)

    expect(await screen.findByRole('alert')).toHaveTextContent('Upstream 503')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /view details/i })).toHaveLength(2)
    })

    // Load more appends without duplicates
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /view details/i })).toHaveLength(3)
    })
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('shows Dashboard skeleton while loading and error state with retry on failure', async () => {
    let rejectFirst!: (reason: Error) => void
    const api: AttestationsApi = {
      listAttestations: vi
        .fn<AttestationsApi['listAttestations']>()
        .mockImplementationOnce(
          () =>
            new Promise((_, reject) => {
              rejectFirst = reject
            }),
        )
        .mockResolvedValueOnce({
          items: MOCK_ATTESTATIONS,
          nextCursor: null,
          hasMore: false,
        }),
      getAttestation: vi.fn(),
      createAttestation: vi.fn(),
    }

    renderApp('/dashboard', api)
    expect(screen.getByRole('status', { name: /loading dashboard metrics/i })).toBeInTheDocument()

    rejectFirst(new Error('Dashboard service unavailable'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard service unavailable')

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: /key metrics/i })).toBeInTheDocument()
  })

  it('fetches AttestationDetail by id when not in store and renders NotFound on 404', async () => {
    const api: AttestationsApi = {
      listAttestations: vi.fn().mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      }),
      getAttestation: vi
        .fn<AttestationsApi['getAttestation']>()
        .mockImplementation(async (id: string) => {
          if (id === 'att-001') return MOCK_ATTESTATIONS[0]
          throw new ApiError('Not found', 404)
        }),
      createAttestation: vi.fn(),
    }

    renderApp('/attestations/att-001', api)
    expect(await screen.findByRole('article', { name: /att-001/i })).toBeInTheDocument()
    expect(api.getAttestation).toHaveBeenCalledWith('att-001')

    renderApp('/attestations/does-not-exist', api)
    expect(await screen.findByRole('heading', { name: /we could not find that page/i })).toBeInTheDocument()
  })
})
