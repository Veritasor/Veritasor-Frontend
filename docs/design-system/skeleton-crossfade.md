# Skeleton → Content Crossfade

**Status:** Stable  
**Component:** `CrossfadeReveal` (`src/components/SkeletonLoader.tsx`)  
**CSS:** `src/index.css` — section *"Skeleton ↔ Content Crossfade"*

---

## Overview

When async data resolves, this pattern crossfades skeleton placeholders to real
content instead of swapping them abruptly ("popping"). The transition runs
entirely in CSS; React only flips a single `data-loaded` attribute.

```
┌──────────────────────────────────────────────┐
│  crossfade-root (grid, both layers stacked)  │
│  ┌──────────────────────────────────────────┐│
│  │  crossfade-skeleton-layer  opacity 1→0   ││
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │  crossfade-content-layer   opacity 0→1   ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

---

## API

### `CrossfadeReveal`

| Prop           | Type                  | Default | Description                                                      |
|----------------|-----------------------|---------|------------------------------------------------------------------|
| `loaded`       | `boolean`             | —       | **Required.** `false` = show skeleton; `true` = reveal content.  |
| `skeleton`     | `React.ReactNode`     | —       | **Required.** Placeholder shown while `loaded` is `false`.       |
| `children`     | `React.ReactNode`     | —       | **Required.** Real content revealed when `loaded` becomes `true`. |
| `staggerIndex` | `number`              | `0`     | Zero-based row index. Each unit adds one stagger step (40 ms).   |
| `className`    | `string`              | —       | Extra CSS class on the wrapper `div`.                            |
| `style`        | `React.CSSProperties` | —       | Inline styles merged onto the wrapper (after CSS custom props).  |

### `DashboardSkeleton` / `AttestationsSkeleton` (crossfade mode)

Both components optionally accept `loaded` + `children`. When both are
provided they delegate to `CrossfadeReveal` internally.

| Prop       | Type              | Required when… |
|------------|-------------------|----------------|
| `loaded`   | `boolean`         | using crossfade |
| `children` | `React.ReactNode` | using crossfade |

If either prop is omitted the component renders the standalone skeleton (no
wrapper), which is the same behaviour as before this feature was added.

---

## Usage

### Basic (single element)

```tsx
import { CrossfadeReveal, MetricCardSkeleton } from '@/components/SkeletonLoader'

function MetricCard({ isLoading, data }) {
  return (
    <CrossfadeReveal
      loaded={!isLoading}
      skeleton={<MetricCardSkeleton />}
    >
      <div className="metric">
        <span className="metric-label">{data.label}</span>
        <span className="metric-value">{data.value}</span>
      </div>
    </CrossfadeReveal>
  )
}
```

### Staggered list

Stagger by passing `staggerIndex`. Each item's fade-in is offset by
`index × 40 ms` so the list reveals top-to-bottom rather than all at once.

```tsx
import { CrossfadeReveal, AttestationRowSkeleton } from '@/components/SkeletonLoader'

function AttestationList({ isLoading, rows }) {
  return (
    <div>
      {rows.map((row, idx) => (
        <CrossfadeReveal
          key={row.id}
          loaded={!isLoading}
          staggerIndex={idx}
          skeleton={<AttestationRowSkeleton />}
        >
          <AttestationRow {...row} />
        </CrossfadeReveal>
      ))}
    </div>
  )
}
```

### Page-level (DashboardSkeleton / AttestationsSkeleton)

```tsx
import { DashboardSkeleton } from '@/components/SkeletonLoader'

function DashboardPage() {
  const { data, isLoading } = useDashboard()

  return (
    <DashboardSkeleton loaded={!isLoading}>
      <Dashboard data={data} />
    </DashboardSkeleton>
  )
}
```

### Override stagger step

```css
/* Per-container override – renders at 60 ms per row instead of 40 ms */
.my-table {
  --crossfade-stagger-step: 60ms;
}
```

---

## Motion tokens

| CSS custom property          | Default  | Purpose                               |
|------------------------------|----------|---------------------------------------|
| `--motion-duration-md`       | `200ms`  | Fade duration for each layer          |
| `--motion-easing-standard`   | `cubic-bezier(0.2, 0, 0, 1)` | Deceleration curve  |
| `--crossfade-stagger-step`   | `40ms`   | Delay increment per stagger unit      |
| `--crossfade-index`          | set by component | Current item's stagger position |
| `--crossfade-delay`          | computed | `index × step`; applied to content    |

All tokens follow the project-wide motion token naming convention defined in
`:root` in `src/index.css`.

---

## Accessibility

### What is implemented

| Concern | Implementation |
|---|---|
| Screen reader announcements | Skeleton layers carry `role="status"` + `aria-busy="true"` |
| Hidden layers | Inactive layer gets `aria-hidden="true"` so AT cannot traverse it |
| One-frame content delivery | Content is in the DOM on the first render frame; opacity 0→1 is cosmetic only |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` disables all CSS transitions — swap is instant |
| Pointer events | Inactive layer has `pointer-events: none` to prevent phantom click targets |

### WCAG 2.1 AA checklist

- [x] **1.3.1 Info and Relationships** – ARIA roles and labels convey load state
- [x] **1.4.3 Contrast** – skeleton uses `rgba(148,163,184,…)` against dark surface (passes AA at ≥ 3:1 for non-text graphical elements)
- [x] **2.1.1 Keyboard** – no interactive elements in skeleton; focus order unaffected
- [x] **2.3.3 Animation from Interactions** – respects `prefers-reduced-motion`
- [x] **4.1.3 Status Messages** – `role="status"` is a live region; screen readers announce "Loading…" automatically

### Testing with axe

```tsx
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

it('has no accessibility violations', async () => {
  const { container } = render(<DashboardSkeleton />)
  expect(await axe(container)).toHaveNoViolations()
})
```

---

## CSS architecture

The crossfade is pure CSS. The only JS involvement is setting `data-loaded`.

```
.crossfade-root[data-loaded="false"]
  .crossfade-skeleton-layer  → opacity: 1
  .crossfade-content-layer   → opacity: 0, visibility: hidden

.crossfade-root[data-loaded="true"]
  .crossfade-skeleton-layer  → opacity: 0, visibility: hidden (after transition)
  .crossfade-content-layer   → opacity: 1  (after transition-delay)

@media (prefers-reduced-motion: reduce)
  ← all transitions: none →  (instant swap)
```

`visibility: hidden` is delayed by the same duration as the opacity transition
(via `transition: visibility 0s <duration>`) so the element collapses from the
accessibility tree only after it has fully faded, not before.

---

## Design decisions and trade-offs

| Decision | Rationale |
|---|---|
| CSS-only transitions (no JS animation library) | Zero bundle cost, integrates with existing motion token system |
| `data-*` attribute on root (not class toggle) | Attribute selectors are more explicit than class presence; maps 1:1 to the `loaded` boolean |
| Both layers always in DOM | Avoids layout shift on mount/unmount; content renders immediately |
| Stagger via CSS custom property (not JS `setTimeout`) | Reduced-motion media query disables the computed delay in the same stylesheet |
| 40 ms stagger step | Perceptually fast enough to feel sequential without feeling sluggish on 10+ items |

---

## Before / After

| State | Behaviour |
|---|---|
| **Before** (no crossfade) | Skeleton unmounts instantly; content mounts with a visual "pop" |
| **After** (with crossfade) | Skeleton fades to 0 while content fades to 1 over 200 ms (standard motion); rows stagger at 40 ms intervals |
| **Reduced-motion user** | Data-loaded attribute still flips; both layers swap instantly with no transition |
