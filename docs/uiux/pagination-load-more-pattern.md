# Pagination & Load-More Pattern

## References

- Issue: `#195`
- Component: `src/components/Pagination.tsx`
- Hooks: `src/hooks/usePagination.ts`, `src/hooks/useIsMobile.ts`
- Applied to: `src/pages/Attestations.tsx`

## Goal

Provide one unified pattern for paging through long lists that works the same
way everywhere it's used: numbered pages with a page-size selector on
dense/desktop screens, and a single progressive "Load more" control on
mobile — both driven by the same URL state, so a link to page 3 works
regardless of which variant the recipient's viewport renders.

## Why a single `page`/`pageSize` state for both variants

Numbered pagination shows a *window* of items (`items[(page-1)*pageSize .. page*pageSize]`).
Progressive loading shows a *cumulative* range (`items[0 .. page*pageSize]`).
Both variants are defined here as different ways of **displaying** the same
`page`/`pageSize` pair rather than two independent state machines:

- Numbered variant renders `pagination.startIndex .. pagination.endIndex`.
- Progressive variant renders `0 .. pagination.cumulativeEndIndex`.

This means resizing from desktop (say, viewing page 3 of 10-per-page — items
21–30) down to mobile doesn't lose your place: the progressive view shows
items 1–30, i.e. "everything up to and including where you were." Widening
back out returns you to the same page-3 window. One `usePagination` call, one
URL contract, two renderings.

## URL contract

```
?page=<1-based integer>     numbered: which page window is shown
                             progressive: how many pages have been loaded so far
?pageSize=<integer>         items per page — must be one of pageSizeOptions
                             (default [10, 25, 50])
```

- Both params default silently (`page=1`, `pageSize=`defaultPageSize) when
  absent, non-numeric, fractional, negative, or — for `pageSize` — not one of
  the allowed options. A hand-edited or stale URL never throws or shows a
  broken page.
- If `?page` ends up beyond the last valid page (e.g. a filtered list shrank),
  `usePagination` corrects the URL back to the last valid page via
  `replace: true` — it does not push a new history entry, matching the
  existing convention in `SearchFilter.tsx`'s `setParam`.
- Changing `pageSize` resets `page` to `1`, since the previous page number no
  longer points at the same window of items.

## Desktop/dense: numbered variant

- `<nav aria-label="Pagination">` with Previous/Next buttons and a windowed
  list of page-number buttons (first, last, current ± 1 sibling, `…` for
  gaps — see `getPageWindow` in `Pagination.tsx`). Below 8 total pages the
  full sequential list is shown with no gaps at all.
- The current page button carries `aria-current="page"` (no separate visible
  "current" text needed — same approach as `Breadcrumb.tsx`).
- An "Items per page" `<select>` (native, labelled via `<label htmlFor>`)
  lets users pick 10/25/50 per page.

## Mobile: progressive "Load more"

- A single centered "Load more" button appends the next page's worth of
  items to the list already on screen.
- Disappears once every item has been loaded — no page-size selector on
  mobile (manual page-size tuning isn't a mobile-tap-target-friendly control;
  users just tap Load more).
