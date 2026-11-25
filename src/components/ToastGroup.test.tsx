import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ToastGroup, { TOAST_GROUP_SUMMARY_LABEL } from './ToastGroup'
import type { Toast } from './ToastContext'
import {
  MAX_VISIBLE_DESKTOP,
  MAX_VISIBLE_MOBILE,
  describeOverflow,
  splitStack,
} from './toastRules'

function makeToasts(count: number, type: Toast['type'] = 'info'): Toast[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `toast-${idx + 1}`,
    type,
    message: `Notification ${idx + 1}`,
    duration: 0,
  }))
}

describe('ToastGroup', () => {
  describe('overflow collapsing and summary labels', () => {
    it('renders plural overflow label when more than MAX_VISIBLE_DESKTOP toasts are stacked', () => {
      const allToasts = makeToasts(MAX_VISIBLE_DESKTOP + 2)
      const { overflow } = splitStack(allToasts, MAX_VISIBLE_DESKTOP)
      expect(overflow).toHaveLength(2)

      const onRemove = vi.fn()
      const onRemoveAll = vi.fn()
      render(<ToastGroup items={overflow} onRemove={onRemove} onRemoveAll={onRemoveAll} />)

      const expectedSummary = describeOverflow(
        overflow.length,
        'previous notification',
        'previous notifications',
      )
      expect(expectedSummary).toBe('2 previous notifications')

      const trigger = screen.getByRole('button', {
        name: new RegExp(`show ${expectedSummary}`, 'i'),
      })
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveTextContent(TOAST_GROUP_SUMMARY_LABEL)
      expect(trigger).toHaveTextContent('2')

      const clearBtn = screen.getByRole('button', {
        name: new RegExp(`dismiss all ${expectedSummary}`, 'i'),
      })
      expect(clearBtn).toBeInTheDocument()

      // Collapsed by default: individual overflow items are not rendered
      expect(screen.queryByText('Notification 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Notification 2')).not.toBeInTheDocument()
    })

    it('renders singular overflow label when exactly 1 toast overflows MAX_VISIBLE_MOBILE', () => {
      const allToasts = makeToasts(MAX_VISIBLE_MOBILE + 1)
      const { overflow } = splitStack(allToasts, MAX_VISIBLE_MOBILE)
      expect(overflow).toHaveLength(1)

      render(<ToastGroup items={overflow} onRemove={vi.fn()} onRemoveAll={vi.fn()} />)

      const trigger = screen.getByRole('button', {
        name: /show 1 previous notification$/i,
      })
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveTextContent('1')
      expect(
        screen.getByRole('button', { name: /dismiss all 1 previous notification$/i }),
      ).toBeInTheDocument()
    })
  })

  describe('roles and accessibility attributes', () => {
    it('uses structural role="group" without aria-live and wires aria-controls when expanded', () => {
      const items = makeToasts(2)
      render(<ToastGroup items={items} onRemove={vi.fn()} onRemoveAll={vi.fn()} />)

      const group = screen.getByRole('group', { name: TOAST_GROUP_SUMMARY_LABEL })
      expect(group).toHaveClass('toast-group')
      expect(group).not.toHaveClass('toast-group-expanded')
      expect(group).not.toHaveAttribute('aria-live')

      const trigger = screen.getByRole('button', { name: /show 2 previous notifications/i })
      const controlsId = trigger.getAttribute('aria-controls')
      expect(controlsId).toBeTruthy()
      expect(trigger.querySelector('.toast-group-chevron')).toHaveAttribute('aria-hidden', 'true')
      expect(trigger.querySelector('.toast-group-label')).toHaveAttribute('aria-hidden', 'true')
      expect(trigger.querySelector('.toast-group-count')).toHaveAttribute('aria-hidden', 'true')

      const clearBtn = screen.getByRole('button', { name: /dismiss all 2 previous notifications/i })
      expect(clearBtn).toHaveAttribute('aria-keyshortcuts', 'Escape')

      // Expand and verify aria-controls links to the expanded list
      fireEvent.click(trigger)
      expect(group).toHaveClass('toast-group-expanded')
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(
        screen.getByRole('button', { name: /hide 2 previous notifications/i }),
      ).toBe(trigger)

      const list = document.getElementById(controlsId!)
      expect(list).toBeInTheDocument()
      expect(list).toHaveClass('toast-group-list')
      expect(list).toHaveAttribute('aria-label', `${TOAST_GROUP_SUMMARY_LABEL} (expanded)`)
    })

    it('renders expanded ToastItems with their live-region roles', () => {
      const items: Toast[] = [
        { id: 't-info', type: 'info', message: 'Info toast', duration: 0 },
        { id: 't-error', type: 'error', message: 'Error toast', duration: 0 },
      ]
      render(<ToastGroup items={items} onRemove={vi.fn()} onRemoveAll={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /show 2 previous notifications/i }))

      expect(screen.getByRole('status')).toHaveTextContent('Info toast')
      expect(screen.getByRole('alert')).toHaveTextContent('Error toast')
    })
  })

  describe('expand/collapse interactions', () => {
    it('toggles expansion on click', () => {
      const items = makeToasts(2)
      render(<ToastGroup items={items} onRemove={vi.fn()} onRemoveAll={vi.fn()} />)

      const trigger = screen.getByRole('button', { name: /show 2 previous notifications/i })
      fireEvent.click(trigger)
      expect(screen.getByText('Notification 1')).toBeInTheDocument()
      expect(screen.getByText('Notification 2')).toBeInTheDocument()

      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('Notification 1')).not.toBeInTheDocument()
    })

    it('toggles expansion with Enter and Space keys and ignores other keys', () => {
      const items = makeToasts(2)
      render(<ToastGroup items={items} onRemove={vi.fn()} onRemoveAll={vi.fn()} />)

      const trigger = screen.getByRole('button', { name: /show 2 previous notifications/i })

      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      fireEvent.keyDown(trigger, { key: 'Enter' })
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('Notification 1')).toBeInTheDocument()

      fireEvent.keyDown(trigger, { key: ' ' })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('Notification 1')).not.toBeInTheDocument()
    })
  })

  describe('dismissal callbacks', () => {
    it('invokes onRemoveAll with all item ids when the clear-all button is clicked', () => {
      const items = makeToasts(3)
      const onRemoveAll = vi.fn()
      render(<ToastGroup items={items} onRemove={vi.fn()} onRemoveAll={onRemoveAll} />)

      const clearBtn = screen.getByRole('button', { name: /dismiss all 3 previous notifications/i })
      fireEvent.click(clearBtn)

      expect(onRemoveAll).toHaveBeenCalledTimes(1)
      expect(onRemoveAll).toHaveBeenCalledWith(['toast-1', 'toast-2', 'toast-3'])
    })

    it('invokes onRemoveAll when Escape is pressed on the clear-all button and ignores other keys', () => {
      const items = makeToasts(2)
      const onRemoveAll = vi.fn()
      render(<ToastGroup items={items} onRemove={vi.fn()} onRemoveAll={onRemoveAll} />)

      const clearBtn = screen.getByRole('button', { name: /dismiss all 2 previous notifications/i })

      fireEvent.keyDown(clearBtn, { key: 'Tab' })
      expect(onRemoveAll).not.toHaveBeenCalled()

      fireEvent.keyDown(clearBtn, { key: 'Escape' })
      expect(onRemoveAll).toHaveBeenCalledTimes(1)
      expect(onRemoveAll).toHaveBeenCalledWith(['toast-1', 'toast-2'])
    })

    it('invokes onRemove with the toast id when dismissing an individual toast in the expanded list', () => {
      const items = makeToasts(2)
      const onRemove = vi.fn()
      render(<ToastGroup items={items} onRemove={onRemove} onRemoveAll={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /show 2 previous notifications/i }))

      const closeButtons = screen.getAllByRole('button', { name: /close notification/i })
      expect(closeButtons).toHaveLength(2)

      fireEvent.click(closeButtons[0])
      expect(onRemove).toHaveBeenCalledTimes(1)
      expect(onRemove).toHaveBeenCalledWith('toast-1')
    })
  })
})
