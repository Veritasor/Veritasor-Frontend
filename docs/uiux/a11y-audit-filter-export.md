# Accessibility Audit Panel — Severity Filters and CSV Export

**Component:** `src/components/a11y/A11yAuditPanel.tsx`, `src/components/a11y/a11yCsv.ts`
**Tab:** `a11y-audit` (registered in `src/pages/Settings.tsx`)
**Standard:** WCAG 2.1 AA · Color-independent · Responsive · URL-persistent
**Added:** 2026-07-28

---

## Overview

The **Accessibility** tab inside `Settings` renders an internal triage surface
for WCAG findings (axe-core-compatible). It lists every detected issue in a
single, filterable table and supports:

- **Severity chip filters** for the four axe-core impact bands (critical,
  serious, moderate, minor). Multiple severities may be active at once.
- **Free-text search** that matches against rule id, selector, description,
  WCAG criterion, and document title.
- **URL persistence** so a triage view can be shared by pasting a link.
- **CSV export** of the currently visible (filtered) issues for handoff to
  engineers. The CSV always includes the spec-required fields
  (**severity**, **rule**, **selector**) plus description, fix suggestion,
  WCAG criterion, element, documentation URL, document title, and detection
  timestamp.

The component is intentionally **internal**. It is not rendered to end users
of the attestation dashboard — only to authenticated team members performing
a11y triage.

---

## Severity model

Severity levels are ordered critical → serious → moderate → minor, matching
the [axe-core impact ranking](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.mdx).
Each severity uses **three independent channels** to be informative in
monochrome print and to assistive tech:

| Severity | Glyph | Border colour | aria-label | Sort order |
|---|---|---|---|---|
| critical | `!` | `--danger`  | `Critical severity — blocking access`     | 0 |
| serious  | `⚠` | `--warning` | `Serious severity — major barrier`       | 1 |
| moderate | `◐` | `--accent`  | `Moderate severity — notable barrier`    | 2 |
| minor    | `·` | `--muted`   | `Minor severity — inconvenience`         | 3 |

The chip group never relies on colour alone — each chip carries:

1. The Unicode glyph (`!`, `⚠`, `◐`, `·`)
2. The English word ("Critical", "Serious", "Moderate", "Minor")
3. A count badge (live count of fixture issues with that severity)

`aria-label` on each chip reads `"{ariaLabel} — {count} {issues}"` so
screen-reader users hear both the verbose severity descriptor and the
resulting scope.

---

## URL contract

The filter state is reflected in the URL via `useSearchParams` (no
session-storage or local-storage fallback — sharing by URL is the documented
flow, matching the `SearchFilter` pattern used by the audit log and
attestations list).

| Param        | Value                              | Example                              |
|--------------|------------------------------------|--------------------------------------|
| `severity`   | comma-separated sev list, sorted   | `?severity=critical,serious`         |
| `q`          | free-text search                   | `?q=color-contrast`                  |

Notes:

- Unknown severity values in the URL are dropped silently (so a stale link
  cannot crash the page).
- An empty `severity` param (`?severity=`) is treated as "all severities".
- `SEVERITY_ORDER` is enforced on emit so the URL stays canonical
  (critical → minor).

The chip group uses `aria-pressed` for state so screen readers can
distinguish active from inactive.

---

## Filter UI

### Chip row

```
[ All (12) ]  [ ! Critical 4 ]  [ ⚠ Serious 3 ]  [ ◐ Moderate 3 ]  [ · Minor 2 ]   [ Clear all ]
        ↳ all chips are buttons with aria-pressed, focus-visible ring, 2.5rem min-height
```

The "All" pseudo-chip is active when no severity is in the URL. Clicking it
clears the severity param and shows every fixture row.

### Search

A labelled `<input type="search">` filters the visible rows in real time.
The matcher (`matchesQuery`) is case-insensitive and trims whitespace. It
searches across rule id, rule name, WCAG criterion, selector, description,
and document title.

### Result count

A `role="status" aria-live="polite"` region announces the current
`"Showing N of M accessibility issues"` after every chip toggle, search
edit, or page mount. The same text is rendered visibly.

### Empty state

When the filter narrows to zero rows, the table is replaced with a dashed
empty-state panel that also carries `role="status"` and a `aria-live="polite"`
announcement. The export button is disabled when there are no issues to
export.

---

## ARIA structure