- The switch between variants is **JS-driven** (`useIsMobile`, a
  `matchMedia('(max-width: 640px)')` hook mirroring `useTheme.ts`'s
  subscribe/`addEventListener` pattern), not CSS-only. Unlike a control
  toggle (e.g. `Settings.tsx`'s tablist ↔ mobile-`<select>` swap), pagination
  also changes *which items are in the DOM* (a page window vs. a cumulative
  slice) — mounting both variants and hiding one with CSS would mean
  rendering the row list twice. Using one hook to decide both "which items"
  and "which controls" keeps the two perfectly in sync and avoids a
  double-mounted list.

## Accessibility (WCAG 2.1 AA)

- **Live announcements** — a single `role="status" aria-live="polite"
  aria-atomic="true"` element is always mounted (never conditionally
  rendered, so screen readers pick up the very first update) and reads:
  - `"Showing all N {items}"` — everything fits on one page/load.
  - `"Showing {start}–{end} of {total} {items}"` — numbered variant, page > 1.
  - `"Showing {count} of {total} {items}"` — progressive variant, more to load.
  - `"No {items}"` — zero items.
  Polite, not assertive — paging is not an urgent interruption (WCAG 4.1.3).
- **Keyboard/native semantics** — Previous/Next/page-number/Load-more are all
  native `<button type="button">`; boundary buttons use the `disabled`
  attribute (removed from tab order) rather than `aria-disabled`, per the
  project's existing disabled-state rule.
- **Ellipsis markers** are `aria-hidden="true"` — they're a visual gap
  indicator only; no information is lost by skipping them (same reasoning as
  `Breadcrumb.tsx`'s `aria-hidden` separator).
- **Touch targets** — nav/page buttons and the Load-more button use
  `min-height/min-width: var(--density-touch-min)` (44px, WCAG 2.5.5).
- **Focus** — relies on the global `:focus-visible` ring. Fixed as part of
  this change: `--focus-ring`/`--focus-ring-offset` were referenced by the
  global `:focus-visible` rule in `index.css` but were never defined in
  `:root`, so **no element in the app had a visible keyboard focus ring**.
  Added the values already specified in `docs/accessibility-checklist.md`.

## Responsive

- Breakpoint: `max-width: 640px`, matching the existing mobile cutoff used
  elsewhere in `index.css`.
- All spacing uses density tokens (`--density-*`), so both variants respect
  comfortable/compact density mode.
- The page-size selector wraps to full width and centers under 640px in case
  it's ever shown there (`showPageSizeSelector` defaults to hidden-by-variant
  already, this is just a defensive style for a future call site).

## RTL

- No hardcoded directional CSS — `margin-inline-start` is used for the
  page-size control's alignment, and the Prev/Next chevrons (`‹`/`›`) are
  purely decorative (`aria-hidden`) glyphs read from the accessible
  "Previous page"/"Next page" labels, not the visible glyph, so no mirroring
  logic is required. Verified conceptually against
  `docs/uiux/localization-layout-constraints.md`; no automated RTL screenshot
  tooling exists in this repo to attach a rendered before/after (see
  Screenshots below).

## Edge cases

- **Single page** (`totalItems <= pageSize`) — no Prev/Next/page-numbers or
  Load-more button render at all; only the "Showing all N" announcement.
- **Zero items** — announces "No {items}"; pages that already have their own
  empty state (e.g. `Attestations.tsx`'s `EmptyState`) render that instead of
  `<Pagination>` and never mount it.
- **Very many pages** — `getPageWindow` collapses to `1 … 4 5 6 … 50`-style
  windowing once there are more than 7 pages; first and last page are always
  reachable in one click.
- **Out-of-range `?page`** (e.g. a bookmarked link to page 40 after the list
  shrank to 12 pages) — silently clamped back to the last valid page.
- **Mobile** — see "Mobile: progressive Load more" above.

## Validation checklist

- `npm run lint` — no new errors (the one warning `Pagination.tsx` produces,
  `react-refresh/only-export-components` for exporting `getPageWindow`
  alongside the component, is the same pre-existing warning `SearchFilter.tsx`
  already has for `parseFilterState`).
- `npx tsc --noEmit` — introduces zero new type errors (see PR description for
  the pre-existing, unrelated errors this repo already has on `main`).
- Tests: `src/test/pagination.test.tsx` (hook + component, 36 cases, 100%
  statement/branch/function/line coverage on `Pagination.tsx`,
  `usePagination.ts`, and `useIsMobile.ts`) plus new/updated cases in
  `src/pages/Attestations.test.tsx`.
- Keyboard: Tab to Prev → Tab through page numbers → Tab to Next → Tab to the
  page-size select; Enter/Space activates each button; disabled boundary
  buttons are skipped automatically.
- Screen reader: confirm the "Showing X–Y of Z" text is announced once,
  politely, after each page change (not on every keystroke/render).

## Screenshots

> _Before/after and axe screenshots to be attached in the PR_
> (`docs/uiux/screenshots/pagination-*.png`), following the same convention
> as `docs/uiux/data-export-download-ux.md`. This change was authored and
> validated in a non-graphical environment (no browser available to capture
> screenshots); a reviewer with a running dev server should attach:
> 1. Desktop numbered view (~24 mock attestations, page 1 of 3).
> 2. Mobile progressive view with the Load more button.
> 3. An axe DevTools scan of both, run after the focus-ring fix above.
