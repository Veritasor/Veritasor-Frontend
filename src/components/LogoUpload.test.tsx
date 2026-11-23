import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import LogoUpload from './LogoUpload'

const PNG_MAGIC = [137, 80, 78, 71, 13, 10, 26, 10]
const JPEG_MAGIC = [255, 216, 255, 224]

function fileWithBytes(name: string, type: string, bytes: number[], size = bytes.length): File {
  const buffer = new Uint8Array(Math.max(size, bytes.length))
  buffer.set(bytes)
  const file = new File([buffer], name, { type })
  if (size !== bytes.length) {
    Object.defineProperty(file, 'size', { value: size })
  }
  return file
}

function makePngFile(name = 'logo.png', size?: number) {
  return fileWithBytes(name, 'image/png', PNG_MAGIC, size)
}

function makeJpegFile(name = 'logo.jpg', size?: number) {
  return fileWithBytes(name, 'image/jpeg', JPEG_MAGIC, size)
}

function makeSvgFile(name = 'logo.svg') {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="1" cy="1" r="1"/></svg>'
  return new File([svg], name, { type: 'image/svg+xml' })
}

type ImageDimensions = { width: number; height: number }

function installImageMock(dimensions: ImageDimensions = { width: 256, height: 256 }) {
  class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = dimensions.width
    naturalHeight = dimensions.height
    private _src = ''

    get src() {
      return this._src
    }

    set src(value: string) {
      this._src = value
      queueMicrotask(() => {
        if (this._src.startsWith('blob:')) {
          this.onload?.()
        } else {
          this.onerror?.()
        }
      })
    }
  }

  vi.stubGlobal('Image', MockImage as unknown as typeof Image)
}

async function uploadFile(input: HTMLElement, file: File) {
  fireEvent.change(input, { target: { files: [file] } })
}

async function dropFile(dropzone: HTMLElement, file: File) {
  fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })
}