```html
<section aria-labelledby="a11y-audit-title">
  <header>
    <h2 id="a11y-audit-title">Accessibility audit</h2>
    <p>Triage WCAG findings across the dashboard. …</p>
    <button aria-label="Export N issues as CSV">Export CSV</button>
  </header>

  <div role="group" aria-label="Filter by severity">
    <button aria-pressed="true" aria-label="All severities — N issues">All (N)</button>
    <button aria-pressed="false" aria-label="Critical severity — N issues">! Critical (N)</button>
    …
  </div>

  <label for="a11y-search-input">Search</label>
  <input id="a11y-search-input" type="search" aria-label="Search accessibility issues" />

  <table role="grid" aria-label="Accessibility issues" aria-describedby="result-count-id">
    <caption class="sr-only">Accessibility issues matching the current filter. …</caption>
    <thead>
      <tr>
        <th scope="col">Severity</th>
        <th scope="col">Rule</th>
        <th scope="col">WCAG</th>
        <th scope="col">Selector</th>
        <th scope="col">Description</th>
        <th scope="col"><span class="sr-only">Actions</span></th>
      </tr>
    </thead>
    <tbody>...</tbody>
  </table>

  <p id="result-count-id" role="status" aria-live="polite" aria-atomic="true">
    Showing N of M accessibility issues
  </p>
</section>
```

### Severity badge in rows

Each table row's first cell carries a bordered pill with the severity
glyph + label and an `aria-label` reading the verbose severity descriptor:

```html
<td>
  <span aria-label="Critical severity — blocking access">
    <span aria-hidden="true">!</span>
    <span>Critical</span>
  </span>
</td>
```

This means assistive tech reads severity twice (once on the chip, once on
the row badge) — slightly verbose but unambiguous.

---

## CSV export

### Format

RFC 4180 with a UTF-8 BOM prepended so Excel auto-detects encoding on
double-click.

```
severity,rule_id,rule_name,wcag,selector,description,fix_suggestion,element,url,document_title,detected_at
critical,image-alt,Images must have alternative text,1.1.1,"#hero-illustration > img","An image is marked decorative …",Provide an `alt` attribute …,<img src="/hero.svg" alt="">"",https://dequeuniversity.com/rules/axe/4.7/image-alt,Landing page,2026-07-22T09:14:00Z
…
```

#### Columns (ordered for triage utility — severity first)

| Column            | Required | Description                                              |
|-------------------|:--------:|----------------------------------------------------------|
| `severity`        | ✓        | One of `critical`, `serious`, `moderate`, `minor`         |
| `rule_id`         | ✓        | axe-core rule id, e.g. `color-contrast`                  |
| `rule_name`       |          | Human-readable rule name                                 |
| `wcag`            |          | WCAG success criterion, e.g. `1.4.3`                      |
| `selector`        | ✓        | The full DOM selector for the offending node             |
| `description`     |          | Why this fails                                           |
| `fix_suggestion`  |          | Concrete remediation guidance                            |
| `element`         |          | Snippet of the offending HTML (optional)                 |
| `url`             |          | Documentation URL for the rule                           |
| `document_title`  |          | Page where the issue was detected                        |
| `detected_at`     |          | ISO 8601 timestamp                                       |

#### Escape rules

- Fields containing `,`, `"`, `\n`, or `\r` are wrapped in `"…"`.
- Inner `"` are doubled (`""`).
- Line terminator is CRLF (`\r\n`) per RFC 4180.
- Output is sorted so critical rows appear before serious, before moderate,
  before minor — matching the on-screen severity ordering.

#### Filename

```
veritasor-a11y-issues-YYYY-MM-DDTHH-MM-SS.csv
```

The stamp is derived from the moment the user clicks Export, and uses
the local time of the browser. The dump is per-click, not per-filter — the
filename reflects when the export was generated, not what filter was
applied.

### Download mechanics

```
1. buildIssuesCsv(issues) → string
2. new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
3. URL.createObjectURL(blob) → url
4. <a href={url} download={filename}> injected into document.body
5. anchor.click() — triggers the browser download
6. anchor removed; URL.revokeObjectURL(url) deferred via setTimeout(0)
```

Step 1 happens **synchronously** so the URL state update (`?severity=…`)
applied by the chip toggle can be flushed in the same React commit
(`flushSync` is unnecessary because `setSearchParams` already commits
synchronously in React 18 inside the click handler).

