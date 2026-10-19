# Mobile Bottom Tab Bar

## Overview

The mobile bottom tab bar provides one-thumb reachable navigation for the four primary flows: Home, Attestations, Sources, and Settings. It is visible only on mobile viewports (below 768px) and is hidden on desktop where the sidebar navigation is used.

## Design

### Visual Structure

Each tab consists of:
- An SVG icon (20×20px, `stroke="currentColor"`)
- A visible text label (`--text-xs`, 0.78rem, font-weight 500)

Tab | Icon | Route
---|---|---
Home | House | `/dashboard`
Attestations | Shield check | `/attestations`
Sources | Document | `/sources`
Settings | Gear | `/settings`

### States

| State | Color | Background |
|-------|-------|------------|
| Default (inactive) | `--muted` | Transparent |
| Hover | `--text` | `--surface-soft` |
| Active | `--accent` | `rgba(94, 234, 212, 0.08)` |
| Focus-visible | `--accent` outline (3px) | — |

### Accessibility (WCAG 2.1 AA)

- **Landmark**: `<nav>` with `aria-label="Mobile navigation"`
- **Touch targets**: Minimum 44×44px per WCAG 2.5.5 Target Size
- **Contrast**: Active tab uses `--accent` (#5eead4 on #07111f = ~12:1); inactive uses `--muted` (#adc0d9 on #07111f = ~9.5:1). Both pass AA Normal Text (4.5:1).
- **Screen readers**: SVG icons have `aria-hidden="true"`; text labels are always visible; active link has `aria-current="page"`
- **Keyboard**: All tab links are focusable via `Tab`; `focus-visible` ring shown on focus
- **Safe area insets**: `env(safe-area-inset-bottom)`, `env(safe-area-inset-left)`, `env(safe-area-inset-right)` padding for notched devices

### Responsive Behavior

| Breakport | Behavior |
|-----------|----------|
| < 768px | Bottom tab bar visible; content area has no bottom padding |
| ≥ 768px | Bottom tab bar hidden; content area has 2rem bottom padding |

## Implementation

### Component Location

```
src/components/BottomTabBar.tsx
```

### CSS Location

Bottom tab bar styles are in `src/index.css` under the comment `/* ─── Bottom Tab Bar (Mobile) ──...`.

### Integration

The component is rendered at the bottom of `LayoutInner()` in `src/components/Layout.tsx`, after the `.app-body` div and before the `ToastContainer`.

### Router Sync

Uses `NavLink` from `react-router-dom` for automatic active-state tracking. The `bottom-tab-active` class is applied when the current route matches the tab's `to` path. React Router's `NavLink` also adds `aria-current="page"` automatically on the active link.

### i18n

The navigation label uses `useIntl()` from `react-intl` with the message key `nav.bottomTabBar`. Add translations for other locales in the `src/i18n/messages/*.json` files.

### Routes Required

The following routes must be registered in `src/App.tsx` for all tabs to work:

- `/dashboard` (Home)
- `/attestations` (Attestations)
- `/sources` (Sources)
- `/settings` (Settings)

## Testing

Test coverage: `src/components/BottomTabBar.test.tsx`

Tests verify:
1. All four tabs render with icons and labels
2. SVG icons have `aria-hidden="true"`
3. Active tab receives `bottom-tab-active` class based on current route
4. Only one tab is active at a time
5. Active tab has `aria-current="page"`
6. Inactive tabs do not have `aria-current`
7. Navigation landmark exists with accessible label
8. SVG icons have `aria-hidden="true"` wrappers
9. Tab links have correct `href` attributes
10. Layout integration renders the tab bar