# Theme Switcher

A segmented-control radio group that lets users choose between **System**, **Light**, and **Dark** themes.

## Behaviour

- **Default** — `"system"`. On first visit the site matches `prefers-color-scheme`.
- **Persistence** — The user's choice is saved to `localStorage` under the key `veritasor-theme`.
- **Cross-tab sync** — Changing the theme in one tab updates all others via the `storage` event.
- **System changes mid-session** — When the theme is set to `"system"`, a `change` listener on the `prefers-color-scheme` media query re-applies the theme live.

## SSR flash mitigation

An inline `<script>` in `index.html` runs **before** React mounts. It reads `localStorage` (or falls back to `prefers-color-scheme`) and sets `data-theme` on `<html>` immediately, preventing a flash of the wrong theme.

```html
<script>
  (function() {
    var key = 'veritasor-theme';
    var theme;
    try { theme = localStorage.getItem(key); } catch(e) {}
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

## Usage

```tsx
import ThemeSwitcher from './ThemeSwitcher'

// Place anywhere in the app bar / settings panel
<ThemeSwitcher />
```

The component uses `useTheme()` from `src/hooks/useTheme.ts`. The hook exposes:

| Return    | Description                                    |
|-----------|------------------------------------------------|
| `theme`   | The raw stored choice: `"system"` / `"light"` / `"dark"` |
| `resolved`| The effective theme (`"light"` or `"dark"`) after resolving `"system"` |
| `setTheme`| Setter that persists to `localStorage` and dispatches a custom event |

## Tokens

Themes are driven entirely by CSS custom properties. Dark is the default (`:root`), light is `[data-theme="light"]`. The CSS `@media (prefers-color-scheme: light)` block in `:root:not([data-theme])` handles the system default for users who haven't made a choice.

## Accessibility

- Rendered as a `radiogroup` (role `radiogroup`) with a visually hidden label.
- Each option is a `<label>` wrapping a hidden `<input type="radio">` — browsers and AT treat this as a native radio group.
- Focus is managed by the browser's built-in radio-group roving tabindex.
- Colour is not the only means of identification — each option has a text label and a distinct icon.
- Contrast ratios meet WCAG 2.1 AA in both light and dark palettes.
- Preview swatches are hidden on narrow viewports to avoid overflow.

## Edge cases

| Scenario | Behaviour |
|----------|-----------|
| localStorage unavailable | Silently returns `"system"`; writes are no-ops. |
| System prefers-color-scheme changes mid-session | Re-applies theme live when mode is `"system"`. |
| Mobile / narrow viewport (≤480px) | Preview tooltips hidden, control shrinks to fit. |
| RTL | Layout uses `flex` so it adapts automatically. |
| prefers-reduced-motion | No animations in the switcher itself — all transitions are `background-color` / `box-shadow` (non-motion). |

## File references

- `src/hooks/useTheme.ts` — Hook + storage logic
- `src/components/ThemeSwitcher.tsx` — Component
- `src/index.css` (`.theme-switcher` / `.theme-option*`) — Styles
- `index.html` — Inline flash-mitigation script
