import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DesignGallery from './DesignGallery'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('DesignGallery', () => {
  it('renders all core design system sections in DEV mode', () => {
    render(<DesignGallery />)

    expect(screen.getByRole('heading', { level: 1, name: /component gallery/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^submitbutton$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^toastitem$/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: /skeletonloader & crossfadereveal/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: /^emptystateillustrations$/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^confirmdialog$/i })).toBeInTheDocument()
  })

  it('returns null when import.meta.env.DEV is false', () => {
    vi.stubEnv('DEV', false)
    const { container } = render(<DesignGallery />)
    expect(container.firstChild).toBeNull()
  })

  it('toggles SubmitButton busy and disabled states', async () => {
    const user = userEvent.setup()
    render(<DesignGallery />)

    const submitBtn = screen.getByRole('button', { name: /sign in/i })
    expect(submitBtn).toBeEnabled()
    expect(submitBtn).not.toHaveAttribute('aria-busy', 'true')

    await user.click(screen.getByLabelText(/^busy$/i))
    const busyBtn = screen.getByRole('button', { name: /signing in/i })
    expect(busyBtn).toBeDisabled()
    expect(busyBtn).toHaveAttribute('aria-busy', 'true')

    await user.click(screen.getByLabelText(/^busy$/i))
    await user.click(screen.getByLabelText(/^disabled$/i))
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
  })

  it('toggles ToastItem variants, undo, count, and dismissal', async () => {
    const user = userEvent.setup()
    render(<DesignGallery />)

    expect(screen.getByText(/sample success notification message/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^error$/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/sample error notification message/i)

    await user.click(screen.getByLabelText(/with undo/i))
    expect(screen.getByRole('button', { name: /^undo$/i })).toBeInTheDocument()

    await user.click(screen.getByLabelText(/with count/i))
    expect(screen.getByText(/\(3 items\)/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close notification/i }))
    expect(screen.getByRole('button', { name: /restore toast/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /restore toast/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('toggles SkeletonLoader crossfade loaded state and variant', async () => {
    const user = userEvent.setup()
    render(<DesignGallery />)

    const root = screen.getByTestId('crossfade-skeleton').parentElement
    expect(root).toHaveAttribute('data-loaded', 'false')

    await user.click(screen.getByLabelText(/^loaded$/i))
    expect(root).toHaveAttribute('data-loaded', 'true')

    await user.click(screen.getByRole('button', { name: /attestation rows/i }))
    expect(screen.getByText('att_001')).toBeInTheDocument()
    expect(screen.getByText('att_002')).toBeInTheDocument()
  })

  it('switches EmptyStateIllustrations types', async () => {
    const user = userEvent.setup()
    render(<DesignGallery />)

    expect(screen.getByText(/no attestations illustration/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /revenue-sources/i }))
    expect(screen.getByText(/no sources illustration/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /data-export/i }))
    expect(screen.getByText(/no exports illustration/i)).toBeInTheDocument()
  })

  it('opens and closes ConfirmDialog with default and danger tones', async () => {
    const user = userEvent.setup()
    render(<DesignGallery />)

    await user.click(screen.getByRole('button', { name: /danger tone/i }))
    await user.click(screen.getByRole('button', { name: /open confirmdialog/i }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/revoke api key\?/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('matches snapshot of gallery structure in default state', () => {
    render(<DesignGallery />)
    const summary = {
      title: screen.getByRole('heading', { level: 1 }).textContent,
      sections: screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    }
    expect(summary).toMatchInlineSnapshot(`
      {
        "sections": [
          "SubmitButton",
          "ToastItem",
          "SkeletonLoader & CrossfadeReveal",
          "EmptyStateIllustrations",
          "ConfirmDialog",
        ],
        "title": "Component Gallery",
      }
    `)
  })

  it('has accessible landmarks, headings, and labeled controls', () => {
    render(<DesignGallery />)

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('aria-labelledby', 'design-gallery-title')

    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThanOrEqual(6)

    const buttons = screen.getAllByRole('button')
    for (const button of buttons) {
      expect(button).toHaveAccessibleName()
    }
  })
})
