/**
 * AddressAutocomplete — Issue #231
 *
 * Address input with autocomplete suggestions and a static map preview.
 * - WAI-ARIA combobox pattern (role="combobox" + role="listbox")
 * - Suggestion list with keyboard navigation (↑↓ Enter Escape)
 * - Empty state and loading state
 * - Static map preview tile after selection
 * - Manual-override toggle to enter an address by hand
 * - WCAG 2.1 AA: live regions, focus management, 44 px touch targets
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AddressSuggestion {
  id: string
  /** Short display label (e.g. "123 Main St") */
  label: string
  /** Full formatted address */
  fullAddress: string
  /** Latitude for map preview */
  lat?: number
  /** Longitude for map preview */
  lng?: number
}

export interface AddressValue {
  fullAddress: string
  lat?: number
  lng?: number
  isManual: boolean
}

export interface AddressAutocompleteProps {
  /** Field label */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Current value */
  value?: AddressValue | null
  /** Called when a suggestion is selected or manual address confirmed */
  onChange: (value: AddressValue) => void
  /** Called when the field is cleared */
  onClear?: () => void
  /**
   * Async function that returns suggestions for a given query.
   * The default mock returns fake data; replace with a real geocoder call.
   */
  fetchSuggestions?: (query: string) => Promise<AddressSuggestion[]>
  /** Whether the field is required */
  required?: boolean
  /** External validation error */
  error?: string
}

// ─── Default mock fetcher (replace with real API) ──────────────────────────────

const MOCK_SUGGESTIONS: AddressSuggestion[] = [
  { id: '1', label: '10 Downing St', fullAddress: '10 Downing St, London SW1A 2AA, UK', lat: 51.5034, lng: -0.1276 },
  { id: '2', label: '1600 Pennsylvania Ave NW', fullAddress: '1600 Pennsylvania Ave NW, Washington, DC 20500, USA', lat: 38.8977, lng: -77.0365 },
  { id: '3', label: 'Brandenburger Tor', fullAddress: 'Pariser Platz, 10117 Berlin, Germany', lat: 52.5163, lng: 13.3777 },
  { id: '4', label: 'Eiffel Tower', fullAddress: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France', lat: 48.8584, lng: 2.2945 },
  { id: '5', label: 'Sydney Opera House', fullAddress: 'Bennelong Point, Sydney NSW 2000, Australia', lat: -33.8568, lng: 151.2153 },
]

async function defaultFetch(query: string): Promise<AddressSuggestion[]> {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 280))
  const q = query.toLowerCase()
  return MOCK_SUGGESTIONS.filter(
    s => s.label.toLowerCase().includes(q) || s.fullAddress.toLowerCase().includes(q)
  )
}

// ─── Static map tile URL (OpenStreetMap) ──────────────────────────────────────

