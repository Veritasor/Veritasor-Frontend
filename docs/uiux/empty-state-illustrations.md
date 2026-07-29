# Empty-state illustrations

A cohesive set of three SVG illustrations for empty-state views across the
dashboard. Each illustration uses CSS custom properties (token-driven fills)
so it adapts to dark, light, and high-contrast themes automatically.

## Components

### `EmptyStateIllustrations`

```tsx
import { EmptyStateIllustration } from '../components/EmptyStateIllustrations'

<EmptyStateIllustration type="attestations" />
```

| Prop | Type | Description |
|------|------|-------------|
| `type` | `'attestations' \| 'revenue-sources' \| 'data-export'` | Which illustration to render |

### Illustration types

| Type | SVG concept | Used in |
|------|-------------|---------|
| `attestations` | Shield with checkmark | `src/pages/Attestations.tsx` — empty attestation list |
| `revenue-sources` | Plug and cable | `src/pages/RevenueSources.tsx` — no sources connected |
| `data-export` | Document with download arrow | `src/components/data-export/DataExportPanel.tsx` — no exports yet |

## Accessibility

- All SVGs have `aria-hidden="true"` and `focusable="false"`
- A companion `<span class="sr-only">` provides the accessible description
- Contained in a `<div role="presentation">` to hide the wrapper from the
  accessibility tree
- Text descriptions live in `ILLUSTRATION_META` for programmatic use

## Theme support

Each SVG consumes CSS custom properties:

| Property | Usage |
|----------|-------|
| `--accent` | Primary stroke, fill highlights, decorative dots |
| `--border` | Background concentric rings (dashed) |
| `--muted` | Secondary strokes (cables, document lines, trays) |

This gives automatic dark / light / high-contrast adaptation with zero
additional code.

## Adding a new illustration

1. Create a render function in `src/components/EmptyStateIllustrations.tsx`
   following the existing pattern (200×160 viewBox, token-driven fills).
2. Add an entry to the `IllustrationType` union type.
3. Add an entry to `ILLUSTRATION_META` with a label and description.
4. Wire into the `SvgMap` in `EmptyStateIllustration`.
5. Use `<EmptyStateIllustration type="your-type" />` in the target view.
6. Add a test case in `EmptyStateIllustrations.test.tsx`.
