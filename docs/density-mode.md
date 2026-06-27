# Density Mode System

## Overview

The density mode system allows users to switch between **comfortable** and **compact** spacing in data-heavy views. The preference is persisted per workspace in localStorage.

## Usage

### Density Toggle Component

The `DensityToggle` component provides a two-button toggle for switching between modes.

```tsx
import DensityToggle from "../components/DensityToggle";

<DensityToggle workspace={workspaceName} />;
```

### Hook

For programmatic access, use the `useDensityMode` hook:

```tsx
import { useDensityMode } from "../hooks/useDensityMode";

function MyComponent({ workspace }: { workspace: string }) {
  const { density, setDensity } = useDensityMode(workspace);

  return <div data-density={density}>{/* content */}</div>;
}
```

## CSS Tokens

Density modes are implemented via CSS custom properties on the `[data-density]` attribute of the document root.

### Comfortable Mode (default)

```css
:root {
  --density-gap: var(--space-4); /* 1rem */
  --density-padding: var(--space-4); /* 1rem */
  --density-row-gap: var(--space-3); /* 0.75rem */
  --density-text-sm: var(--text-sm); /* 0.9rem */
  --density-text-muted: var(--text-sm); /* 0.9rem */
  --density-badge-padding: 0.32rem 0.6rem;
  --density-badge-font: 0.82rem;
  --density-touch-min: 44px;
}
```

### Compact Mode

```css
[data-density="compact"] {
  --density-gap: var(--space-2); /* 0.5rem */
  --density-padding: var(--space-2); /* 0.5rem */
  --density-row-gap: var(--space-2); /* 0.5rem */
  --density-text-sm: 0.82rem;
  --density-text-muted: 0.82rem;
  --density-badge-padding: 0.22rem 0.5rem;
  --density-badge-font: 0.78rem;
  --density-touch-min: 44px;
}
```

## Applying Density to Components

Replace hardcoded spacing values with density tokens:

```tsx
// Before
<div style={{ padding: '1rem', gap: '0.75rem' }}>

// After
<div style={{ padding: 'var(--density-padding)', gap: 'var(--density-row-gap)' }}>
```

### Token Reference

| Token                     | Comfortable    | Compact        | Purpose                             |
| ------------------------- | -------------- | -------------- | ----------------------------------- |
| `--density-gap`           | 1rem           | 0.5rem         | Gap between list items, sections    |
| `--density-padding`       | 1rem           | 0.5rem         | Padding inside cards/containers     |
| `--density-row-gap`       | 0.75rem        | 0.5rem         | Gap between rows within a component |
| `--density-text-sm`       | 0.9rem         | 0.82rem        | Secondary text size                 |
| `--density-text-muted`    | 0.9rem         | 0.82rem        | Muted/help text size                |
| `--density-badge-padding` | 0.32rem 0.6rem | 0.22rem 0.5rem | Status badge padding                |
| `--density-badge-font`    | 0.82rem        | 0.78rem        | Status badge font size              |
| `--density-touch-min`     | 44px           | 44px           | Minimum touch target size           |

## Accessibility

- **44px minimum touch targets**: Both modes maintain 44px minimum touch target size for interactive elements on touch viewports (WCAG 2.1 AA compliant).
- **Keyboard navigation**: The density toggle supports keyboard interaction with proper focus management.
- **ARIA attributes**: The toggle uses `aria-pressed` to communicate the current state to assistive technologies.

## Persistence

Density preference is stored per workspace in localStorage:

```
veritasor_density_{workspaceName}
```

When a user switches workspaces, the density mode automatically syncs to the saved preference for that workspace.

## Responsive Behavior

- On touch viewports (detected via `@media (hover: none)`), interactive elements maintain 44px minimum size regardless of density mode.
- The density toggle is placed in the top app bar for easy access across all pages.

## Implementation Checklist

When adding density support to a new component:

- [ ] Replace hardcoded `padding` values with `var(--density-padding)`
- [ ] Replace hardcoded `gap` values with `var(--density-gap)` or `var(--density-row-gap)`
- [ ] Replace hardcoded `fontSize` for secondary/muted text with `var(--density-text-sm)` or `var(--density-text-muted)`
- [ ] Ensure interactive elements have `min-height: var(--density-touch-min)` or larger
- [ ] Test both comfortable and compact modes
- [ ] Verify 44px touch targets in compact mode on touch devices
