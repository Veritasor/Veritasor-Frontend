import { useRef, useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useDialogA11y, type UseDialogA11yOptions } from './useDialogA11y'

type HarnessProps = Partial<Omit<UseDialogA11yOptions, 'containerRef' | 'initialFocus'>> & {
  initialFocus?: 'container' | 'first' | 'input'
  empty?: boolean
}

function Dialog({ open = true, onClose = () => {}, initialFocus, disableEscape, returnFocus, empty }: HarnessProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useDialogA11y({
    open,
    containerRef: ref,
    onClose,
    initialFocus: initialFocus === 'input' ? inputRef : initialFocus,
    disableEscape,
    returnFocus,
  })
  if (!open) return null
  return (
    <div ref={ref} role="dialog" tabIndex={-1}>
      {!empty && (
        <>
          <button type="button">first</button>
          <input aria-label="field" ref={inputRef} />
          <button type="button" disabled>
            disabled
          </button>
          <button type="button">last</button>
        </>
      )}
    </div>
  )
}

function Harness(props: HarnessProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        trigger
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        outside-close
      </button>
      <Dialog {...props} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

describe('useDialogA11y', () => {
  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(<Dialog onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('also handles Escape dispatched on window', () => {
    const onClose = vi.fn()
    render(<Dialog onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape when disableEscape is set', () => {
    const onClose = vi.fn()
    render(<Dialog onClose={onClose} disableEscape />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not listen while closed', () => {
    const onClose = vi.fn()
    render(<Dialog open={false} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ignores unrelated keys', () => {
    const onClose = vi.fn()
    render(<Dialog onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('focuses the container by default', () => {
    render(<Dialog />)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it("focuses the first focusable element with initialFocus='first'", () => {
    render(<Dialog initialFocus="first" />)
    expect(document.activeElement).toBe(screen.getByText('first'))
  })

  it('focuses the given ref with initialFocus=ref', () => {
    render(<Dialog initialFocus="input" />)
    expect(document.activeElement).toBe(screen.getByLabelText('field'))
  })

  it('wraps Tab from last to first and Shift+Tab from first to last, skipping disabled', () => {
    render(<Dialog />)
    const first = screen.getByText('first')
    const last = screen.getByText('last')
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('does not interfere with Tab between middle elements', () => {
    render(<Dialog />)
    const first = screen.getByText('first')
    first.focus()
    const evt = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    document.dispatchEvent(evt)
    expect(evt.defaultPrevented).toBe(false)
  })

  it('pulls focus back inside when focus escaped the container', () => {
    render(
      <>
        <button type="button">outside</button>
        <Dialog />
      </>,
    )
    screen.getByText('outside').focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByText('first'))
  })

  it('keeps focus on the container when it has no focusable children', () => {
    render(<Dialog empty />)
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(dialog)
  })

  it('returns focus to the trigger when closed', () => {
    render(<Harness initialFocus="first" />)
    const trigger = screen.getByText('trigger')
    trigger.focus()
    fireEvent.click(trigger)
    expect(document.activeElement).toBe(screen.getByText('first'))
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('does not return focus when returnFocus is false', () => {
    render(<Harness returnFocus={false} />)
    const trigger = screen.getByText('trigger')
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).not.toBe(trigger)
  })

  it('removes listeners on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(<Dialog onClose={onClose} />)
    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