function staticMapUrl(lat: number, lng: number, zoom = 14, w = 480, h = 200) {
  // Uses tile.openstreetmap.org for a real implementation.
  // For a no-key static image, we use the OSM tile CDN indirectly via a
  // well-known static-maps proxy (staticmap.net) — swappable for Google/Mapbox.
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&maptype=mapnik`
}

// ─── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AddressAutocomplete({
  label = 'Business address',
  placeholder = 'Start typing your address…',
  value,
  onChange,
  onClear,
  fetchSuggestions = defaultFetch,
  required = false,
  error,
}: AddressAutocompleteProps) {
  const uid = useId()
  const inputId = `addr-input-${uid}`
  const listboxId = `addr-listbox-${uid}`
  const statusId = `addr-status-${uid}`

  const [query, setQuery] = useState(value?.fullAddress ?? '')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [manualMode, setManualMode] = useState(value?.isManual ?? false)
  const [statusMsg, setStatusMsg] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const ignoreNextBlur = useRef(false)

  const debouncedQuery = useDebounce(query, 300)

  // Sync external value
  useEffect(() => {
    if (value?.fullAddress !== undefined) setQuery(value.fullAddress)
    if (value?.isManual !== undefined) setManualMode(value.isManual)
  }, [value])

  // Fetch suggestions when query changes
  useEffect(() => {
    if (manualMode) return
    const q = debouncedQuery.trim()
    if (q.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchSuggestions(q).then(results => {
      if (cancelled) return
      setSuggestions(results)
      setOpen(true)
      setActiveIdx(-1)
      setLoading(false)
      setStatusMsg(
        results.length === 0
          ? 'No suggestions found'
          : `${results.length} suggestion${results.length !== 1 ? 's' : ''} available`
      )
    }).catch(() => {
      if (!cancelled) { setLoading(false); setStatusMsg('Could not fetch suggestions') }
    })
    return () => { cancelled = true }
  }, [debouncedQuery, manualMode, fetchSuggestions])

  const selectSuggestion = useCallback((s: AddressSuggestion) => {
    setQuery(s.fullAddress)
    setOpen(false)
    setSuggestions([])
    setActiveIdx(-1)
    onChange({ fullAddress: s.fullAddress, lat: s.lat, lng: s.lng, isManual: false })
    inputRef.current?.focus()
    setStatusMsg(`Selected: ${s.fullAddress}`)
  }, [onChange])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    // Clear confirmed value when typing
    if (value && !manualMode) onChange({ ...value, fullAddress: e.target.value, lat: undefined, lng: undefined })
  }, [value, manualMode, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIdx(i => {
          const next = Math.min(i + 1, suggestions.length - 1)
          listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx(i => {
          const prev = Math.max(i - 1, 0)
          listRef.current?.children[prev]?.scrollIntoView({ block: 'nearest' })
          return prev
        })
        break
      case 'Enter':
        e.preventDefault()
        if (activeIdx >= 0 && suggestions[activeIdx]) selectSuggestion(suggestions[activeIdx])
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setActiveIdx(-1)
        break
    }
  }, [open, activeIdx, suggestions, selectSuggestion])

  const handleBlur = useCallback(() => {
    if (ignoreNextBlur.current) { ignoreNextBlur.current = false; return }
    // Short delay so click on list item fires first
    setTimeout(() => setOpen(false), 150)
  }, [])

  const handleClear = useCallback(() => {
    setQuery('')
    setSuggestions([])
    setOpen(false)
    setActiveIdx(-1)
    onClear?.()
    inputRef.current?.focus()
    setStatusMsg('Address cleared')
  }, [onClear])

  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    onChange({ fullAddress: query.trim(), isManual: true })
    setStatusMsg(`Address saved: ${query.trim()}`)
  }, [query, onChange])

  const toggleManual = useCallback(() => {
    setManualMode(m => !m)
    setOpen(false)
    setSuggestions([])
    inputRef.current?.focus()
  }, [])

  const hasConfirmedLocation = !!(value?.fullAddress && (value.lat || value.isManual))
  const activeDescendant = activeIdx >= 0 ? `${listboxId}-item-${activeIdx}` : undefined

  return (
    <div className="addr-root">
      <style>{ADDR_CSS}</style>

      {/* ── Label row ────────────────────────────────────────────────── */}
      <div className="addr-label-row">
        <label
          htmlFor={inputId}
          className={`ob-label${required ? ' ob-label-required' : ''}`}
        >
          {label}
        </label>
        <button
          type="button"
          className="ob-btn-link addr-manual-toggle"
          onClick={toggleManual}
          aria-pressed={manualMode}
        >
          {manualMode ? 'Use autocomplete' : 'Enter manually'}
        </button>
      </div>

      {/* ── Combobox ─────────────────────────────────────────────────── */}
      <div className="addr-combobox-wrap">
        <div
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-owns={listboxId}
          aria-controls={listboxId}
          className="addr-combobox"
        >
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={`${statusId}${error ? ` addr-err-${uid}` : ''}`}
            className={`ob-input addr-input${error ? ' ob-input-error' : ''}`}
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
            onBlur={handleBlur}
          />
          {/* Loading spinner / clear button */}
          <div className="addr-input-adornment" aria-hidden="true">
            {loading && <span className="addr-spinner" aria-hidden="true" />}
            {!loading && query && (
              <button
                type="button"
                className="addr-clear-btn"
                tabIndex={-1}
                onMouseDown={() => { ignoreNextBlur.current = true }}
                onClick={handleClear}
                aria-label="Clear address"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Listbox ──────────────────────────────────────────────── */}
        {open && !manualMode && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={`Address suggestions for "${query}"`}
            className="addr-listbox"
            onMouseDown={() => { ignoreNextBlur.current = true }}
          >
            {suggestions.length === 0 && !loading && (
              <li role="option" aria-selected="false" className="addr-listbox-empty">
                <span aria-hidden="true">🔍</span> No matching addresses found
              </li>
            )}
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                id={`${listboxId}-item-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                className={`addr-option${i === activeIdx ? ' addr-option-active' : ''}`}
                onClick={() => selectSuggestion(s)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className="addr-option-icon" aria-hidden="true">📍</span>
                <span>
                  <span className="addr-option-label">{s.label}</span>
                  <span className="addr-option-full">{s.fullAddress}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Manual override form */}
      {manualMode && (
        <form className="addr-manual-form" onSubmit={handleManualSubmit} noValidate aria-label="Enter address manually">
          <p className="addr-manual-hint">
            Type your full address below and press <strong>Save</strong>.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="ob-btn ob-btn-primary"
              style={{ minHeight: '2.75rem', padding: '0.6rem 1.25rem' }}
              disabled={!query.trim()}
            >
              Save address
            </button>
          </div>
        </form>
      )}

      {/* Live status for screen readers */}
      <span
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMsg}
      </span>

      {/* Validation error */}
      {error && (
        <span id={`addr-err-${uid}`} className="ob-error" role="alert">{error}</span>
      )}

      {/* ── Map preview ──────────────────────────────────────────────── */}
      {hasConfirmedLocation && !value?.isManual && value?.lat && value?.lng && (
        <div className="addr-map-preview" role="region" aria-label="Map preview of selected address">
          <img
            src={staticMapUrl(value.lat, value.lng)}
            alt={`Map showing ${value.fullAddress}`}
            className="addr-map-img"
            loading="lazy"
          />
          <div className="addr-map-caption">
            <span aria-hidden="true">📍</span>
            <span>{value.fullAddress}</span>
          </div>
        </div>
      )}

      {hasConfirmedLocation && value?.isManual && (
        <div className="addr-manual-preview" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span> Address saved: <strong>{value.fullAddress}</strong>
          <p className="addr-manual-preview-note">Map preview unavailable for manually entered addresses.</p>
        </div>
      )}
    </div>
  )
}

