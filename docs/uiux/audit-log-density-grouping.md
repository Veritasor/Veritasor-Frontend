# Audit Log Density-Controlled Grouping

## Overview

The audit log timeline renders workspace activity entries with density-aware grouping. When the user switches to **Compact** density mode (via the `DensityToggle` component), entries are grouped by calendar day and identical consecutive events are collapsed into a summary badge showing `N events`.

## Behaviour

### Comfortable Density (default)

Each audit log entry renders individually with:
- Time badge (e.g. `08:12 AM`)
- Event name (bold)
- Optional details text (muted)

### Compact Density

1. **Day grouping**: Entries are grouped under `<h3>` day headings (e.g. "July 28, 2026") within `<section>` elements.
2. **Burst collapsing**: Consecutive entries with the same event type are collapsed when the count meets or exceeds a configurable threshold (default: 3). Each burst renders as a summary row with:
   - A count badge (`<span>` with `aria-label="N events"`)
   - The event name
   - A time range (`08:12 AM – 08:15 AM`)
3. **Below-threshold bursts** render as individual entries.

## Accessibility (WCAG 2.1 AA)

| Concern | Implementation |
| --- | --- |
| Semantic structure | `<section>` elements group each day; `<h3>` headings provide hierarchy |
| Log landmark | Container uses `role="log"` with `aria-label="Audit log timeline"` |
| Live updates | `aria-live="polite"` announces dynamic content changes |
| Screen reader labels | Burst badges include `aria-label="N events"` for clarity |
| List semantics | Day groups use `<ul>` / `<li role="listitem">` for proper list announcement |
| Keyboard navigation | All interactive elements are natively focusable; tab list uses arrow-key handling |
| Focus styles | Custom focus ring via CSS `var(--focus-ring)` |
| Contrast | All text meets 4.5:1 minimum contrast ratio against `--surface-strong` and `--surface-soft` backgrounds |
| Touch targets | Minimum 44px in compact mode (WCAG 2.1 AA) |

## Responsive Design

- The timeline uses fluid layouts with CSS custom property tokens (`--density-padding`, `--density-row-gap`)
- Day sections stack vertically and scroll horizontally on narrow viewports
- Burst summary rows wrap gracefully at small breakpoints

## API

### Props

```tsx
interface AuditLogTimelineProps {
  entries: AuditLogEntry[]
  burstThreshold?: number  // default: 3
}

interface AuditLogEntry {
  id: string
  timestamp: string        // ISO 8601
  event: string
  details?: string
}
```

### Density Integration

`AuditLogTimeline` uses the `useDensityMode` hook internally. It reads density from
`localStorage` keyed to `veritasor_density_{workspace}`. The grouping behaviour is
automatically applied when density switches — no page reload required.

## Example Usage

```tsx
import AuditLogTimeline from '../components/audit-log/AuditLogTimeline'

<AuditLogTimeline entries={entries} burstThreshold={3} />
```

## Files

| File | Purpose |
| --- | --- |
| `src/components/audit-log/AuditLogTimeline.tsx` | Main component |
| `src/components/audit-log/AuditLogTimeline.test.tsx` | Unit tests |
| `src/pages/Settings.tsx` | Tab panel integration |
| `docs/uiux/audit-log-density-grouping.md` | This document |