describe('LogoUpload', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    let counter = 0
    mockCreateObjectURL = vi.fn(() => `blob:http://localhost/mock-${++counter}`)
    mockRevokeObjectURL = vi.fn()
    window.URL.createObjectURL = mockCreateObjectURL as unknown as typeof URL.createObjectURL
    window.URL.revokeObjectURL = mockRevokeObjectURL as unknown as typeof URL.revokeObjectURL

    installImageMock({ width: 256, height: 256 })

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext

    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation(function (
      this: HTMLCanvasElement,
      callback: (blob: Blob | null) => void,
    ) {
      callback(new Blob(['mock-image-data'], { type: 'image/jpeg' }))
    })

    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 300,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders idle state with current logo', () => {
    render(<LogoUpload currentLogoUrl="http://example.com/logo.png" onSave={vi.fn()} />)
    expect(screen.getByAltText('Current organisation logo')).toHaveAttribute('src', 'http://example.com/logo.png')
    expect(screen.getByText('Click to upload')).toBeInTheDocument()
  })

  it('rejects unsupported file type with a specific error', async () => {
    render(<LogoUpload onSave={vi.fn()} />)
    const fileInput = screen.getByLabelText('Upload logo')

    await uploadFile(fileInput, new File(['text'], 'test.txt', { type: 'text/plain' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unsupported file type. Please upload a PNG or JPEG image.',
    )
  })

  it('rejects oversized files with a specific error', async () => {
    render(<LogoUpload onSave={vi.fn()} />)
    const fileInput = screen.getByLabelText('Upload logo')

    await uploadFile(fileInput, makeJpegFile('large.jpg', 3 * 1024 * 1024))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'File is too large. Maximum size is 2 MB.',
    )
  })

  it('verifies type by magic bytes rather than file.type alone', async () => {
    render(<LogoUpload onSave={vi.fn()} />)
    const fileInput = screen.getByLabelText('Upload logo')

    const spoofed = fileWithBytes('fake.png', 'image/png', [0, 1, 2, 3, 4, 5, 6, 7, 8])
    await uploadFile(fileInput, spoofed)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unsupported file type. Please upload a PNG or JPEG image.',
    )
    expect(screen.queryByText(/Drag to reposition/)).not.toBeInTheDocument()
  })

  it('accepts valid files when file.type is missing but magic bytes are valid', async () => {
    render(<LogoUpload onSave={vi.fn()} />)
    const fileInput = screen.getByLabelText('Upload logo')

    const pngNoMime = fileWithBytes('logo', '', PNG_MAGIC)
    await uploadFile(fileInput, pngNoMime)

    expect(await screen.findByText(/Drag to reposition/)).toBeInTheDocument()
  })

  it('rejects SVG files and never inlines them', async () => {
    render(<LogoUpload onSave={vi.fn()} />)
    const fileInput = screen.getByLabelText('Upload logo')

    await uploadFile(fileInput, makeSvgFile())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unsupported file type. Please upload a PNG or JPEG image.',
    )
    expect(screen.queryByText(/Drag to reposition/)).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '' })).not.toBeInTheDocument()
  })

  it('rejects images smaller than the minimum dimensions', async () => {
    installImageMock({ width: 32, height: 32 })
    render(<LogoUpload onSave={vi.fn()} />)
    const fileInput = screen.getByLabelText('Upload logo')

    await uploadFile(fileInput, makePngFile())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Image dimensions are too small. Minimum size is 64×64 pixels.',
    )
  })

  it('rejects images larger than the maximum dimensions', async () => {
    installImageMock({ width: 5000, height: 500 })
    render(<LogoUpload onSave={vi.fn()} />)
    const fileInput = screen.getByLabelText('Upload logo')

    await uploadFile(fileInput, makeJpegFile())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Image dimensions are too large. Maximum size is 4096×4096 pixels.',
    )
  })

  it('transitions to cropping phase on a valid file drop', async () => {
    render(<LogoUpload onSave={vi.fn()} />)
    const dropzone = screen.getByRole('button', { name: /Upload a new logo/ })

    await dropFile(dropzone, makeJpegFile('test.jpg'))

    expect(await screen.findByText(/Drag to reposition/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply crop' })).toBeInTheDocument()
  })

  it('renders preview images through object URLs', async () => {
    render(<LogoUpload onSave={vi.fn()} />)
    const dropzone = screen.getByRole('button', { name: /Upload a new logo/ })

    await dropFile(dropzone, makePngFile('test.png'))
    fireEvent.click(await screen.findByRole('button', { name: 'Apply crop' }))

    expect(await screen.findByText('Preview at multiple sizes')).toBeInTheDocument()
    const previewImages = screen.getAllByRole('img', { name: /Logo preview at/ })
    expect(previewImages).toHaveLength(3)
    for (const img of previewImages) {
      expect(img.getAttribute('src')).toMatch(/^blob:/)
    }
  })

  it('handles zooming via slider', async () => {
    render(<LogoUpload onSave={vi.fn()} />)
    const dropzone = screen.getByRole('button', { name: /Upload a new logo/ })

    await dropFile(dropzone, makeJpegFile('test.jpg'))
    expect(await screen.findByText(/Drag to reposition/)).toBeInTheDocument()

    const slider = screen.getByLabelText('Zoom level')
    fireEvent.change(slider, { target: { value: '2' } })

    expect(screen.getByText('200%')).toBeInTheDocument()
  })

  it('calls onSave with the cropped file', async () => {
    const handleSave = vi.fn()
    render(<LogoUpload onSave={handleSave} />)

    const dropzone = screen.getByRole('button', { name: /Upload a new logo/ })
    await dropFile(dropzone, makeJpegFile('test.jpg'))

    fireEvent.click(await screen.findByRole('button', { name: 'Apply crop' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Save logo' }))

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1)
      expect(handleSave.mock.calls[0][0]).toBeInstanceOf(File)
      expect(handleSave.mock.calls[0][0].name).toMatch(/^logo-\d+\.jpg$/)
    })
  })

  it('calls onCancel when provided', async () => {
    const handleCancel = vi.fn()
    render(<LogoUpload onSave={vi.fn()} onCancel={handleCancel} />)

    const dropzone = screen.getByRole('button', { name: /Upload a new logo/ })
    await dropFile(dropzone, makeJpegFile('test.jpg'))
    fireEvent.click(await screen.findByRole('button', { name: 'Apply crop' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  it('supports back navigation from preview to crop and crop to idle', async () => {
    render(<LogoUpload onSave={vi.fn()} />)

    const dropzone = screen.getByRole('button', { name: /Upload a new logo/ })
    await dropFile(dropzone, makeJpegFile('test.jpg'))
    fireEvent.click(await screen.findByRole('button', { name: 'Apply crop' }))

    fireEvent.click(await screen.findByRole('button', { name: '← Adjust crop' }))
    expect(screen.getByText(/Drag to reposition/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Choose different file' }))
    expect(screen.getByText('Click to upload')).toBeInTheDocument()
  })

  it('supports keyboard pan/nudge', async () => {
    render(<LogoUpload onSave={vi.fn()} />)

    const dropzone = screen.getByRole('button', { name: /Upload a new logo/ })
    await dropFile(dropzone, makeJpegFile('test.jpg'))

    const cropArea = await screen.findByRole('img', { name: /Logo crop area/ })
    cropArea.focus()
    fireEvent.keyDown(cropArea, { key: 'ArrowRight' })
    expect(cropArea).toBeInTheDocument()
  })
})
