import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { ErrorListener } from './ErrorListener'
import { ToastProvider, useToast } from './ToastContext'
import { clearErrorThrottle } from '../utils/errorReporting'

function TestComponent() {
  const { toasts } = useToast()
  return <div data-testid="toast-count">{toasts.length}</div>
}

describe('ErrorListener', () => {
  beforeEach(() => {
    clearErrorThrottle()
  })

  it('renders without crashing', () => {
    render(
      <ToastProvider>
        <ErrorListener />
      </ToastProvider>,
    )
  })

  it('listens for unhandled-error events and adds a toast', async () => {
    const { getByTestId } = render(
      <ToastProvider>
        <ErrorListener />
        <TestComponent />
      </ToastProvider>,
    )

    // Dispatch a custom error event wrapped in act
    act(() => {
      const event = new CustomEvent('unhandled-error', {
        detail: { error: 'Test error message', eventType: 'unhandledrejection' },
      })
      window.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(getByTestId('toast-count')).toHaveTextContent('1')
    })
  })

  it('throttles duplicate errors within 5 seconds', async () => {
    const { getByTestId } = render(
      <ToastProvider>
        <ErrorListener />
        <TestComponent />
      </ToastProvider>,
    )

    const event = new CustomEvent('unhandled-error', {
      detail: { error: 'Duplicate error', eventType: 'unhandledrejection' },
    })

    act(() => {
      window.dispatchEvent(event)
    })
    await waitFor(() => {
      expect(getByTestId('toast-count')).toHaveTextContent('1')
    })

    act(() => {
      window.dispatchEvent(event)
    })
    // Should still be 1 due to throttling
    await waitFor(() => {
      expect(getByTestId('toast-count')).toHaveTextContent('1')
    })
  })

  it('shows different errors', async () => {
    const { getByTestId } = render(
      <ToastProvider>
        <ErrorListener />
        <TestComponent />
      </ToastProvider>,
    )

    const event1 = new CustomEvent('unhandled-error', {
      detail: { error: 'Error 1', eventType: 'unhandledrejection' },
    })
    const event2 = new CustomEvent('unhandled-error', {
      detail: { error: 'Error 2', eventType: 'error' },
    })

    act(() => {
      window.dispatchEvent(event1)
    })
    await waitFor(() => {
      expect(getByTestId('toast-count')).toHaveTextContent('1')
    })

    act(() => {
      window.dispatchEvent(event2)
    })
    await waitFor(() => {
      expect(getByTestId('toast-count')).toHaveTextContent('2')
    })
  })
})
