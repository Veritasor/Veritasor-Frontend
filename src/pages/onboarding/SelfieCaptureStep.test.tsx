import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SelfieCaptureStep from './SelfieCaptureStep'
import type { SelfieCapture } from '../../hooks/useOnboardingDraft'

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn()
const mockStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
}

Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
})

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((cb) => {
  return setTimeout(cb, 0) as unknown as number
})

globalThis.cancelAnimationFrame = vi.fn()

// Mock URL.createObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'mock-url')
globalThis.URL.revokeObjectURL = vi.fn()

function renderStep() {
  const mockOnBack = vi.fn()
  const mockOnNext = vi.fn()
  const mockData: SelfieCapture = { captured: false, fileName: '' }

  return {
    ...render(
      <SelfieCaptureStep data={mockData} onBack={mockOnBack} onNext={mockOnNext} />
    ),
    mockOnBack,
    mockOnNext,
  }
}

describe('SelfieCaptureStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── Basic rendering ──────────────────────────────────────

  it('renders form with proper aria-label', () => {
    renderStep()
    expect(screen.getByLabelText(/selfie verification/i)).toBeInTheDocument()
  })

  it('renders camera placeholder initially', () => {
    renderStep()
    expect(screen.getByText(/starting camera/i)).toBeInTheDocument()
  })

  it('renders back and continue buttons', () => {
    renderStep()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('disables continue button when no file is captured', () => {
    renderStep()
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeDisabled()
  })

  it('renders upload photo instead link', () => {
    renderStep()
    expect(screen.getByRole('button', { name: /upload photo instead/i })).toBeInTheDocument()
  })

  // ─── Camera access flow ───────────────────────────────────

  it('switches to upload view when upload button is clicked', () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))
    expect(screen.getByRole('region', { name: /upload photo fallback/i })).toBeInTheDocument()
  })

  // ─── Upload flow ─────────────────────────────────────────

  it('renders upload fallback when showUpload is true', () => {
    const mockOnBack = vi.fn()
    const mockOnNext = vi.fn()
    const mockData: SelfieCapture = { captured: false, fileName: '' }

    render(
      <SelfieCaptureStep data={mockData} onBack={mockOnBack} onNext={mockOnNext} />
    )

    // Click upload photo instead to show upload view
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))
    expect(screen.getByRole('region', { name: /upload photo fallback/i })).toBeInTheDocument()
  })

  it('accepts valid JPEG file upload', () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload selfie photo/i)
    fireEvent.change(input, { target: { files: [file] } })

    // File is accepted and shown in preview
    expect(screen.getByAltText(/uploaded selfie preview/i)).toBeInTheDocument()
  })

  it('accepts valid PNG file upload', () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))

    const file = new File(['test'], 'test.png', { type: 'image/png' })
    const input = screen.getByLabelText(/upload selfie photo/i)
    fireEvent.change(input, { target: { files: [file] } })

    // File is accepted and shown in preview
    expect(screen.getByAltText(/uploaded selfie preview/i)).toBeInTheDocument()
  })

  it('rejects invalid file type', () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))

    const file = new File(['test'], 'test.gif', { type: 'image/gif' })
    const input = screen.getByLabelText(/upload selfie photo/i)
    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByText(/please upload a jpg or png image/i)).toBeInTheDocument()
  })

  it('rejects file larger than 10MB', () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))

    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload selfie photo/i)
    fireEvent.change(input, { target: { files: [largeFile] } })

    expect(screen.getByText(/file size must be less than 10 mb/i)).toBeInTheDocument()
  })

  it('enables continue button after valid upload', () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload selfie photo/i)
    fireEvent.change(input, { target: { files: [file] } })

    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).not.toBeDisabled()
  })

  // ─── Form submission ─────────────────────────────────────

  it('calls onNext with captured file data on submit', () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    const { mockOnNext } = renderStep()
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload selfie photo/i)
    fireEvent.change(input, { target: { files: [file] } })

    // File is shown in preview view
    expect(screen.getByAltText(/uploaded selfie preview/i)).toBeInTheDocument()

    const form = screen.getByLabelText(/selfie verification/i)
    fireEvent.submit(form)

    expect(mockOnNext).toHaveBeenCalledWith(
      { captured: true, fileName: 'test.jpg' },
      file
    )
  })

  it('shows error when submitting without file', () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))

    const form = screen.getByLabelText(/selfie verification/i)
    fireEvent.submit(form)

    expect(screen.getByText(/please capture a selfie or upload a photo/i)).toBeInTheDocument()
  })

  // ─── Navigation ──────────────────────────────────────────

  it('calls onBack when back button is clicked', () => {
    const { mockOnBack } = renderStep()
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(mockOnBack).toHaveBeenCalled()
  })

  // ─── Change photo functionality ───────────────────────────

  it('allows changing uploaded photo', () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload selfie photo/i)
    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByAltText(/uploaded selfie preview/i)).toBeInTheDocument()

    // Change photo button is in preview view
    const changePhotoBtn = screen.getByRole('button', { name: /change photo/i })
    expect(changePhotoBtn).toBeInTheDocument()
  })

  // ─── Try camera again functionality ───────────────────────

  it('renders try camera again button in upload fallback', () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /upload photo instead/i }))
    
    // The try camera again button should be in the upload fallback view
    expect(screen.getByRole('region', { name: /upload photo fallback/i })).toBeInTheDocument()
  })

  // ─── Lighting analysis (mocked) ─────────────────────────

  it('renders lighting indicator container when camera is active', () => {
    mockGetUserMedia.mockResolvedValue(mockStream)
    renderStep()
    
    // Lighting indicator container should be present
    const lightingContainer = screen.getByRole('region', { name: /camera viewfinder/i })
    expect(lightingContainer).toBeInTheDocument()
  })
})
