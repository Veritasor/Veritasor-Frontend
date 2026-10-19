# Theme Switcher

A segmented-control radio group that lets users choose between **System**, **Light**, **Dark**, and **High Contrast** themes.

## Behaviour

- **Default** — `"system"`. On first visit the site matches `prefers-color-scheme`.
- **Persistence** — The user's choice is saved to `localStorage` under the key `veritasor-theme`.
- **Cross-tab sync** — Changing the theme in one tab updates all others via the `storage` event.
- **System changes mid-session** — When the theme is set to `"system"`, a `change` listener on the `prefers-color-scheme` media query re-applies the theme live.
- **High Contrast** — Sets `data-theme="high-contrast"` directly. It does not participate in system-preference resolution; it is always explicitly active when chosen.

## SSR flash mitigation

An inline `<script>` in `index.html` runs **before** React mounts. It reads `localStorage` (or falls back to `prefers-color-scheme`) and sets `data-theme` on `<html>` immediately, preventing a flash of the wrong theme.

```html
<script>
  (function() {
    var key = 'veritasor-theme';
    var theme;
    try { theme = localStorage.getItem(key); } catch(e) {}
    if (theme === 'light' || theme === 'dark' || theme === 'high-contrast') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      var resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', resolved);
    }
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

| Return    | Description |
|-----------|-------------|
| `theme`   | The raw stored choice: `"system"` / `"light"` / `"dark"` / `"high-contrast"` |
| `resolved`| The effective theme: `"light"`, `"dark"`, or `"high-contrast"` (system resolves to light/dark) |
| `setTheme`| Setter that persists to `localStorage` and dispatches a custom event |

## Tokens

Themes are driven entirely by CSS custom properties. Dark is the default (`:root`), light is `[data-theme="light"]`, high-contrast is `[data-theme="high-contrast"]`. The CSS `@media (prefers-color-scheme: light)` block in `:root:not([data-theme])` handles the system default for users who haven't made a choice.

See [high-contrast-theme.md](./high-contrast-theme.md) for the full HC token reference and component override documentation.

## Accessibility

- Rendered as a `radiogroup` (role `radiogroup`) with a visually hidden label.
- Each option is a `<label>` wrapping a hidden `<input type="radio">` — browsers and AT treat this as a native radio group.
- Focus is managed by the browser's built-in radio-group roving tabindex.
- Colour is not the only means of identification — each option has a text label and a distinct icon.
- Contrast ratios meet WCAG 2.1 AA in all palettes. High Contrast meets WCAG 2.1 **AAA**.
- Preview swatches are `aria-hidden`.

## Edge cases

| Scenario | Behaviour |
|----------|-----------|
| localStorage unavailable | Silently returns `"system"`; writes are no-ops. |
| System prefers-color-scheme changes mid-session | Re-applies theme live when mode is `"system"`. |
| Mobile / narrow viewport (≤480px) | Preview tooltips hidden, control shrinks to fit. |
| RTL | Layout uses `flex` so it adapts automatically. |
| prefers-reduced-motion | No animations in the switcher itself. |
| High Contrast + forced-colors OS mode | A `forced-colors: active` rule keeps the active-option indicator visible. |

## File references

- `src/hooks/useTheme.ts` — Hook + storage logic
- `src/components/ThemeSwitcher.tsx` — Component
- `src/index.css` (`.theme-switcher` / `.theme-option*` / `[data-theme="high-contrast"]`) — Styles
- `index.html` — Inline flash-mitigation script
- `docs/uiux/high-contrast-theme.md` — Full HC design system documentation