### Download-injection for tests

The DOM-touching steps (anchor creation, body append/remove, click) accept a
`DownloadDeps` object so unit tests run in jsdom without polluting
`window.URL` or `document.body` globals. The default helper
`defaultDeps()` reads them from `window`/`document` for production use.

---

## Accessibility (WCAG 2.1 AA)

| Concern | Implementation |
|---|---|
| Severity semantics | Each chip and row badge carries `aria-label` describing the verbose severity |
| Chip group landmark | `<div role="group" aria-label="Filter by severity">` |
| State semantics | Each chip uses `aria-pressed="true|false"` (single-radiogroup analogue for multi-select) |
| Search semantics | `<label for="a11y-search-input">` + `aria-label="Search accessibility issues"` |
| Result count semantics | `<p role="status" aria-live="polite" aria-atomic="true">` |
| Empty state semantics | Empty-state panel carries `role="status"` and announces the zero-result outcome |
| Color independence | Glyph + label + count + border colour for every severity state |
| Table semantics | `role="grid"`, `<caption>` (sr-only), `<th scope="col">` per column |
| Hyperlink context | Row documentation link tagged with `(opens in a new tab)` aria-label |
| Keyboard | All chips, search input, and export button are native `<button>`/`<input>` so Tab/Shift-Tab/Enter/Space are inherited |
| Focus visibility | Buttons inherit the project's `--focus-ring` token |
| Motion | Reduced-motion preference is supported — chips use a 140 ms background transition which resolves to 0 ms under `prefers-reduced-motion: reduce` (the global `index.css` rule already covers this) |
| Touch target | All chips + button have `min-height: 2.5rem` (matches the project's 44 px / 40 px touch-target tokens) |

---

## Responsive design

| Viewport | Behaviour |
|---|---|
| ≤ 768 px | Chip row wraps; "Clear all" jumps below the row |
| ≤ 480 px | Selector column truncates to 60 chars and wraps inside a `word-break: break-all` block; table scrolls horizontally inside its bordered wrapper |
| ≥ 1024 px | Full six-column table renders without truncation |

The export button stays accessible in the header at every breakpoint.

---

## Axe-audit checklist

- [ ] No violation of `color-contrast` for the chip border tokens (all borders meet 3:1)
- [ ] Severity glyphs verified monochrome-safe
- [ ] `aria-pressed` toggles on Space + Enter on each chip
- [ ] `aria-live="polite"` result count announces after every filter edit
- [ ] Empty state is announced ("No accessibility issues match the current filter…")
- [ ] Table `role="grid"` + `<caption>` + `<th scope="col">` all present
- [ ] Documentation links tagged with explicit off-domain / new-tab aria-label

---

## Files

| File | Purpose |
|---|---|
| `src/components/a11y/a11yAuditData.ts`                  | Types (`A11ySeverity`, `A11yIssue`), `SEVERITY_META`, `SEVERITY_ORDER`, mock fixtures, `filterBySeverities`, `matchesQuery` |
| `src/components/a11y/a11yCsv.ts`                        | `buildIssuesCsv`, `escapeCsvField`, `issuesCsvFilename`, `downloadIssuesCsv` (RFC 4180 + UTF-8 BOM) |
| `src/components/a11y/A11yAuditPanel.tsx`                | Main panel (header, chips, search, table, export button, live region) |
| `src/components/a11y/A11yAuditPanel.test.tsx`           | Component + CSV tests (vitest, jsdom) |
| `src/pages/Settings.tsx`                                | Tab registration (`a11y-audit` → `<A11yAuditPanel />`) |
| `vite.config.ts`                                        | Adds `src/components/a11y/A11yAuditPanel.tsx` to coverage include (95 % threshold) |
| `docs/uiux/a11y-audit-filter-export.md`                 | This document |

---

## CSV triage workflow

```
Triage session:
  1. Open Settings → Accessibility
  2. Click [Critical] chip       → URL updates, table narrows
  3. Review the rows (~5 mins)
  4. Click "Export CSV"          → file `veritasor-a11y-issues-…csv` downloaded
  5. Open in Excel / Sheets       → sort by `severity` (already sorted) or `document_title`
  6. Paste URL back into Slack    → https://app/settings/a11y-audit?severity=critical
                                  reopen the same view tomorrow
```

---

## Revision notes

- `2026-07-28`: Initial implementation — chips, search, URL persistence, CSV export.
