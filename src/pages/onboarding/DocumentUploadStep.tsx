import { useRef, useState } from 'react'
import type { DocumentUpload } from '../../hooks/useOnboardingDraft'

type Props = {
  data: DocumentUpload
  onBack: () => void
  onNext: (data: DocumentUpload, files: FileMap) => void
}

export type FileMap = {
  registrationCert: File[]
  govIdFront: File[]
  govIdBack: File[]
  proofOfAddress: File[]
}

type DocField = keyof FileMap

const ACCEPT = '.pdf,.jpg,.jpeg,.png'
const MAX_MB = 10
const MAX_BYTES = MAX_MB * 1024 * 1024

const FIELDS: { key: DocField; label: string; hint: string; required: boolean; multiple: boolean }[] = [
  { key: 'registrationCert', label: 'Business registration certificate', hint: 'Official certificate of incorporation', required: true, multiple: false },
  { key: 'govIdFront', label: 'Government-issued ID — front', hint: "Passport, national ID, or driver's licence (front)", required: true, multiple: false },
  { key: 'govIdBack', label: 'Government-issued ID — back', hint: 'Back side of the same document', required: true, multiple: false },
  { key: 'proofOfAddress', label: 'Proof of address', hint: 'Utility bill or bank statement dated within 3 months', required: true, multiple: false },
]

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentUploadStep({ onBack, onNext }: Props) {
  const [files, setFiles] = useState<FileMap>({
    registrationCert: [],
    govIdFront: [],
    govIdBack: [],
    proofOfAddress: [],
  })
  const [errors, setErrors] = useState<Partial<Record<DocField, string>>>({})
  const [dragOver, setDragOver] = useState<DocField | null>(null)
  const inputRefs = useRef<Partial<Record<DocField, HTMLInputElement>>>({})

  function addFiles(field: DocField, incoming: FileList | null) {
    if (!incoming) return
    const valid: File[] = []
    const fieldErrors: string[] = []

    Array.from(incoming).forEach(f => {
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) {
        fieldErrors.push(`${f.name}: unsupported type (PDF, JPG, PNG only)`)
        return
      }
      if (f.size > MAX_BYTES) {
        fieldErrors.push(`${f.name}: exceeds ${MAX_MB} MB limit`)
        return
      }
      valid.push(f)
    })

    setFiles(prev => ({ ...prev, [field]: [...prev[field], ...valid] }))
    setErrors(prev => ({
      ...prev,
      [field]: fieldErrors.length ? fieldErrors.join('; ') : undefined,
    }))
  }

  function removeFile(field: DocField, index: number) {
    setFiles(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Partial<Record<DocField, string>> = {}
    FIELDS.forEach(({ key, required }) => {
      if (required && files[key].length === 0) errs[key] = 'This document is required'
    })
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const names: DocumentUpload = {
      registrationCert: files.registrationCert.map(f => f.name),
      govIdFront: files.govIdFront.map(f => f.name),
      govIdBack: files.govIdBack.map(f => f.name),
      proofOfAddress: files.proofOfAddress.map(f => f.name),
    }
    onNext(names, files)
  }

  return (
    <form className="ob-form" onSubmit={handleSubmit} noValidate aria-label="Document upload">
      {FIELDS.map(({ key, label, hint, required }) => (
        <div key={key} className="ob-field">
          <label className={`ob-label${required ? ' ob-label-required' : ''}`} htmlFor={`ob-drop-${key}`}>
            {label}
          </label>
          <span className="ob-hint">{hint}</span>

          {/* Hidden file input */}
          <input
            ref={el => { if (el) inputRefs.current[key] = el }}
            id={`ob-drop-${key}`}
            type="file"
            accept={ACCEPT}
            style={{ display: 'none' }}
            aria-label={label}
            onChange={e => addFiles(key, e.target.files)}
          />

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label={`Upload ${label}`}
            className={`ob-dropzone${dragOver === key ? ' ob-dropzone-active' : ''}`}
            onClick={() => inputRefs.current[key]?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRefs.current[key]?.click() } }}
            onDragOver={e => { e.preventDefault(); setDragOver(key) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => { e.preventDefault(); setDragOver(null); addFiles(key, e.dataTransfer.files) }}
          >
            <span className="ob-dropzone-icon" aria-hidden="true">📎</span>
            <span className="ob-dropzone-label"><strong>Click to upload</strong> or drag and drop</span>
            <span className="ob-dropzone-meta">PDF, JPG, PNG · max {MAX_MB} MB</span>
          </div>

          {/* File list */}
          {files[key].length > 0 && (
            <ul className="ob-file-list" aria-label={`Uploaded files for ${label}`}>
              {files[key].map((f, i) => (
                <li key={i} className="ob-file-item">
                  <span className="ob-file-name">{f.name}</span>
                  <span className="ob-file-size">{formatBytes(f.size)}</span>
                  <button
                    type="button"
                    className="ob-file-remove"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => removeFile(key, i)}
                  >×</button>
                </li>
              ))}
            </ul>
          )}

          {errors[key] && (
            <span className="ob-error" role="alert">{errors[key]}</span>
          )}
        </div>
      ))}

      <div className="ob-actions">
        <button type="button" className="ob-btn ob-btn-secondary" onClick={onBack}>← Back</button>
        <button type="submit" className="ob-btn ob-btn-primary">Continue →</button>
      </div>
    </form>
  )
}
