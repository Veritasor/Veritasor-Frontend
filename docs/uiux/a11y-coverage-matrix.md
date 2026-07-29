# A11y component-coverage matrix

A data-driven matrix that maps design-system components to WCAG 2.1 AA
success criteria, showing which criteria are covered by automated axe-core
tests vs. requiring manual review.

## Component

### `A11yCoverageMatrix`

```tsx
import A11yCoverageMatrix from '../components/a11y/A11yCoverageMatrix'

<A11yCoverageMatrix />
```

Located in the **Accessibility** tab of `src/pages/Settings.tsx`, below the
audit-issue panel.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `components` | `ComponentCoverageEntry[]` | `COMPONENT_COVERAGE` | Override fixture data — useful in tests |

## Data model

### `WCAG_CRITERIA`

17 WCAG 2.1 AA success criteria relevant to UI components, each with:

- `sc` — SC number (e.g. `"1.1.1"`)
- `label` — short description
- `level` — `A`, `AA`, or `AAA`

### Coverage entries

Each component entry maps criterion IDs to one of four test methods:

| Method | Meaning | Color |
|--------|---------|-------|
| `automated` | Covered by axe-core CI tests | Green |
| `manual` | Requires human review | Amber |
| `partial` | Partially automated | Amber |
| `none` | Not applicable to this component | Grey dash |

## Accessibility

- Table uses `<caption className="sr-only">` for a descriptive label
- Column headers include screen-reader text and `aria-hidden="true"` short labels
- Status chips have `aria-label` with full text descriptions
- Summary metrics use `aria-label` with spoken equivalents
- Section has `aria-label="Component-coverage matrix"` and is a landmark

## Print

A dedicated print stylesheet (`A11yCoverageMatrix.print.css`) optimises the
matrix for print / PDF:

- Removes decorative elements, summary strip, and legend
- Converts status chips to high-contrast solid colours
- Adds a print-only URL note
- Collapses table borders for readability
- Prevents page breaks inside rows

## Adding a component

1. Add a WCAG criterion to `WCAG_CRITERIA` if needed.
2. Add an entry to `COMPONENT_COVERAGE` with the component name and
   per-criterion status.
3. Add a test case in `A11yCoverageMatrix.test.tsx`.
