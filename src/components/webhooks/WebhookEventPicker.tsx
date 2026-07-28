import { useId, useState, useMemo, useRef, useEffect } from 'react'
import { WEBHOOK_EVENT_GROUPS } from './webhookTypes'

interface WebhookEventPickerProps {
  selected: string[]
  onChange: (selected: string[]) => void
  /** Error message to display (e.g. "Select at least one event") */
  error?: string
}

/**
 * Searchable, grouped event picker for webhook subscriptions.
 *
 * Accessibility:
 * - Each group is a `<fieldset>` with a `<legend>`
 * - Each event is a labelled checkbox
 * - Screen-reader announcements via `aria-live` region
 * - Full keyboard navigation (Tab / Shift+Tab)
 * - Search input has clear button
 *
 * Responsive:
 * - Single-column on mobile, wraps to wider layout on tablet+
 */
export default function WebhookEventPicker({
  selected,
  onChange,
  error,
}: WebhookEventPickerProps) {
  const searchId = useId()
  const liveRegionId = useId()
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const checkboxRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // Flatten filtered events with group info for keyboard nav
  const filteredFlat = useMemo(() => {
    const q = search.toLowerCase().trim()
    return WEBHOOK_EVENT_GROUPS.flatMap((group) =>
      group.events
        .filter(
          (ev) =>
            !q ||
            ev.label.toLowerCase().includes(q) ||
            ev.id.toLowerCase().includes(q) ||
            group.label.toLowerCase().includes(q),
        )
        .map((ev) => ({ group, event: ev })),
    )
  }, [search])

  // Group filtered results
  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim()
    return WEBHOOK_EVENT_GROUPS.map((group) => {
      const matchingEvents = group.events.filter(
        (ev) =>
          !q ||
          ev.label.toLowerCase().includes(q) ||
          ev.id.toLowerCase().includes(q) ||
          group.label.toLowerCase().includes(q),
      )
      return { ...group, events: matchingEvents }
    }).filter((g) => g.events.length > 0)
  }, [search])

  function toggleEvent(eventId: string) {
    if (selected.includes(eventId)) {
      onChange(selected.filter((id) => id !== eventId))
    } else {
      onChange([...selected, eventId])
    }
  }

  function toggleGroup(groupId: string) {
    const group = WEBHOOK_EVENT_GROUPS.find((g) => g.id === groupId)
    if (!group) return
    const groupIds = group.events.map((e) => e.id)
    const allSelected = groupIds.every((id) => selected.includes(id))
    if (allSelected) {
      onChange(selected.filter((id) => !groupIds.includes(id)))
    } else {
      const toAdd = groupIds.filter((id) => !selected.includes(id))
      onChange([...selected, ...toAdd])
    }
  }

  const selectedCount = selected.length
  const totalCount = WEBHOOK_EVENT_GROUPS.reduce(
    (sum, g) => sum + g.events.length,
    0,
  )

  // Keyboard navigation within the filtered list
  function handleKeyDown(e: React.KeyboardEvent) {
    if (filteredFlat.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) =>
        prev < filteredFlat.length - 1 ? prev + 1 : 0,
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredFlat.length - 1,
      )
    }
  }

  // Focus the checkbox at the current focusedIndex using a stable key map
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < filteredFlat.length) {
      const eventId = filteredFlat[focusedIndex].event.id
      const el = checkboxRefs.current.get(eventId)
      el?.focus()
    }
  }, [focusedIndex, filteredFlat])

  // Reset focusedIndex when search changes
  useEffect(() => {
    setFocusedIndex(-1)
  }, [search])

  // Register a checkbox ref by event ID
  function registerRef(eventId: string, el: HTMLInputElement | null) {
    if (el) {
      checkboxRefs.current.set(eventId, el)
    } else {
      checkboxRefs.current.delete(eventId)
    }
  }

  return (
    <fieldset
      style={{
        border: 0,
        padding: 0,
        margin: 0,
        display: 'grid',
        gap: '0.85rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <legend
          style={{
            padding: 0,
            fontWeight: 800,
            fontSize: 'var(--text-md)',
            color: 'var(--text)',
          }}
        >
          Event subscriptions
        </legend>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--muted)',
            fontWeight: 600,
          }}
        >
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            fontSize: '0.85rem',
            pointerEvents: 'none',
          }}
        >
          &#x2315;
        </span>
        <input
          ref={searchInputRef}
          id={searchId}
          type="search"
          className="auth-input"
          placeholder="Search events…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          aria-label="Search webhook events"
          aria-controls={liveRegionId}
          style={{ paddingLeft: '2.25rem' }}
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              searchInputRef.current?.focus()
            }}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '0.3rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span aria-hidden="true">&#x2715;</span>
          </button>
        )}
      </div>

      {/* Live region for screen readers */}
      <div
        id={liveRegionId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {filteredFlat.length === 0
          ? 'No events match your search.'
          : `${filteredFlat.length} event${filteredFlat.length === 1 ? '' : 's'} match${filteredFlat.length === 1 ? 'es' : ''} your search.`}
      </div>

      {/* Grouped event list */}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          maxHeight: '18rem',
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem',
          background: 'rgba(15, 23, 42, 0.45)',
        }}
        role="group"
        aria-label="Event subscription options"
      >
        {filteredGroups.length === 0 ? (
          <p
            style={{
              color: 'var(--muted)',
              textAlign: 'center',
              padding: '1.5rem 0',
              margin: 0,
              fontSize: 'var(--text-sm)',
            }}
          >
            No events found for "{search}"
          </p>
        ) : (
          filteredGroups.map((group) => {
            const allSelected = group.events.every((ev) =>
              selected.includes(ev.id),
            )
            const someSelected = group.events.some((ev) =>
              selected.includes(ev.id),
            )

            return (
              <div
                key={group.id}
                style={{
                  display: 'grid',
                  gap: '0.4rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {group.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: allSelected ? 'var(--accent)' : 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      minHeight: 32,
                      whiteSpace: 'nowrap',
                    }}
                    aria-label={`${allSelected ? 'Deselect all' : 'Select all'} ${group.label} events`}
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: '0.3rem',
                    paddingLeft: '0.25rem',
                    borderLeft: someSelected
                      ? '2px solid var(--accent)'
                      : '2px solid var(--border)',
                  }}
                >
                  {group.events.map((ev) => {
                    const checked = selected.includes(ev.id)

                    return (
                      <label
                        key={ev.id}
                        className="webhook-event-label"
                        style={{
                          display: 'flex',
                          gap: '0.65rem',
                          alignItems: 'flex-start',
                          padding: '0.55rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: checked
                            ? 'rgba(94, 234, 212, 0.08)'
                            : 'transparent',
                          border: checked
                            ? '1px solid rgba(94, 234, 212, 0.2)'
                            : '1px solid transparent',
                          transition:
                            'background-color 120ms ease, border-color 120ms ease',
                        }}
                      >
                        <input
                          ref={(el) => registerRef(ev.id, el)}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEvent(ev.id)}
                          aria-label={`${ev.label}${ev.description ? `: ${ev.description}` : ''}`}
                          style={{
                            width: 16,
                            height: 16,
                            marginTop: '0.15rem',
                            flexShrink: 0,
                            accentColor: 'var(--accent)',
                          }}
                        />
                        <span
                          style={{ display: 'grid', gap: '0.15rem', minWidth: 0 }}
                        >
                          <span
                            style={{
                              color: 'var(--text)',
                              fontWeight: 600,
                              fontSize: 'var(--text-sm)',
                            }}
                          >
                            {ev.label}
                          </span>
                          {ev.description && (
                            <span
                              style={{
                                color: 'var(--muted)',
                                fontSize: 'var(--text-xs)',
                                lineHeight: 1.4,
                              }}
                            >
                              {ev.description}
                            </span>
                          )}
                        </span>
                        <code
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--muted)',
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            background: 'var(--surface-soft)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: 4,
                            marginLeft: 'auto',
                            whiteSpace: 'nowrap',
                            alignSelf: 'center',
                          }}
                        >
                          {ev.id}
                        </code>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          style={{
            color: '#ffd7dd',
            background: 'var(--danger-soft)',
            border: '1px solid rgba(251, 113, 133, 0.35)',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}
    </fieldset>
  )
}
