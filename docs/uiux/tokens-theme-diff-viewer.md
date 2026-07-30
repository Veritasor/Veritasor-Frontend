# Theme Token Diff Viewer

The Tokens settings panel includes a review-only comparison of two versioned theme snapshots. It is intended to make publishing changes safer by showing only added, changed, and removed token values.

## Interaction

- Choose an earlier and later theme version with native select controls.
- Filter results by color, typography, spacing, or radius.
- Review the earlier and later values side by side; color tokens include labelled swatches and non-color values use the same value layout.
- Each row has an explicit Added, Changed, or Removed chip. Do not rely on the chip colour alone.

## Accessibility and responsiveness

- Labels, table headers, swatch names, and live result count expose the comparison to screen readers.
- Native selects provide keyboard operation without custom key handling.
- The control layout uses an auto-fit grid; the comparison table preserves column relationships and becomes horizontally scrollable on narrow screens.
- Semantic foreground, surface, and status tokens preserve the application’s existing WCAG AA contrast contract.
