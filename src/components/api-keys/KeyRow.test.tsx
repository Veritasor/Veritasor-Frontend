import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../ToastContext'
import KeyRow from './KeyRow'
import type { ApiKey, ApiKeyStatus } from './apiKeyTypes'

const testKey: ApiKey = {
  id: 'key-row-test',
  label: 'Test integration',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  expiresAt: '2026-06-01T00:00:00Z',
  scopes: ['read:attestations'],
  maskedKey: 'test-key-••••-sample',
}

const statuses: { status: ApiKeyStatus; badge: string; canManage: boolean }[] = [
  { status: 'active', badge: 'Active', canManage: true },
  { status: 'expired', badge: 'Expired', canManage: false },
  { status: 'revoked', badge: 'Revoked', canManage: false },
]

function renderKeyRow(keyItem: ApiKey = testKey, mintedOnce: string | null = null) {
  const onCopyMasked = vi.fn()
  const onRotate = vi.fn()
  const onRevoke = vi.fn()
  const row = (mintedValue: string | null) => (
    <KeyRow
      keyItem={keyItem}
      mintedOnce={mintedValue}
      onCopyMasked={onCopyMasked}
      onRotate={onRotate}
      onRevoke={onRevoke}
    />
  )
  const { container, rerender } = render(row(mintedOnce), { wrapper: ToastProvider })
  return { container, onCopyMasked, onRotate, onRevoke, rerenderKeyRow: (value: string | null) => rerender(row(value)) }
}

describe('KeyRow', () => {
  it.each(statuses)('shows $badge and the appropriate actions for a $status key', ({ status, badge, canManage }) => {
    renderKeyRow({ ...testKey, status })

    const row = within(screen.getByRole('group', { name: `API key ${testKey.label}, ${badge}` }))
    expect(row.getByLabelText(`Key status: ${badge}`)).toHaveTextContent(badge)
    expect(row.getByLabelText('Masked key value')).toHaveTextContent(testKey.maskedKey)
    expect(row.getByRole('button', { name: 'Copy masked' })).toBeEnabled()
    expect(row.queryByRole('button', { name: 'Copy full' })).not.toBeInTheDocument()

    const rotate = row.getByRole('button', { name: 'Rotate' })
    const revoke = row.getByRole('button', { name: 'Revoke' })
    if (canManage) {
      expect(rotate).toBeEnabled()
      expect(revoke).toBeEnabled()
    } else {
      expect(rotate).toBeDisabled()
      expect(revoke).toBeDisabled()
    }
  })

  it('removes the one-time value from the row when the reveal ends and copies only the mask', async () => {
    const user = userEvent.setup()
    const fakeFullKey = 'test-fixture-only-full-key-sample'
    const { container, onCopyMasked, rerenderKeyRow } = renderKeyRow(testKey, fakeFullKey)
    expect(screen.getByLabelText('Full key value (shown once)')).toHaveTextContent(fakeFullKey)

    rerenderKeyRow(null)

    const masked = screen.getByLabelText('Masked key value')
    expect(masked.textContent).toBe(testKey.maskedKey)
    expect(masked).toHaveAttribute('title', testKey.maskedKey)
    expect(container.innerHTML).not.toContain(fakeFullKey)
    expect(screen.queryByRole('button', { name: 'Copy full' })).not.toBeInTheDocument()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Copy masked' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onCopyMasked).toHaveBeenCalledExactlyOnceWith(testKey)
    expect(await navigator.clipboard.readText()).toBe(testKey.maskedKey)
  })

  it('rotates an active key through keyboard controls and confirmation', async () => {
    const user = userEvent.setup()
    const { onRotate } = renderKeyRow()

    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Rotate' })).toHaveFocus()
    await user.keyboard('{Enter}')

    const dialog = screen.getByRole('dialog', { name: 'Rotate API key?' })
    const confirm = within(dialog).getByRole('button', { name: 'Rotate' })
    expect(onRotate).not.toHaveBeenCalled()
    await user.tab()
    await user.tab()
    await user.tab()
    expect(confirm).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onRotate).toHaveBeenCalledExactlyOnceWith(testKey.id)
    expect(dialog).not.toBeInTheDocument()
  })

  it('revokes an active key by keyboard only after typing its label', async () => {
    const user = userEvent.setup()
    const { onRevoke } = renderKeyRow()

    await user.tab()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Revoke' })).toHaveFocus()
    await user.keyboard(' ')

    const dialog = screen.getByRole('dialog', { name: 'Revoke API key?' })
    const confirm = within(dialog).getByRole('button', { name: 'Revoke key' })
    await waitFor(() => expect(dialog).toHaveFocus())
    expect(confirm).toBeDisabled()
    expect(onRevoke).not.toHaveBeenCalled()

    await user.tab()
    await user.tab()
    expect(within(dialog).getByRole('textbox', { name: `Type ${testKey.label} to confirm` })).toHaveFocus()
    await user.keyboard(testKey.label)
    expect(confirm).toBeEnabled()
    await user.tab()
    await user.tab()
    expect(confirm).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onRevoke).toHaveBeenCalledExactlyOnceWith(testKey.id)
    expect(dialog).not.toBeInTheDocument()
  })
})
