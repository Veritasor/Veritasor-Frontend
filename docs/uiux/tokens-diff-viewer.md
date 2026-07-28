# Tokens Diff Viewer

A side-by-side review surface for design-token changes between two theme
versions. Highlights added, removed, and changed tokens with colour-aware
status chips, side-by-side swatches, and a category filter. Lives in the
**Settings → Design Tokens** tab.

Related issue: #283.

## Behaviour

- **Two versions comparison** — The viewer renders the difference between
  `Veritasor Classic v1.0` and `Veritasor Modern v2.0` (defined in
  `src/tokens/themeTokens.ts`). Each entry is classified as `added`,
  `removed`, or `changed` by **name**, with value comparison done via exact
  match (trimmed).
- **Status chips** — Each row carries a status chip with text + icon +
  colour (never colour-only). The chip label is also surfaced as the row's
  `aria-label` so the change is announced to screen readers.
- **Summary chips** — A row at the top reports the total counts of added,
  changed, and removed entries across all categories.
- **Category filter** — Single-select chip row with an "All categories"
  plus one chip per category: *Background, Border, Text, Accent, Status,
  Spacing, Typography, Radius, Density, Shadow*. Chips use `aria-pressed`
  to convey selection state (consistent with `SearchFilter`).
- **Live region** — A polite `role="status"` node re-announces the
  filter result count whenever the user changes the active category.

## Accessibility (WCAG 2.1 AA)

| Concern                 | Implementation                                                                 |
| ----------------------- | ------------------------------------------------------------------------------- |
| Status differentiation  | Icon character (`+`, `~`, `−`) **and** text label, never colour-only.           |
| Touch targets           | Filter & summary chips use `min-height: 2.75rem` / `2rem` respectively.          |
| Keyboard focus          | All interactive elements are native `<button>` — relies on browser Tab order.   |
| Focus indicators        | `:focus-visible` outlines on chips (3px ring, accent colour, 2px offset).       |
| Screen-reader labels    | Each row's `aria-label` includes token name + status. Swatches carry alt text. |
| Filter announcement     | `aria-live="polite"` region below the chip row updates on category change.      |
| Heading order           | Viewer heading is `<h2>` and lives inside the parent Settings `<h1>`.           |
| Reduced motion          | `prefers-reduced-motion` removes the chip transition.                           |
| RTL                     | Layout uses CSS `gap` and grid track auto-flow; logical properties are avoided |
|                         | in favour of consistent ordering. The token `name` and value survive RTL.       |

## Responsive design

- **≥ 720px** — Two-column side-by-side cells with a centre arrow.
- **< 480px** — Cells stack vertically (Was / Now labels are added inside
  each cell via CSS `::before`), the arrow is hidden, and the version card
  row collapses to a single column with the divider rotated 90°.
- **Filter chips** — Wrap to multiple rows on narrow viewports.
- **Swatches** — Fixed 36×28 px so they're never crushed during layout
  reflow at 200% zoom.

## Visual

- **Status chip — Added** — Green / success palette with `+` glyph.
- **Status chip — Changed** — Blue / informational palette with `~` glyph.
- **Status chip — Removed** — Red / danger palette with `−` glyph.
- **Cells** — Before cells have a danger tint, after cells a success tint.
  Missing sides render a dashed-border placeholder with an em-dash so the
  visual gap mirrors the data gap.
- **Empty state** — When the active filter has no entries, a dashed-border
  card explains the situation and suggests trying the "All categories" chip.

## Edge cases

| Scenario                                            | Behaviour                                          |
| --------------------------------------------------- | -------------------------------------------------- |
| Both versions identical                             | Empty list, summary chips all show `0`.            |
| Filter category yields zero entries                 | Empty-state card renders with helpful copy.        |
| Token value is `transparent` / gradient / `inherit` | Falls back to a monospace text-only chip (no swatch). |
| `localStorage` disabled or A/B defined at runtime   | Component is data-driven; no storage interaction.  |
| Hundreds of tokens                                  | List is a plain `<ul>` — paginate later if needed. |
| RTL locales (`ar`)                                  | Layout relies on grid auto-flow, not absolute pos. |

## Files

- `src/tokens/types.ts` — `Token`, `ThemeVersion`, `TokenDiffStatus`,
  `TokenDiffEntry`, `TokenDiffResult` type definitions.
- `src/tokens/themeTokens.ts` — Hand-crafted `VERSION_A` and `VERSION_B`
  demo data, intentionally composed to exercise all 3 diff states.
- `src/tokens/computeTokenDiff.ts` — Pure `computeTokenDiff()` function.
- `src/components/tokens-admin/TokensDiffViewer.tsx` — The component.
- `src/index.css` — `.tokens-diff-*` / `.td-*` classes (after the existing
  Tokens Diff Viewer block, before the loading skeleton section).
- `src/pages/Settings.tsx` — Hosts the **Design Tokens** tab.

## Usage

The component is intentionally list-driven and needs no props today:

```tsx
import TokensDiffViewer from './components/tokens-admin/TokensDiffViewer'

<section>
  <TokensDiffViewer />
</section>
```

Once the production theme system exposes a real version API you can pass
the data through without forking the component:

```tsx
const versions = { versionA, versionB }  // <-- memoize this upstream
<TokensDiffViewer versions={versions} />
```

> **Hot-path note:** the diff is `useMemo`'d on `[versionA, versionB]`.
> If you pass inline objects (`<TokensDiffViewer versions={{ versionA,
> versionB }} />`) the memo will never hit. Memoise the prop upstream or
> the diff recomputes on every parent re-render. The component is
> forgiving for the rest of the UI cost — recomputation is O(n + m) over
> the token list.
