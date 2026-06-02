# Landmark structure & skip-to-content link

Reference for keyboard / screen-reader navigation in the app shell
(`src/components/Layout.tsx`) and the supporting utilities in `src/index.css`.
This is the contract every page rendered inside `Layout` must respect.

## Why

- **WCAG 2.1 AA – 2.4.1 Bypass Blocks**: keyboard and screen-reader users must
  be able to skip the repeated sidebar and jump straight to page content.
- Consistent landmarks let assistive tech move between regions reliably
  (NVDA/JAWS `D`/`R` rotor, the VoiceOver rotor) on every page.

## Expected landmarks

The shell provides these once per page — pages must not duplicate them:

| Landmark     | Element                                              | Source        |
|--------------|-----------------------------------------------------|---------------|
| `navigation` | `<nav aria-label="Primary">` inside the `<aside>`   | `Layout.tsx`  |
| `main`       | `<main id="main-content" tabIndex={-1}>`            | `Layout.tsx`  |

```
<div>                                                  app shell (flex container)
  <a class="skip-link" href="#main-content">…</a>      ← first focusable element
  <aside>                                              sidebar
    <a>Veritasor</a>                                   brand / home
    <nav aria-label="Primary"> … </nav>                ← navigation landmark
  </aside>
  <main id="main-content" tabindex="-1"                ← main landmark / skip target
        aria-label="Main content">
    <Outlet />
  </main>
</div>
```

> Note: the sidebar is an `<aside>` for layout, but its accessible navigation is
> the inner `<nav aria-label="Primary">`. If an app-wide `<header>` banner is
> added later, render it as a direct child of the shell (not inside `<main>`) so
> it maps to the `banner` landmark, and document it here.

## Skip-to-content link

- First focusable element in the DOM (top of `Layout`).
- Visually hidden until focused, then slides into the top-left corner
  (`.skip-link` in `index.css`).
- `href="#main-content"` targets `<main id="main-content">`.
- `<main>` has `tabIndex={-1}` so activation moves **focus** (not just scroll)
  into the main region.
- Visible focus indicator via `outline` (WCAG 2.4.7 Focus Visible).
- Honours `prefers-reduced-motion` (transition removed for users who opt out).

## Utility classes (`index.css`)

- `.sr-only` — visually hidden, still in the accessibility tree.
- `.sr-only.focusable` — as above, but becomes visible on focus.

## Rules for page authors

- Do **not** add a second `<main>` or an unnamed `<nav>` inside a page.
- Page-level sub-navigation uses `<nav aria-label="…">` with a unique label.
- Headings start at `<h1>` inside `<main>` and do not skip levels.

## Edge cases & states

- **Responsive**: the skip link uses `position: absolute` and is unaffected by
  the sidebar; verify it lands on `main` at all breakpoints.
- **Loading / empty / error**: `<main id="main-content">` is always rendered, so
  the skip target exists even before content loads.
- **Contrast**: skip link uses `--text` on `--surface-strong`
  (`#f8fbff` on `#0f1b30`, ratio ≈ 16:1, passes AA).

## How to validate

- Keyboard: load a page, press `Tab` once → skip link appears → `Enter` → focus
  lands in main; the next `Tab` is inside the page, not the sidebar.
- Screen reader: confirm `navigation` and `main` are announced once each.
- axe / Lighthouse: 0 violations for `bypass`, `landmark-one-main`,
  `landmark-unique`, and `region`.
