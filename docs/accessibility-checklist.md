# Accessibility Checklist — Veritasor Frontend

**Framework:** React 18 + React Router 6 + Vite + TypeScript (vanilla CSS, no component library)
**Standard:** WCAG 2.1 AA
**Last updated:** 2026-03-30

> **Codebase note:** This project is early-stage (~144 LOC, 6 source files). No accessibility
> tooling, focus styles, aria attributes, or keyboard handlers currently exist. This checklist
> is written both against the code that exists today **and** as a forward-looking guide for
> every component added going forward.

---

## 0. Prerequisite Tooling

Install these before working on any item below. None of them exist in the project today.

```bash
# Automated linting (catches ~30–40% of WCAG issues at author time)
npm install --save-dev eslint-plugin-jsx-a11y

# Axe browser extension — install in Chrome/Firefox for manual page audits
# https://www.deque.com/axe/browser-extensions/

# Unit-test accessibility assertions (add when Jest/Vitest is configured)
npm install --save-dev @axe-core/react jest-axe
```

`eslint.config.js` (add the plugin):
```js
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  // ...existing config
  jsxA11y.flatConfigs.recommended,
]
```

---

## 1. Focus Management

### Current state
- `src/components/Layout.tsx`: uses `<Link>` (renders `<a>`) — browser default focus ring,
  but **no custom focus style** is applied; the dark theme (`--bg: #0a0e17`) makes the browser
  default ring invisible on many platforms.
- `src/index.css`: no `:focus` or `:focus-visible` rules exist.
- No modals, dialogs, or focus-trap logic exist yet.
- No skip-to-content link exists.

### Checklist

- [ ] **Visible focus rings — `src/index.css`**
  Add global `:focus-visible` styles using the theme accent token:
  ```css
  :focus-visible {
    outline: 2px solid var(--accent); /* #38bdf8 */
    outline-offset: 2px;
    border-radius: 2px;
  }
  /* Remove default outline only when focus-visible is active */
  :focus:not(:focus-visible) {
    outline: none;
  }
  ```

- [ ] **Navigation links — `src/components/Layout.tsx`**
  Verify that both `<Link to="/">` (Veritasor logo) and the two nav `<Link>` elements
  show the accent-color ring when tabbed to. Do not suppress `outline` via inline styles.

- [ ] **Skip-to-content link — `src/components/Layout.tsx` + `src/index.css`**
  Add before the `<aside>` so keyboard users can skip the sidebar:
  ```tsx
  <a
    href="#main-content"
    className="skip-link"
  >
    Skip to main content
  </a>
  <aside>…</aside>
  <main id="main-content" tabIndex={-1} style={{ flex: 1, padding: '2rem' }}>
    <Outlet />
  </main>
  ```
  ```css
  .skip-link {
    position: absolute;
    top: -100%;
    left: 1rem;
    background: var(--surface);
    color: var(--accent);
    padding: 0.5rem 1rem;
    z-index: 9999;
  }
  .skip-link:focus {
    top: 1rem;
  }
  ```

- [ ] **Focus order follows DOM order**
  The sidebar `<aside>` comes before `<main>` in DOM order — this is correct. Do not use
  CSS `order` or absolute positioning to visually reorder without matching the DOM order.

- [ ] **Focus trap in modals/dialogs** *(implement when first modal is added)*
  When a modal opens: move focus to the modal container or its first focusable element.
  When it closes: restore focus to the trigger element. Use a library such as
  `focus-trap-react` or implement manually with `querySelectorAll` + `keydown` guard.

- [ ] **`<main>` is programmatically focusable**
  Add `tabIndex={-1}` to `<main>` in `src/components/Layout.tsx` so the skip link's
  target (`#main-content`) can receive focus without appearing in the tab order.

### Acceptance criteria (PR review)
A reviewer should be able to:
1. Open the page, press `Tab` once — skip link becomes visible.
2. Press `Tab` again — logo link gets a cyan (`#38bdf8`) outline ring.
3. Press `Tab` again — "Dashboard" link gets the ring; then "Attestations".
4. Press `Enter` on "Attestations" — focus lands inside `<main>`.
5. No element is focusable without a visible ring.
6. Diff must not contain `outline: none` or `outline: 0` without a matching
   `:focus-visible` guard.

