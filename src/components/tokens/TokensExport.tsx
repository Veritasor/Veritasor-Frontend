import { useCallback, useMemo, useState, useRef, type CSSProperties } from 'react'
import { parseTokens, tokensToCss, getVariantLabel, type ThemeVariant } from '../../utils/parseTokens'

const VARIANTS: { value: string; label: string; variant: ThemeVariant }[] = [
  { value: 'root', label: ':root (default dark)', variant: { kind: 'root' } },
  { value: 'light', label: '[data-theme="light"]', variant: { kind: 'data-theme', theme: 'light' } },
  { value: 'dark', label: '[data-theme="dark"]', variant: { kind: 'data-theme', theme: 'dark' } },
]

const PRIMARY_BUTTON: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  minHeight: 'var(--density-touch-min)',
  padding: '0.7rem 1.1rem',
  borderRadius: 12,
  border: '1px solid transparent',
  fontWeight: 800,
  cursor: 'pointer',
  color: '#04111f',
  background: 'linear-gradient(135deg, var(--accent), #60a5fa)',
}

const GHOST_BUTTON: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  minHeight: 'var(--density-touch-min)',
  padding: '0.7rem 1.1rem',
  borderRadius: 12,
  border: '1px solid var(--border)',
  fontWeight: 700,
  cursor: 'pointer',
  color: 'var(--text)',
  background: 'transparent',
}

const FIELDSET_STYLE: CSSProperties = {
  border: 'none',
  margin: 0,
  padding: 0,
}

const CODE_STYLE: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: '14rem',
  padding: '1rem',
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--surface-strong)',
  color: 'var(--text)',
  fontFamily: '"SF Mono", "Fira Code", monospace',
  fontSize: '0.82rem',
  lineHeight: 1.6,
  overflow: 'auto',
  whiteSpace: 'pre',
  tabSize: 2,
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TokensExport() {
  const parsed = parseTokens()
  const [variant, setVariant] = useState<string>('root')
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentVariant = useMemo<ThemeVariant>(
    () => (VARIANTS.find((v) => v.value === variant)?.variant ?? { kind: 'root' }) as ThemeVariant,
    [variant],
  )

  const handleVariantChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVariant(e.target.value)
    },
    [],
  )

  const css = tokensToCss(parsed.blocks, currentVariant)

  const handleCopy = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.select()
    }
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true)
      setAnnouncement('CSS tokens copied to clipboard.')
      setTimeout(() => setCopied(false), 2000)
    })
  }, [css])

  const handleDownload = useCallback(() => {
    const blob = new Blob([css], { type: 'text/css' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `veritasor-tokens-${variant}-${new Date().toISOString().slice(0, 10)}.css`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setAnnouncement(`Downloaded tokens for ${getVariantLabel(currentVariant)}.`)
  }, [css, variant, currentVariant])

  return (
    <section
      aria-labelledby="tokens-export-title"
      style={{
        padding: 'var(--density-padding)',
        background: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--border)',
      }}
    >
      <h2 id="tokens-export-title" style={{ margin: '0 0 0.5rem', fontSize: 'var(--text-xl)' }}>
        Export design tokens
      </h2>
      <p style={{ margin: '0 0 var(--density-gap)', color: 'var(--muted)', lineHeight: 1.6 }}>
        Export a snapshot of Veritasor design tokens as CSS custom properties. Ready to paste into{' '}
        <code style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: '0.82rem' }}>
          src/index.css
        </code>{' '}
        or share with other teams.
      </p>

      <fieldset style={FIELDSET_STYLE}>
        <legend style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Scope</legend>
        <div
          role="radiogroup"
          aria-label="Token export scope"
          style={{ display: 'flex', gap: 'var(--density-row-gap)', flexWrap: 'wrap' }}
        >
          {VARIANTS.map((v) => {
            const checked = variant === v.value
            return (
              <label
                key={v.value}
                style={{
                  flex: '1 1 160px',
                  minWidth: 140,
                  display: 'grid',
                  gap: '0.25rem',
                  padding: 'var(--density-padding)',
                  borderRadius: 12,
                  border: `1px solid ${checked ? 'var(--border-strong)' : 'var(--border)'}`,
                  background: checked ? 'rgba(94, 234, 212, 0.10)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <input
                    type="radio"
                    name="tokens-variant"
                    value={v.value}
                    checked={checked}
                    onChange={handleVariantChange}
                    style={{ accentColor: 'var(--accent)', width: '1.1rem', height: '1.1rem' }}
                  />
                  {v.label}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div style={{ marginTop: 'var(--density-gap)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" style={PRIMARY_BUTTON} onClick={handleCopy}>
          <span aria-hidden="true">📋</span> Copy to clipboard
        </button>
        <button type="button" style={GHOST_BUTTON} onClick={handleDownload}>
          <span aria-hidden="true">⬇</span> Download file
        </button>
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {copied && (
        <div
          role="status"
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            background: 'var(--success-soft)',
            border: '1px solid rgba(52, 211, 153, 0.35)',
            color: 'var(--success)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
          }}
        >
          Copied to clipboard ✓
        </div>
      )}

      <div style={{ marginTop: 'var(--density-gap)' }}>
        <label
          htmlFor="tokens-preview"
          style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}
        >
          Preview — {formatDate(parsed.exportedAt)}
        </label>
        <textarea
          id="tokens-preview"
          ref={textareaRef}
          readOnly
          value={css}
          style={CODE_STYLE}
          aria-label="CSS custom properties preview"
          rows={16}
        />
      </div>
    </section>
  )
}