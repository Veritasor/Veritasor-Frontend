import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/ToastContext'
import ApiKeys from './ApiKeys'

const adminReminder = /rotation reminder.*admin/i
const auditorReminder = /rotation reminder.*auditor/i
const dayMs = 24 * 60 * 60 * 1000

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <ApiKeys />
      </MemoryRouter>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-03T12:08:33Z'))
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.useRealTimers()
})

it('restores a snooze only for the selected key and shows its reminder at expiry', () => {
  const { unmount } = renderPage()
  const admin = screen.getByRole('status', { name: adminReminder })
  expect(screen.getByRole('status', { name: auditorReminder })).toBeInTheDocument()

  fireEvent.click(within(admin).getByRole('button', { name: /snooze/i }))
  unmount()
  renderPage()

  expect(screen.queryByRole('status', { name: adminReminder })).not.toBeInTheDocument()
  expect(screen.getByRole('status', { name: auditorReminder })).toBeInTheDocument()

  act(() => {
    vi.advanceTimersByTime(dayMs - 1)
  })
  expect(screen.queryByRole('status', { name: adminReminder })).not.toBeInTheDocument()
  act(() => {
    vi.advanceTimersByTime(1)
  })
  expect(screen.getByRole('status', { name: adminReminder })).toBeInTheDocument()
})