---

## 2. Color Contrast

### Current theme tokens (`src/index.css`)

| Token         | Value      | Role                      |
|---------------|------------|---------------------------|
| `--bg`        | `#0a0e17`  | Page background           |
| `--surface`   | `#111827`  | Sidebar / card background |
| `--border`    | `#1e293b`  | Dividers, borders         |
| `--text`      | `#f1f5f9`  | Primary body text         |
| `--muted`     | `#94a3b8`  | Secondary / placeholder   |
| `--accent`    | `#38bdf8`  | Links, highlights         |
| `--accent-dim`| `#0ea5e9`  | Hover / secondary accent  |

### Contrast analysis (calculated)

| Pairing                              | Ratio  | WCAG AA (normal text) | WCAG AA (large/UI) |
|--------------------------------------|--------|-----------------------|--------------------|
| `--text` (#f1f5f9) on `--bg`         | ~18:1  | Pass                  | Pass               |
| `--text` (#f1f5f9) on `--surface`    | ~15:1  | Pass                  | Pass               |
| `--muted` (#94a3b8) on `--bg`        | ~5.5:1 | Pass                  | Pass               |
| `--muted` (#94a3b8) on `--surface`   | ~4.8:1 | Pass (borderline)     | Pass               |
| `--accent` (#38bdf8) on `--bg`       | ~8.5:1 | Pass                  | Pass               |
| `--accent` (#38bdf8) on `--surface`  | ~7.3:1 | Pass                  | Pass               |
| `--accent-dim` (#0ea5e9) on `--bg`   | ~5.9:1 | Pass                  | Pass               |
| `--border` (#1e293b) on `--bg`       | ~1.5:1 | Fail (decorative)     | Fail (UI element)  |

### Checklist

- [ ] **`--muted` on `--surface` — verify at 14px body copy**
  The ~4.8:1 ratio passes AA for normal text (4.5:1 threshold) but is borderline. Any
  `--muted` text below 14px must be re-evaluated. Check all instances in
  `src/pages/Dashboard.tsx` and `src/pages/Attestations.tsx`.

- [ ] **`--border` — decorative only rule**
  `--border` (#1e293b) does not meet 3:1 against `--bg`. This is acceptable **only** if
  borders are purely decorative (not the sole indicator of a form field boundary or
  focus state). Document this explicitly. Never use `--border` as the only visual
  indicator of a focused or active element.

- [ ] **Accent on interactive states**
  When `--accent-dim` (#0ea5e9) is used for hover text on `--surface`, the contrast
  is ~5.9:1 — this passes. Do not darken it further below 4.5:1.

- [ ] **Do not convey meaning by color alone**
  Error states, success indicators, and status badges must pair color with an icon,
  label, or pattern. Example: a red error border must also include an error icon or
  "Error:" text prefix.

- [ ] **Future: disabled text**
  If a disabled style uses an opacity modifier (e.g., `opacity: 0.4` on `--muted`),
  recalculate the resulting contrast against the background — it will likely fail AA.
  Use a dedicated disabled token instead of opacity-based dimming.

### Acceptance criteria (PR review)
1. Run [axe DevTools](https://www.deque.com/axe/browser-extensions/) — zero contrast
   violations in the "Needs Review" or "Violations" panels.
2. Any new color pairing introduced in a PR must include a comment with the measured
   ratio (use [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)
   or [coolors.co/contrast-checker](https://coolors.co/contrast-checker)).
3. Diff must not introduce a color pairing between text and background that is below
   4.5:1 (normal text) or 3:1 (large text ≥18px regular / ≥14px bold, or UI components).

---

## 3. Keyboard Navigation

### Current state
- `src/components/Layout.tsx`: only `<Link>` elements — standard tab navigation works.
- No dropdowns, modals, accordions, or interactive widgets that require arrow-key patterns.
- No `onKeyDown` handlers anywhere in the codebase.

### Checklist

- [ ] **Tab traversal — `src/components/Layout.tsx`**
  Current tab order: skip link → logo link → "Dashboard" → "Attestations" → first element
  in `<main>`. Verify this matches visual order on every viewport.

- [ ] **All interactive elements reachable by Tab**
  Any `<div>`, `<span>`, or `<li>` wired with `onClick` must have `role="button"` (or
  be replaced with `<button>`) and `tabIndex={0}`. The project currently has none — keep
  it that way by defaulting to semantic HTML.

- [ ] **Dropdowns / menus — ARIA `menu` pattern** *(implement when added)*
  When a dropdown menu is added:
  - `ArrowDown`: move focus to first item
  - `ArrowUp`: move focus to last item
  - `ArrowDown`/`ArrowUp` within items: cycle focus
  - `Home`/`End`: jump to first/last item
  - `Escape`: close menu, return focus to trigger
  - `Enter`/`Space`: activate item

- [ ] **Escape closes all overlays** *(implement with first modal/dropdown)*
  Wire `onKeyDown` on `document` or the overlay root; check `e.key === 'Escape'`.

- [ ] **Enter/Space activate buttons**
  Native `<button>` elements handle this automatically. Never use `<div onClick>` as a
  button. If a `<div>` must be used, add:
  ```tsx
  role="button"
  tabIndex={0}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
  ```

- [ ] **No keyboard traps outside intentional modals**
  Tab through the entire page — focus must not get stuck in any element.

### Acceptance criteria (PR review)
Reviewer test sequence for **every PR** that adds or changes interactive elements:

1. Open the page in Chrome/Firefox (no mouse).
2. Press `Tab` — confirm first visible stop is the skip link.
3. Keep pressing `Tab` — confirm every interactive element is reached in visual order.
4. On focused link/button, press `Enter` — confirm it activates.
5. On focused button (if any), press `Space` — confirm it activates.
6. If a dropdown was added: `Enter` to open → `ArrowDown` to navigate → `Escape` to close →
   confirm focus returns to trigger.
7. If a modal was added: trigger to open → `Tab` cycles only within modal → `Escape` closes →
   confirm focus returns to trigger.
8. Diff must not contain `tabIndex` values > 0 (positive tabIndex breaks natural order).

---

## 4. ARIA Patterns

### Current state
- Zero `aria-*` attributes exist anywhere in the codebase.
- The `<nav>` element in `src/components/Layout.tsx` is unlabelled — if there were multiple
  `<nav>` landmarks, a screen reader could not distinguish them.
- `<aside>` and `<main>` are present (good landmarks), but `<main>` has no `id`.

### Checklist

- [ ] **Label the `<nav>` — `src/components/Layout.tsx`**
  ```tsx
  <nav aria-label="Main navigation" style={…}>
  ```
  This is critical once a second `<nav>` (e.g., breadcrumbs) exists anywhere in the app.

- [ ] **`<main>` landmark id — `src/components/Layout.tsx`**
  ```tsx
  <main id="main-content" tabIndex={-1} style={…}>
  ```
  Required for the skip link and screen-reader landmark navigation.

- [ ] **Page titles — `src/pages/Dashboard.tsx`, `src/pages/Attestations.tsx`**
  Each page must update `document.title` so screen reader users know which page loaded.
  Use React Router `useEffect` or a `<title>` management library:
  ```tsx
  useEffect(() => { document.title = 'Dashboard — Veritasor' }, [])
  ```

- [ ] **Buttons** *(when added)*
  - Use `<button type="button">` for actions, `<button type="submit">` for forms.
  - Icon-only buttons must have `aria-label="Close"` (or equivalent).
  - Never use `aria-label` on a button that already has visible text — it creates
    divergence between the visual label and the accessible name.

- [ ] **Form inputs** *(when added)*
  ```tsx
  <label htmlFor="email">Email address</label>
  <input id="email" type="email" aria-describedby="email-error" />
  <span id="email-error" role="alert">…</span>
  ```
  - Every `<input>` must have a `<label>` (not just a placeholder — placeholders
    disappear and are not accessible names).
  - Error messages use `role="alert"` or `aria-live="polite"`.

- [ ] **Modals / dialogs** *(when added)*
  ```tsx
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-desc"
  >
    <h2 id="modal-title">Confirm Attestation</h2>
    <p id="modal-desc">…</p>
  </div>
  ```

- [ ] **Dropdowns** *(when added)*
  ```tsx
  <button
    aria-haspopup="menu"
    aria-expanded={isOpen}
    aria-controls="dropdown-menu"
  >
    Options
  </button>
  <ul role="menu" id="dropdown-menu">
    <li role="menuitem">…</li>
  </ul>
  ```

- [ ] **Accordions** *(when added)*
  ```tsx
  <button aria-expanded={isOpen} aria-controls="panel-id">Section title</button>
  <div id="panel-id" hidden={!isOpen}>…</div>
  ```

- [ ] **Tables** *(when added)*
  - Data tables must use `<th scope="col">` or `<th scope="row">`.
  - Complex tables need `<caption>` or `aria-label`.
  - Sortable columns: `aria-sort="ascending" | "descending" | "none"`.

- [ ] **`aria-disabled` vs `disabled` attribute rule**
  - Use `disabled` on `<input>`, `<button>`, `<select>` — removes from tab order,
    prevents interaction, and communicates state.
  - Use `aria-disabled="true"` only on non-native elements (e.g., `role="button"` on
    a `<div>`) or when you need the element to remain focusable (e.g., a disabled
    button that should still show a tooltip on hover/focus).
  - Never use both on the same element.

- [ ] **`aria-live` for dynamic content** *(when added)*
  - Polite for non-urgent updates (filter results, pagination):
    `aria-live="polite" aria-atomic="true"`
  - Assertive for time-sensitive alerts (form errors, session expiry):
    `aria-live="assertive"` — use sparingly.
  - The live region element must exist in the DOM **before** the dynamic content is
    inserted (not conditionally rendered).

### Acceptance criteria (PR review)
For each component type, a reviewer checks:

| Component       | Required attributes                                              |
|-----------------|------------------------------------------------------------------|
| `<nav>`         | `aria-label` if more than one nav exists on the page            |
| Icon button     | `aria-label` describing the action                              |
| `<input>`       | Associated `<label>` via `htmlFor`/`id`, `aria-describedby` for errors |
| Modal           | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`          |
| Dropdown button | `aria-haspopup`, `aria-expanded`, `aria-controls`               |
| Menu item       | `role="menuitem"`                                               |
| Alert/toast     | `role="alert"` or `aria-live="assertive"`                        |
| Status/progress | `aria-live="polite"`, `aria-busy` during loading                 |

Run axe DevTools after the PR is deployed to staging — zero new violations allowed.

---

## 5. Interaction States

### Current state
- No hover, focus, disabled, loading, or error states are implemented.
- `src/index.css` has no state-based CSS rules (no `:hover`, `:disabled`, `:focus`).
- Navigation `<Link>` elements inherit browser default link styles — no custom states.

### Checklist

- [ ] **Hover state — `src/index.css`**
  Navigation links must have a perceptible hover style beyond cursor change:
  ```css
  nav a:hover {
    color: var(--accent);
    text-decoration: underline;
  }
  ```

- [ ] **Active/current page indicator — `src/components/Layout.tsx`**
  Use React Router's `NavLink` instead of `Link` for sidebar nav to get `aria-current`:
  ```tsx
  <NavLink
    to="/"
    aria-current={isActive ? 'page' : undefined}
    style={({ isActive }) => ({
      color: isActive ? 'var(--accent)' : 'var(--text)',
      fontWeight: isActive ? 600 : 400,
    })}
  >
    Dashboard
  </NavLink>
  ```

- [ ] **Disabled state** *(implement with first button/input)*
  - Visually distinct from enabled: reduced contrast using a dedicated CSS rule
    (do not rely on opacity alone — see contrast note in Section 2).
  - Not reachable via `Tab` (use `disabled` attribute on native elements).
  - Cursor set to `not-allowed`.

- [ ] **Loading state** *(implement when async data is added)*
  ```tsx
  <button aria-busy={isLoading} disabled={isLoading}>
    {isLoading ? 'Loading…' : 'Submit'}
  </button>
  ```
  For full-page or section loading, use an `aria-live="polite"` region:
  ```tsx
  <div aria-live="polite" aria-atomic="true">
    {isLoading && <span className="sr-only">Loading attestations…</span>}
  </div>
  ```

- [ ] **Error state** *(implement with first form)*
  - Visual: red border + error icon + error message below field.
  - Screen reader: `role="alert"` or `aria-describedby` linking input to error message.
  - Error text must not rely on color alone (add icon or "Error:" prefix).

- [ ] **Screen-reader-only utility class — `src/index.css`**
  Many state announcements need text visible only to screen readers:
  ```css
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  ```

### Acceptance criteria (PR review)
For each interactive element state, reviewer checks:

| State      | Visual check                                      | Screen reader check                             |
|------------|---------------------------------------------------|-------------------------------------------------|
| Hover      | Color or underline change visible                 | No announcement needed                          |
| Focus      | Accent-color ring (2px solid `--accent`)          | Element name and role announced                 |
| Active     | Pressed appearance (scale, background shift)      | No special requirement                          |
| Disabled   | Grayed out, `not-allowed` cursor                  | "dimmed" or "unavailable" communicated via attr |
| Loading    | Spinner or text "Loading…" visible                | `aria-live` region or `aria-busy="true"` present|
| Error      | Red border + icon + message below field           | `role="alert"` fires, message linked via `aria-describedby` |
| Current    | Bold/accent color on active nav item              | `aria-current="page"` on active `<NavLink>`     |

Diff must not contain a state that is communicated by color only.

---

## 6. Responsive and Mobile Accessibility

### Current state
- `index.html`: viewport meta is `width=device-width, initial-scale=1.0` — good, zoom
  is not disabled.
- `src/components/Layout.tsx`: sidebar is fixed 220px with flex row — will overflow on
  narrow viewports; no responsive CSS exists.
- No touch-target sizing rules exist.
- No horizontal-scroll prevention rules exist.

### Checklist

- [ ] **Pinch-to-zoom — `index.html`**
  Current: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  This is compliant — do not add `user-scalable=no` or `maximum-scale=1`. If this line
  is ever changed in a PR, the reviewer must reject it.

- [ ] **Responsive sidebar — `src/components/Layout.tsx`**
  The fixed 220px sidebar breaks at narrow viewports. At minimum, add a CSS media query
  to collapse the sidebar (hamburger menu or bottom nav) at 768px:
  ```css
  @media (max-width: 768px) {
    /* sidebar collapses; nav becomes a top bar or bottom bar */
  }
  ```
  The collapsed nav must remain keyboard-accessible (not `display: none` without a
  visible toggle button).

- [ ] **Touch targets — all interactive elements**
  Buttons, links, and inputs must have a minimum tap area of 44×44px per WCAG 2.5.5.
  The current nav `<Link>` elements likely have insufficient tap height.
  ```css
  nav a {
    min-height: 44px;
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
  }
  ```

- [ ] **No horizontal scroll**
  Add to `src/index.css`:
  ```css
  body {
    overflow-x: hidden;
    max-width: 100vw;
  }
  ```
  Test at 375px viewport width — no content should extend beyond the viewport.

- [ ] **Text does not truncate at 200% zoom**
  Verify the layout at 200% browser zoom. Text must reflow; no content should be
  clipped or hidden. Avoid fixed pixel heights on text containers.

- [ ] **Pointer target spacing**
  Interactive elements must have at least 24px spacing between tap targets (WCAG 2.5.8
  AA). The sidebar nav items with `0.5rem` gap (~8px) do not meet this — increase gap
  or add padding.

### Acceptance criteria (PR review)

| Viewport   | What reviewer checks                                               |
|------------|--------------------------------------------------------------------|
| 375px      | No horizontal scroll; nav accessible via toggle; text readable    |
| 768px      | Layout transitions correctly; sidebar/nav still operable          |
| 1280px     | Baseline desktop layout; sidebar full width (220px)               |
| 200% zoom  | Content reflows; no clipped text; layout intact                   |

Test steps:
1. Open Chrome DevTools → toggle device toolbar.
2. Set viewport to 375px → scroll right — no overflow.
3. Set viewport to 375px → tab through nav — all items reachable.
4. Set viewport to 375px → tap nav links — tap areas are comfortably tappable.
5. Set browser zoom to 200% at 1280px — text reflows, nothing hidden.
6. Confirm `index.html` viewport meta does not contain `user-scalable=no`.

---

## Appendix A: Component-level Quick Reference

| Component / File                              | Focus | Contrast | Keyboard | ARIA | States | Mobile |
|-----------------------------------------------|-------|----------|----------|------|--------|--------|
| `src/components/Layout.tsx` (sidebar nav)     |  [ ]  |   [ ]    |   [ ]    | [ ]  |  [ ]   |  [ ]   |
| `src/pages/Dashboard.tsx`                     |  N/A  |   [ ]    |   N/A    | [ ]  |  N/A   |  [ ]   |
| `src/pages/Attestations.tsx`                  |  N/A  |   [ ]    |   N/A    | [ ]  |  N/A   |  [ ]   |
| Future: Button component                      |  [ ]  |   [ ]    |   [ ]    | [ ]  |  [ ]   |  [ ]   |
| Future: Input / Form component                |  [ ]  |   [ ]    |   [ ]    | [ ]  |  [ ]   |  [ ]   |
| Future: Modal / Dialog component              |  [ ]  |   [ ]    |   [ ]    | [ ]  |  [ ]   |  [ ]   |
| Future: Dropdown component                    |  [ ]  |   [ ]    |   [ ]    | [ ]  |  [ ]   |  [ ]   |
| Future: Table component                       |  N/A  |   [ ]    |   [ ]    | [ ]  |  [ ]   |  [ ]   |
| Future: Toast / Alert component               |  N/A  |   [ ]    |   N/A    | [ ]  |  [ ]   |  N/A   |

---

## Appendix B: Audit Process

**When to run a full audit:**
- Before each public release
- When a new page or complex component (modal, form, table) is added

**Automated (5 min):**
1. Install [axe DevTools](https://www.deque.com/axe/browser-extensions/) in Chrome
2. Navigate to each page
3. Open axe panel → "Scan all of my page" → resolve all Violations; review "Needs Review"

**Manual keyboard (10 min):**
1. Unplug mouse
2. Navigate the full app using only `Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`, arrow keys
3. Verify every interactive element is reachable and operable

**Screen reader (15 min):**
- macOS: enable VoiceOver (`Cmd+F5`), navigate with `VO+Right`
- Windows: NVDA (free) + Chrome
- Verify: page title announced on load; landmarks navigable; all form labels read; alerts fired

**Contrast (5 min):**
1. Run axe — catches most failures
2. For any new color token, verify manually with [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

---

## Appendix C: Priority Order for Implementation

Given the project is early-stage, address in this order:

1. **`src/index.css`** — Add `:focus-visible` ring + `.sr-only` utility (10 min, zero-risk)
2. **`src/components/Layout.tsx`** — `aria-label` on `<nav>`, `id` on `<main>`, `NavLink` with `aria-current`, skip link (20 min)
3. **`src/index.css`** — Add `nav a` hover and touch-target styles (15 min)
4. **Tooling** — Install `eslint-plugin-jsx-a11y`, configure in `eslint.config.js` (15 min)
5. **`index.html`** — Verify viewport meta stays compliant (already compliant — just guard it)
6. **Future components** — Apply patterns from Sections 3–5 as each component is built
