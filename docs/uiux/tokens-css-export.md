# Design Tokens — CSS Export

Designers and developers can export a snapshot of Veritasor design tokens as a CSS
custom-properties file, ready to paste into `src/index.css` or share with other teams.

## Component

**`src/components/tokens/TokensExport.tsx`** — renders a self-contained panel with:
- a **scope selector** (radio group) to choose between `:root` and `[data-theme]` variants
- **Copy to clipboard** and **Download file** action buttons
- a **preview textarea** showing the generated CSS with a comment header and version

## Utility

**`src/utils/parseTokens.ts`** — parses `src/index.css` at runtime and exposes:

| Function | Description |
|---|---|
| `parseTokens()` | Returns all parsed CSS custom-property blocks with version metadata |
| `tokensToCss(blocks, variant)` | Generates a CSS string for the given theme variant |
| `getVariantSelector(variant)` | Returns the CSS selector string for a variant |
| `getVariantLabel(variant)` | Returns a human-readable label for a variant |

## Theme variants

| Variant | Selector | Description |
|---|---|---|
| `:root` (default dark) | `:root` | All tokens for the default dark theme |
| Light | `[data-theme="light"]` | Tokens overridden for the light theme |
| Dark | `[data-theme="dark"]` | Tokens for the explicit dark theme |

The `:root` export also includes the compact density variant block (`[data-density="compact"]`).

## Output format

Every exported file includes a comment header:

```css
/*
 * Veritasor Design Tokens — CSS Custom Properties
 * Version: 0.1.0
 * Exported: 2026-07-28T...
 * Scope: :root (default dark)
 *
 * Paste this block into src/index.css or share with other teams.
 */

:root {
  --bg: #07111f;
  --surface: rgba(11, 22, 39, 0.82);
  ...
}

/* Compact density variant (apply [data-density="compact"] on <html>) */
[data-density="compact"] {
  ...
}
```

## Usage

```tsx
import TokensExport from './components/tokens/TokensExport'

// Place inside a settings panel, admin page, or dedicated tokens page.
<TokensExport />
```

The component mounts inside **Settings → Tokens** by default.

## Accessibility (WCAG 2.1 AA)

- **Scope picker** uses a `fieldset`/`legend` with native radio inputs — keyboard
  navigable (arrow keys) and screen-reader friendly (WCAG 1.3.1, 4.1.2).
- **Buttons** use semantic `<button>` elements with visible focus indicators and
  `min-height: var(--density-touch-min)` (44 px, WCAG 2.5.5 Target Size).
- **Live announcements** — a `role="status" aria-live="polite"` region announces
  copy and download actions (WCAG 4.1.3 Status Messages).
- **Preview textarea** is `readonly` but keyboard-focusable and selectable.
- **Contrast** — all text uses established Veritasor color tokens (`--text`,
  `--muted`, `--accent`) which meet WCAG AA in both light and dark palettes.

## Responsive

- Scope radio cards use `flex: 1 1 160px` and wrap on narrow viewports.
- The preview textarea uses `width: 100%` and `overflow: auto` for horizontal
  scrolling on small screens.
- Action buttons reflow to a single column below 480 px (uses existing
  `--density-gap` tokens for consistent spacing).

## File references

| File | Purpose |
|---|---|
| `src/utils/parseTokens.ts` | CSS parser and export formatter |
| `src/components/tokens/TokensExport.tsx` | UI component |
| `src/pages/Settings.tsx` | Adds Tokens tab |
| `src/index.css` | Source of truth for all design tokens |
| `src/test/tokens-export.test.tsx` | 32 tests, 100% coverage of parser and component |

## Edge cases

| Scenario | Behaviour |
|---|---|
| Clipboard unavailable | Fails silently; no crash |
| `[data-theme="dark"]` variant | Shows the explicit dark tokens if present |
| Missing density block in export | Only included when `:root` variant is selected |
| No tokens for selected variant | Generates a CSS comment: `/* No tokens found for selector … */` |
| Mobile narrow viewport | Radio cards wrap to single column; textarea scrolls horizontally |
| Keyboard navigation | Tab to radios → arrow to select → Tab to buttons → Enter to activate |