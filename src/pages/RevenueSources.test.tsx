import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from '../components/ToastContext'
import RevenueSources from './RevenueSources'
import { sourcesStore } from '../store/sourcesStore'

function ToastActions() {
  const { toasts } = useToast()
  return (
    <div>
      {toasts.map((toast) => toast.onUndo && (
        <button key={toast.id} type="button" onClick={toast.onUndo}>
          Undo {toast.message}
        </button>
      ))}
    </div>
  )
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <RevenueSources />
        <ToastActions />
      </ToastProvider>
    </MemoryRouter>,
  )
}

function sourcesList() {
  return screen.getByRole('list', { name: 'Connected revenue sources' })
}

function openDisconnect(provider: string) {
  fireEvent.click(within(sourcesList()).getByRole('button', { name: `Disconnect ${provider}` }))
  return screen.getByRole('dialog', { name: `Disconnect ${provider}?` })
}

beforeEach(() => {
  localStorage.clear()
  sourcesStore.reset()
})

afterEach(() => vi.useRealTimers())

describe('RevenueSources page behavior', () => {
  it('shows connected sources and the two reconnect reminders', () => {
    renderPage()

    expect(within(sourcesList()).getAllByRole('listitem')).toHaveLength(3)
    const reminders = screen.getByRole('list', { name: 'Expired integrations' })
    expect(within(reminders).getByText('Shopify')).toBeInTheDocument()
    expect(within(reminders).getByText('QuickBooks')).toBeInTheDocument()
    expect(within(reminders).queryByText('Stripe')).not.toBeInTheDocument()
  })

  it.each(['stripe', 'Stripe ', 'Stri'])('rejects an inexact disconnect name: %s', (name) => {
    renderPage()
    const dialog = openDisconnect('Stripe')
    const confirm = within(dialog).getByRole('button', { name: 'Disconnect Stripe' })

    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: name } })

    expect(confirm).toBeDisabled()
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Name does not match')
    expect(within(sourcesList()).getByRole('listitem', { name: /Stripe, priority 1 of 3/ })).toBeInTheDocument()
  })

  it('clears the mismatch error when the confirmation input is emptied', () => {
    renderPage()
    const dialog = openDisconnect('Stripe')
    const input = within(dialog).getByRole('textbox')

    fireEvent.change(input, { target: { value: 'wrong' } })
    expect(within(dialog).getByRole('alert')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '' } })

    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Disconnect Stripe' })).toBeDisabled()
  })

  it('cancel preserves the source after invalid input', () => {
    renderPage()
    const dialog = openDisconnect('Stripe')
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'wrong' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(sourcesList()).getByRole('listitem', { name: /Stripe, priority 1 of 3/ })).toBeInTheDocument()
  })

  it('disconnects only after an exact match and restores the source on Undo', () => {
    renderPage()
    const dialog = openDisconnect('Stripe')
    const confirm = within(dialog).getByRole('button', { name: 'Disconnect Stripe' })
    expect(confirm).toBeDisabled()

    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Stripe' } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(sourcesList()).queryByRole('listitem', { name: /Stripe,/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo Disconnected Stripe' }))
    expect(within(sourcesList()).getAllByRole('listitem')).toHaveLength(3)
    expect(within(sourcesList()).getByRole('listitem', { name: /Stripe, priority 1 of 3/ })).toBeInTheDocument()
  })

  it('restores disconnected source at its original index position on Undo', () => {
    renderPage()
    // Disconnect source #1 of 3 (Shopify, which is at priority 2 of 3)
    const disconnectBtn = within(sourcesList()).getByRole('button', { name: 'Disconnect Shopify' })
    fireEvent.click(disconnectBtn)
    const dialog = screen.getByRole('dialog', { name: 'Disconnect Shopify?' })
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Shopify' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Disconnect Shopify' }))

    // Now 2 sources remain: Stripe (priority 1), QuickBooks (priority 2)
    const itemsAfterRemove = within(sourcesList()).getAllByRole('listitem')
    expect(itemsAfterRemove).toHaveLength(2)
    expect(itemsAfterRemove[0]).toHaveAccessibleName(/Stripe, priority 1 of 2/)
    expect(itemsAfterRemove[1]).toHaveAccessibleName(/QuickBooks, priority 2 of 2/)

    // Undo
    fireEvent.click(screen.getByRole('button', { name: 'Undo Disconnected Shopify' }))

    // Shopify should be back at index 1 (priority 2 of 3)
    const itemsAfterUndo = within(sourcesList()).getAllByRole('listitem')
    expect(itemsAfterUndo).toHaveLength(3)
    expect(itemsAfterUndo[0]).toHaveAccessibleName(/Stripe, priority 1 of 3/)
    expect(itemsAfterUndo[1]).toHaveAccessibleName(/Shopify, priority 2 of 3/)
    expect(itemsAfterUndo[2]).toHaveAccessibleName(/QuickBooks, priority 3 of 3/)
  })

  it('focuses confirmation input when dialog opens', () => {
    renderPage()
    const dialog = openDisconnect('Stripe')
    const input = within(dialog).getByRole('textbox')
    expect(document.activeElement).toBe(input)
  })

  it('cancels dialog on Escape key and returns focus to the trigger Disconnect button', () => {
    renderPage()
    const disconnectBtn = within(sourcesList()).getByRole('button', { name: 'Disconnect Stripe' })
    disconnectBtn.focus()
    fireEvent.click(disconnectBtn)

    const dialog = screen.getByRole('dialog', { name: 'Disconnect Stripe?' })
    expect(dialog).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(disconnectBtn)
  })

  it('cancels dialog on backdrop click and returns focus to the trigger Disconnect button', () => {
    renderPage()
    const disconnectBtn = within(sourcesList()).getByRole('button', { name: 'Disconnect Stripe' })
    disconnectBtn.focus()
    fireEvent.click(disconnectBtn)

    const dialog = screen.getByRole('dialog', { name: 'Disconnect Stripe?' })
    expect(dialog).toBeInTheDocument()

    // Click backdrop
    fireEvent.click(dialog)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(disconnectBtn)
  })

  it('returns focus to the Disconnect button when Cancel is clicked', () => {
    renderPage()
    const disconnectBtn = within(sourcesList()).getByRole('button', { name: 'Disconnect Stripe' })
    disconnectBtn.focus()
    fireEvent.click(disconnectBtn)

    const dialog = screen.getByRole('dialog', { name: 'Disconnect Stripe?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(disconnectBtn)
  })

  it('traps Tab key navigation within the dialog (wrap forward and backward)', () => {
    renderPage()
    const dialog = openDisconnect('Stripe')

    const input = within(dialog).getByRole('textbox')
    const cancelBtn = within(dialog).getByRole('button', { name: 'Cancel' })
    // Disconnect button is initially disabled, so focusable elements are input and Cancel
    expect(input).toBe(document.activeElement)

    // Tab from Cancel (the last focusable) wraps back to input (the first)
    cancelBtn.focus()
    expect(document.activeElement).toBe(cancelBtn)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(input)

    // Shift+Tab from input (the first) wraps to Cancel (the last)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cancelBtn)

    // Type to enable the Disconnect button, now last focusable is the Disconnect button
    fireEvent.change(input, { target: { value: 'Stripe' } })
    const confirmBtn = within(dialog).getByRole('button', { name: 'Disconnect Stripe' })
    expect(confirmBtn).toBeEnabled()

    confirmBtn.focus()
    expect(document.activeElement).toBe(confirmBtn)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(input)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(confirmBtn)
  })

  it('reconnects the chosen source from its reminder without changing the other', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect Shopify now' }))

    const reminders = screen.getByRole('list', { name: 'Expired integrations' })
    expect(within(reminders).queryByText('Shopify')).not.toBeInTheDocument()
    expect(within(reminders).getByText('QuickBooks')).toBeInTheDocument()
    expect(within(sourcesList()).getByRole('listitem', { name: /Shopify,/ })).toHaveTextContent('Healthy')
    expect(within(sourcesList()).getByRole('listitem', { name: /QuickBooks,/ })).toHaveTextContent('Error')
  })

  it('dismisses one reminder and shows it again after the configured interval', () => {
    vi.useFakeTimers()
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss reconnect reminder for Shopify' }))

    expect(screen.queryByRole('button', { name: 'Reconnect Shopify now' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reconnect QuickBooks now' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(29_999))
    expect(screen.queryByRole('button', { name: 'Reconnect Shopify now' })).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('button', { name: 'Reconnect Shopify now' })).toBeInTheDocument()
  })
})
