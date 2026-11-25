import { Suspense, lazy } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom'
import ErrorBoundary, { RouteErrorBoundary } from './ErrorBoundary'
import { RouteSuspenseFallback } from '../App'

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Boom from child')
  }
  return <div>Recovered content</div>
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders ServerError when a child throws and retries when Try again is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onRetry = vi.fn()
    let shouldThrow = true

    function DynamicChild() {
      return <ThrowingChild shouldThrow={shouldThrow} />
    }

    render(
      <MemoryRouter>
        <ErrorBoundary onRetry={onRetry}>
          <DynamicChild />
        </ErrorBoundary>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Something went wrong on our side' })).toBeInTheDocument()
    expect(screen.getByText('500 error')).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Recovered content')).toBeInTheDocument()
  })
})

describe('RouteErrorBoundary', () => {
  it('renders ServerError when a route throws during rendering', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    function CrashingRoute(): never {
      throw new Error('Route crashed')
    }

    const router = createMemoryRouter(
      [
        {
          path: '/',
          errorElement: <RouteErrorBoundary />,
          children: [{ path: 'crash', element: <CrashingRoute /> }],
        },
      ],
      { initialEntries: ['/crash'] },
    )

    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { name: 'Something went wrong on our side' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

describe('Lazy route resolution', () => {
  it('shows an aria-busy Suspense fallback while loading and resolves the lazy route', async () => {
    let resolveModule!: (mod: { default: () => JSX.Element }) => void
    const LazyPage = lazy(
      () =>
        new Promise<{ default: () => JSX.Element }>((resolve) => {
          resolveModule = resolve
        }),
    )

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <Suspense fallback={<RouteSuspenseFallback />}>
              <LazyPage />
            </Suspense>
          ),
          errorElement: <RouteErrorBoundary />,
        },
      ],
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    const loadingRegion = screen.getByRole('status', { name: 'Loading page' })
    expect(loadingRegion).toHaveAttribute('aria-busy', 'true')

    resolveModule({ default: () => <h1>Lazy page loaded</h1> })

    expect(await screen.findByRole('heading', { name: 'Lazy page loaded' })).toBeInTheDocument()
  })
})
