import { useRef, useState } from 'react'
import type { DocumentUpload } from '../../hooks/useOnboardingDraft'

type Props = {
  data: DocumentUpload
  onBack: () => void
  onNext: (data: DocumentUpload, files: FileMap) => void
  rejections?: Partial<Record<DocField, { reason: string }>>
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

export default function DocumentUploadStep({ onBack, onNext, data, rejections }: Props) {
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

          {/* Drop zone or Rejection Card */}
          {(rejections?.[key] && files[key].length === 0) ? (
            <div className="ob-rejection-card" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" aria-hidden="true" style={{ marginTop: '0.1rem', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <h3 style={{ color: 'var(--danger)', margin: '0 0 0.5rem 0', fontSize: '1.05rem' }}>Action Required</h3>
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--text)', fontSize: '0.95rem' }}>
                    <strong>Reason for rejection:</strong> {rejections[key].reason}
                  </p>

                  <details style={{ marginBottom: '1.25rem' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', fontSize: '0.95rem' }}>
                      View examples of acceptable documents
                    </summary>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                      <div style={{ width: '80px', height: '110px', background: 'rgba(148,163,184,0.1)', border: '1px dashed var(--muted)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', padding: '0.5rem' }}>Example 1</div>
                      <div style={{ width: '80px', height: '110px', background: 'rgba(148,163,184,0.1)', border: '1px dashed var(--muted)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', padding: '0.5rem' }}>Example 2</div>
                    </div>
                  </details>

                  <button 
                    type="button" 
                    onClick={() => inputRefs.current[key]?.click()}
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(148,163,184,0.1)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                  >
                    Re-upload document
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
          )}

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
