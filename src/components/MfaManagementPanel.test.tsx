import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import MfaManagementPanel from './MfaManagementPanel'
import { generateTotp } from '../services/totp'
import { resetMockAuthCodes, getRemainingCodes } from '../services/mockAuth'

describe('MfaManagementPanel', () => {
  beforeEach(() => {
    resetMockAuthCodes()
  })

  it('starts in disabled state with method chooser and setup button', () => {
    render(<MfaManagementPanel />)
    expect(screen.getByText(/not enabled/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /set up two-factor authentication/i }),
    ).toBeInTheDocument()
  })

  it('shows QR placeholder, manual key, and rejects invalid TOTP codes', async () => {
    render(<MfaManagementPanel />)
    fireEvent.click(
      screen.getByRole('button', { name: /set up two-factor authentication/i }),
    )

    expect(
      screen.getByRole('img', { name: /totp qr code placeholder/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('totp-manual-key').textContent).toBeTruthy()

    const codeInput = screen.getByLabelText(/6-digit verification code/i)
    fireEvent.change(codeInput, { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: /verify & enable/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /invalid verification code/i,
    )
  })

  it('completes TOTP enrollment with a valid RFC 6238 code and shows 10 recovery codes', async () => {
    render(<MfaManagementPanel />)
    fireEvent.click(
      screen.getByRole('button', { name: /set up two-factor authentication/i }),
    )

    const manualKey = screen.getByTestId('totp-manual-key').textContent ?? ''
    const validCode = await generateTotp(manualKey)

    fireEvent.change(screen.getByLabelText(/6-digit verification code/i), {
      target: { value: validCode },
    })
    fireEvent.click(screen.getByRole('button', { name: /verify & enable/i }))

    const codeList = await screen.findByRole('list', { name: /recovery codes/i })
    expect(codeList.querySelectorAll('li')).toHaveLength(10)

    const continueBtn = screen.getByRole('button', { name: /^continue$/i })
    expect(continueBtn).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: /i've saved/i }))
    expect(continueBtn).toBeEnabled()
    fireEvent.click(continueBtn)

    expect(
      screen.getByText(/two-factor authentication is enabled/i),
    ).toBeInTheDocument()
  })

  it('prevents removing the last MFA factor until another method is enrolled', async () => {
    render(<MfaManagementPanel />)
    fireEvent.click(
      screen.getByRole('button', { name: /set up two-factor authentication/i }),
    )

    const manualKey = screen.getByTestId('totp-manual-key').textContent ?? ''
    const validCode = await generateTotp(manualKey)

    fireEvent.change(screen.getByLabelText(/6-digit verification code/i), {
      target: { value: validCode },
    })
    fireEvent.click(screen.getByRole('button', { name: /verify & enable/i }))

    await screen.findByRole('list', { name: /recovery codes/i })
    fireEvent.click(screen.getByRole('checkbox', { name: /i've saved/i }))
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    // With only 1 factor, Remove button must be disabled
    const removeTotpBtn = screen.getByRole('button', {
      name: /remove authenticator app/i,
    })
    expect(removeTotpBtn).toBeDisabled()
    expect(
      screen.getByText(/at least one mfa method must remain active/i),
    ).toBeInTheDocument()

    // Add a second factor (Security key)
    fireEvent.click(screen.getByRole('button', { name: /add another method/i }))
    fireEvent.click(screen.getByRole('radio', { name: /security key/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue setup/i }))
    fireEvent.click(
      screen.getByRole('button', { name: /register security key/i }),
    )

    // Now both Remove buttons are enabled
    const enabledRemoveTotpBtn = screen.getByRole('button', {
      name: /remove authenticator app/i,
    })
    expect(enabledRemoveTotpBtn).toBeEnabled()

    // Removing one leaves the remaining factor protected again
    fireEvent.click(enabledRemoveTotpBtn)
    expect(
      screen.queryByRole('button', { name: /remove authenticator app/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /remove hardware security key/i }),
    ).toBeDisabled()
  })

  it('requires reauthentication before regenerating recovery codes', async () => {
    render(<MfaManagementPanel />)
    fireEvent.click(
      screen.getByRole('button', { name: /set up two-factor authentication/i }),
    )

    const manualKey = screen.getByTestId('totp-manual-key').textContent ?? ''
    const validCode = await generateTotp(manualKey)

    fireEvent.change(screen.getByLabelText(/6-digit verification code/i), {
      target: { value: validCode },
    })
    fireEvent.click(screen.getByRole('button', { name: /verify & enable/i }))

    await screen.findByRole('list', { name: /recovery codes/i })
    const initialCodes = getRemainingCodes()
    fireEvent.click(screen.getByRole('checkbox', { name: /i've saved/i }))
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    // Click Regenerate -> opens ReauthModal
    fireEvent.click(
      screen.getByRole('button', { name: /regenerate recovery codes/i }),
    )
    expect(
      screen.getByRole('dialog', { name: /please re-authenticate to continue/i }),
    ).toBeInTheDocument()

    // Enter password and submit reauth
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'CorrectHorseBatteryStaple1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: /please re-authenticate to continue/i,
        }),
      ).not.toBeInTheDocument()
    })

    expect(
      screen.getByText(/recovery codes regenerated/i),
    ).toBeInTheDocument()
    const regeneratedCodes = getRemainingCodes()
    expect(regeneratedCodes).toHaveLength(10)
    expect(regeneratedCodes).not.toEqual(initialCodes)
  })
})