// ─── Scoped CSS ─────────────────────────────────────────────────────────────────

const ADDR_CSS = `
/* Root */
.addr-root { display: grid; gap: 0.6rem; position: relative; }

/* Label row */
.addr-label-row { display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap; }
.addr-manual-toggle {
  font-size: 0.82rem; color: var(--accent); background: none; border: none; cursor: pointer;
  padding: 0; text-decoration: underline; margin-left: auto;
  min-height: 44px; display: inline-flex; align-items: center;
}
.addr-manual-toggle:hover { color: var(--accent-strong); }

/* Combobox wrapper */
.addr-combobox-wrap { position: relative; }
.addr-combobox { position: relative; }
.addr-input { padding-right: 2.75rem; }
.addr-input-adornment {
  position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
  display: flex; align-items: center; gap: 0.5rem; pointer-events: none;
}
.addr-clear-btn {
  pointer-events: auto; background: none; border: none; cursor: pointer;
  color: var(--muted); font-size: 0.9rem; padding: 0.25rem;
  border-radius: 4px; min-width: 44px; min-height: 44px;
  display: flex; align-items: center; justify-content: center;
  transition: color 120ms ease;
}
.addr-clear-btn:hover { color: var(--text); }

/* Spinner */
.addr-spinner {
  display: inline-block; width: 1rem; height: 1rem;
  border: 2px solid var(--border); border-top-color: var(--accent);
  border-radius: 50%; animation: addr-spin 0.7s linear infinite;
}
@keyframes addr-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .addr-spinner { animation: none; } }

/* Listbox */
.addr-listbox {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  z-index: 300;
  list-style: none; margin: 0; padding: 0.25rem;
  background: var(--surface-strong);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  max-height: 16rem; overflow-y: auto;
  overscroll-behavior: contain;
}
.addr-listbox-empty {
  padding: 0.875rem 1rem;
  font-size: 0.9rem; color: var(--muted);
  display: flex; align-items: center; gap: 0.5rem;
}
.addr-option {
  display: flex; align-items: flex-start; gap: 0.6rem;
  padding: 0.65rem 0.875rem;
  border-radius: calc(var(--radius-sm) - 2px);
  cursor: pointer;
  font-size: 0.9rem;
  min-height: 44px;
  transition: background 100ms ease;
}
.addr-option:hover,
.addr-option-active { background: var(--surface-soft); }
.addr-option-active { outline: 2px solid rgba(94, 234, 212, 0.4); outline-offset: -2px; }
.addr-option-icon { margin-top: 0.1rem; flex-shrink: 0; font-size: 1rem; }
.addr-option-label { display: block; font-weight: 600; color: var(--text); }
.addr-option-full { display: block; font-size: 0.82rem; color: var(--muted); margin-top: 0.1rem; }

/* Manual form */
.addr-manual-form { display: grid; gap: 0.75rem; }
.addr-manual-hint { margin: 0; font-size: 0.88rem; color: var(--muted); }

/* Map preview */
.addr-map-preview {
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface-soft);
}
.addr-map-img {
  display: block; width: 100%; max-height: 180px; object-fit: cover;
}
.addr-map-caption {
  display: flex; align-items: flex-start; gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem; color: var(--muted);
}

/* Manual preview */
.addr-manual-preview {
  display: flex; flex-direction: column; gap: 0.25rem;
  padding: 0.75rem 1rem;
  background: var(--success-soft);
  border: 1px solid rgba(52, 211, 153, 0.35);
  border-radius: var(--radius-sm);
  font-size: 0.9rem; color: var(--text);
}
.addr-manual-preview-note {
  margin: 0.25rem 0 0; font-size: 0.82rem; color: var(--muted);
}
`
