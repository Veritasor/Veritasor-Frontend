/**
 * LogoUpload — Issue #230
 *
 * Business profile logo upload with cropping tool.
 * - Drag-drop, keyboard, and file-picker upload paths
 * - Square-crop with zoom slider
 * - Preview at 3 display sizes (large / medium / small)
 * - WCAG 2.1 AA: keyboard-operable, live regions, focus management
 * - Follows existing design system tokens (ob-*, --accent, --border, etc.)
 */
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LogoUploadProps {
  /** Current logo URL (e.g. from server). Null = no logo yet. */
  currentLogoUrl?: string | null
  /** Called with the cropped File when the user confirms. */
  onSave: (file: File) => void
  /** Called when the user discards changes / closes the panel. */
  onCancel?: () => void
}

type Phase = 'idle' | 'cropping' | 'preview'

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACCEPT = 'image/jpeg,image/png'
const MAX_MB = 2
const MAX_BYTES = MAX_MB * 1024 * 1024
const MIN_DIMENSION = 64
const MAX_DIMENSION = 4096
const CANVAS_SIZE = 320 // crop output px

type AllowedType = 'image/png' | 'image/jpeg'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function detectImageType(bytes: Uint8Array): AllowedType | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  return null
}

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('image-load-failed'))
    img.src = url
  })
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function LogoUpload({ currentLogoUrl, onSave, onCancel }: LogoUploadProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null)
  const [croppedFile, setCroppedFile] = useState<File | null>(null)

  // Crop state
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)
  const cropCanvasRef = useRef<HTMLCanvasElement>(null)
  const cropViewRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ingestToken = useRef(0)

  // ── File ingestion ──────────────────────────────────────────────────────

  const ingestFile = useCallback(async (file: File) => {
    const token = ++ingestToken.current
    setFileError(null)

    if (file.size > MAX_BYTES) {
      setFileError(`File is too large. Maximum size is ${MAX_MB} MB.`)
      return
    }

    let bytes: Uint8Array
    try {
      bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
    } catch {
      if (token !== ingestToken.current) return
      setFileError('Could not read the selected file. Please try another image.')
      return
    }

    if (token !== ingestToken.current) return

    const detectedType = detectImageType(bytes)
    if (!detectedType) {
      setFileError('Unsupported file type. Please upload a PNG or JPEG image.')
      return
    }

    const url = URL.createObjectURL(file)
    try {
      const { width, height } = await loadImageDimensions(url)
      if (token !== ingestToken.current) {
        URL.revokeObjectURL(url)
        return
      }
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        URL.revokeObjectURL(url)
        setFileError(
          `Image dimensions are too small. Minimum size is ${MIN_DIMENSION}×${MIN_DIMENSION} pixels.`,
        )
        return
      }
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        URL.revokeObjectURL(url)
        setFileError(
          `Image dimensions are too large. Maximum size is ${MAX_DIMENSION}×${MAX_DIMENSION} pixels.`,
        )
        return
      }
    } catch {
      URL.revokeObjectURL(url)
      if (token !== ingestToken.current) return
      setFileError('Could not load image. Please upload a valid PNG or JPEG file.')
      return
    }

    if (token !== ingestToken.current) {
      URL.revokeObjectURL(url)
      return
    }

    setSourceUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setPhase('cropping')
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void ingestFile(f)
    // Reset so re-selecting the same file fires onChange
    e.target.value = ''
  }, [ingestFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) void ingestFile(f)
  }, [ingestFile])

  const sourceUrlRef = useRef<string | null>(null)
  const croppedUrlRef = useRef<string | null>(null)

  useEffect(() => {
    sourceUrlRef.current = sourceUrl
  }, [sourceUrl])

  useEffect(() => {
    croppedUrlRef.current = croppedUrl
  }, [croppedUrl])

  // Revoke object URLs on cleanup
  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
      if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current)
    }
  }, [])

  // ── Crop interactions ────────────────────────────────────────────────────

  const pointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [offset])

  const pointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.mx
    const dy = e.clientY - dragStart.current.my
    const img = imgRef.current
    const view = cropViewRef.current
    if (!img || !view) return
    const viewSize = view.getBoundingClientRect().width
    const displayedSize = viewSize * zoom
    const maxOffset = Math.max(0, (displayedSize - viewSize) / 2)
    setOffset({
      x: clamp(dragStart.current.ox + dx, -maxOffset, maxOffset),
      y: clamp(dragStart.current.oy + dy, -maxOffset, maxOffset),
    })
  }, [zoom])

  const pointerUp = useCallback(() => { isDragging.current = false }, [])

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value)
    setZoom(newZoom)
    // Re-clamp offset when zoom changes
    const view = cropViewRef.current
    if (!view) return
    const viewSize = view.getBoundingClientRect().width
    const displayedSize = viewSize * newZoom
    const maxOffset = Math.max(0, (displayedSize - viewSize) / 2)
    setOffset(prev => ({
      x: clamp(prev.x, -maxOffset, maxOffset),
      y: clamp(prev.y, -maxOffset, maxOffset),
    }))
  }, [])

  // Keyboard nudge for crop (arrow keys)
  const handleCropKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 4
    const nudge = { x: 0, y: 0 }
    if (e.key === 'ArrowLeft') nudge.x = step
    else if (e.key === 'ArrowRight') nudge.x = -step
    else if (e.key === 'ArrowUp') nudge.y = step
    else if (e.key === 'ArrowDown') nudge.y = -step
    else return
    e.preventDefault()
    const view = cropViewRef.current
    if (!view) return
    const viewSize = view.getBoundingClientRect().width
    const maxOffset = Math.max(0, (viewSize * zoom - viewSize) / 2)
    setOffset(prev => ({
      x: clamp(prev.x + nudge.x, -maxOffset, maxOffset),
      y: clamp(prev.y + nudge.y, -maxOffset, maxOffset),
    }))
  }, [zoom])

  // ── Crop confirm ──────────────────────────────────────────────────────────

  const confirmCrop = useCallback(() => {
    const canvas = cropCanvasRef.current
    const img = imgRef.current
    const view = cropViewRef.current
    if (!canvas || !img || !view) return

    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const viewSize = view.getBoundingClientRect().width
    // Map crop view center to source image
    const displayCenterX = viewSize / 2 - offset.x
    const displayCenterY = viewSize / 2 - offset.y
    const imgDisplayW = img.naturalWidth * (viewSize * zoom / Math.min(img.naturalWidth, img.naturalHeight))
    const imgDisplayH = img.naturalHeight * (viewSize * zoom / Math.min(img.naturalWidth, img.naturalHeight))
    const imgLeft = viewSize / 2 - imgDisplayW / 2
    const imgTop = viewSize / 2 - imgDisplayH / 2
    const sx = (displayCenterX - imgLeft - viewSize / 2) / zoom / (imgDisplayW / img.naturalWidth) + img.naturalWidth / 2 - (viewSize / zoom / 2) / (imgDisplayW / img.naturalWidth)
    const sy = (displayCenterY - imgTop - viewSize / 2) / zoom / (imgDisplayH / img.naturalHeight) + img.naturalHeight / 2 - (viewSize / zoom / 2) / (imgDisplayH / img.naturalHeight)
    const sw = (viewSize / zoom) / (imgDisplayW / img.naturalWidth)
    const sh = (viewSize / zoom) / (imgDisplayH / img.naturalHeight)

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], `logo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setCroppedFile(file)
      setCroppedUrl(URL.createObjectURL(blob))
      setPhase('preview')
    }, 'image/jpeg', 0.92)
  }, [zoom, offset])

  const handleSave = useCallback(() => {
    if (croppedFile) onSave(croppedFile)
  }, [croppedFile, onSave])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="logo-upload-root" aria-label="Logo upload">
      <style>{LOGO_CSS}</style>

      {/* ── Idle / dropzone ──────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="logo-idle">
          {/* Current logo preview */}
          {currentLogoUrl && (
            <div className="logo-current" aria-label="Current logo">
              <img src={currentLogoUrl} alt="Current organisation logo" className="logo-current-img" />
              <span className="logo-current-label">Current logo</span>
            </div>
          )}

          {/* Dropzone */}
          <input
            ref={fileInputRef}
            id="logo-file-input"
            type="file"
            accept={ACCEPT}
            style={{ display: 'none' }}
            aria-label="Upload logo"
            onChange={handleFileChange}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a new logo — click or drag and drop an image file"
            className={`ob-dropzone logo-dropzone${dragOver ? ' ob-dropzone-active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <span className="ob-dropzone-icon" aria-hidden="true">🖼</span>
            <span className="ob-dropzone-label"><strong>Click to upload</strong> or drag and drop</span>
            <span className="ob-dropzone-meta">PNG or JPEG · max {MAX_MB} MB</span>
          </div>

          {fileError && <p className="ob-error" role="alert">{fileError}</p>}
        </div>
      )}

      {/* ── Cropping phase ───────────────────────────────────────────── */}
      {phase === 'cropping' && sourceUrl && (
        <div className="logo-crop-wrap">
          <p className="logo-crop-instruction" id="logo-crop-desc">
            Drag to reposition. Use the slider or arrow keys to zoom.
          </p>

          {/* Square crop viewport */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- interactive crop viewport supports arrow-key panning and pointer drag */}
          <div
            ref={cropViewRef}
            className="logo-crop-view"
            role="img"
            aria-label="Logo crop area. Use arrow keys to pan."
            aria-describedby="logo-crop-desc"
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- crop viewport is focusable for keyboard panning
            tabIndex={0}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onKeyDown={handleCropKeyDown}
          >
            <img
              ref={imgRef}
              src={sourceUrl}
              alt=""
              aria-hidden="true"
              className="logo-crop-img"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              draggable={false}
            />
            {/* Square guide overlay */}
            <div className="logo-crop-overlay" aria-hidden="true" />
          </div>

          {/* Hidden canvas for rendering crop output */}
          <canvas ref={cropCanvasRef} style={{ display: 'none' }} aria-hidden="true" />

          {/* Zoom slider */}
          <div className="logo-zoom-row">
            <span className="logo-zoom-icon" aria-hidden="true">🔍</span>
            <label htmlFor="logo-zoom-slider" className="sr-only">Zoom</label>
            <input
              id="logo-zoom-slider"
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={handleZoomChange}
              className="logo-zoom-slider"
              aria-label="Zoom level"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={Math.round(zoom * 100) / 100}
              aria-valuetext={`${Math.round(zoom * 100)}%`}
            />
            <span className="logo-zoom-value" aria-live="polite" aria-atomic="true">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="ob-actions">
            <button
              type="button"
              className="ob-btn ob-btn-secondary"
              onClick={() => { setPhase('idle'); setSourceUrl(null) }}
            >
              ← Choose different file
            </button>
            <button
              type="button"
              className="ob-btn ob-btn-primary"
              onClick={confirmCrop}
            >
              Apply crop
            </button>
          </div>
        </div>
      )}

      {/* ── Preview phase ─────────────────────────────────────────────── */}
      {phase === 'preview' && croppedUrl && (
        <div className="logo-preview-wrap">
          <h3 className="logo-preview-heading">Preview at multiple sizes</h3>
          <p className="logo-preview-desc">Confirm the logo looks sharp across all display contexts.</p>

          <div className="logo-preview-sizes" role="list">
            {[
              { size: 80, label: 'Large (80 px)' },
              { size: 40, label: 'Medium (40 px)' },
              { size: 24, label: 'Small (24 px)' },
            ].map(({ size, label }) => (
              <div key={size} className="logo-preview-size-item" role="listitem">
                <img
                  src={croppedUrl}
                  alt={`Logo preview at ${size}px`}
                  width={size}
                  height={size}
                  style={{ width: size, height: size, borderRadius: 6, objectFit: 'cover' }}
                />
                <span className="logo-preview-size-label">{label}</span>
              </div>
            ))}
          </div>

          <div className="ob-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="ob-btn ob-btn-secondary"
              onClick={() => { setPhase('cropping') }}
            >
              ← Adjust crop
            </button>
            {onCancel && (
              <button type="button" className="ob-btn ob-btn-secondary" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button type="button" className="ob-btn ob-btn-primary" onClick={handleSave}>
              Save logo
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Scoped CSS ─────────────────────────────────────────────────────────────────

const LOGO_CSS = `
/* Root */
.logo-upload-root { display: grid; gap: 1.25rem; }

/* Idle */
.logo-idle { display: grid; gap: 1rem; }
.logo-dropzone { min-height: 9rem; }
.logo-current {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
}
.logo-current-img {
  width: 52px; height: 52px; border-radius: 8px; object-fit: cover;
  border: 1px solid var(--border);
}
.logo-current-label { font-size: 0.88rem; color: var(--muted); }

/* Crop */
.logo-crop-wrap { display: grid; gap: 1rem; }
.logo-crop-instruction { margin: 0; font-size: 0.88rem; color: var(--muted); }
.logo-crop-view {
  position: relative; overflow: hidden;
  width: 100%; max-width: 320px; aspect-ratio: 1 / 1;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border-strong);
  background: #000;
  cursor: grab; user-select: none; touch-action: none;
  margin: 0 auto;
  outline: none;
}
.logo-crop-view:focus-visible {
  outline: 3px solid rgba(94, 234, 212, 0.5);
  outline-offset: 3px;
}
.logo-crop-view:active { cursor: grabbing; }
.logo-crop-img {
  width: 100%; height: 100%; object-fit: contain;
  pointer-events: none; display: block;
  will-change: transform;
  transition: transform 40ms linear;
}
/* Darken everything outside the square guide */
.logo-crop-overlay {
  position: absolute; inset: 0; pointer-events: none;
  border: 3px solid rgba(94, 234, 212, 0.7);
  border-radius: 2px;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);
}

/* Zoom row */
.logo-zoom-row {
  display: flex; align-items: center; gap: 0.75rem; max-width: 320px; margin: 0 auto; width: 100%;
}
.logo-zoom-icon { font-size: 1.1rem; flex-shrink: 0; }
.logo-zoom-slider {
  flex: 1; height: 4px; accent-color: var(--accent); cursor: pointer;
}
.logo-zoom-value {
  font-size: 0.82rem; color: var(--muted); min-width: 3rem; text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Preview */
.logo-preview-wrap { display: grid; gap: 1rem; }
.logo-preview-heading { margin: 0; font-size: 1rem; }
.logo-preview-desc { margin: 0; font-size: 0.88rem; color: var(--muted); }
.logo-preview-sizes {
  display: flex; align-items: flex-end; gap: 2rem; flex-wrap: wrap;
  padding: 1.25rem;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.logo-preview-size-item { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.logo-preview-size-label { font-size: 0.78rem; color: var(--muted); white-space: nowrap; }
`
