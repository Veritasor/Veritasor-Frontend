# Dashboard Layout for Portrait Tablets (768–900px)

## References

- Issue: `#313`
- Implementation: `src/pages/Dashboard.tsx`, `src/index.css`
- Related docs: `docs/uiux/dashboard-information-scent.md`, `docs/uiux/spacing-radius-typography-scale.md`

---

## Problem

At 768–900px viewport width (portrait tablet), the Dashboard layout breaks awkwardly:

- The sidebar (220px) is visible, leaving only ~548–680px for content
- The existing `.dashboard-grid` went 2-column at `min-width: 720px`, causing cramped cards at ~250px each
- Dashboard used inline styles exclusively, bypassing the design-system grid classes

## Solution

### 1. Dedicated CSS Classes

New semantic classes replace inline styles in the Dashboard:

| Class | Purpose |
| --- | --- |
| `.dashboard-page` | Page-level wrapper with consistent vertical gap (`--space-6`) |
| `.dashboard-section` | Card surface for each dashboard panel (Key metrics, Quick actions) |
| `.dashboard-metrics-grid` | Responsive metrics card container (auto-fit → forced 2-col at tablet) |
| `.dashboard-metric-card` | Individual KPI card with label/value/sub layout |
| `.dashboard-metric-label` | Muted label text (0.85rem) |
| `.dashboard-metric-value` | Bold value text (1.5rem / 700) |
| `.dashboard-metric-sub` | Muted sub-label text (0.8rem) |
| `.dashboard-actions-list` | Styled list for quick action links |

### 2. Breakpoint Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  < 768px           │  768–899px           │  ≥ 900px        │
│  (mobile)          │  (portrait tablet)   │  (desktop)      │
├────────────────────┼──────────────────────┼─────────────────┤
│  • Sidebar hidden  │  • Sidebar visible   │  • Sidebar      │
│    (overlay)       │    (220px)           │    visible      │
│  • Single column   │  • 2-col grid for    │  • 2-col grid   │
│    grid            │    sections          │    for sections │
│  • Metrics auto-fit│  • Metrics: fixed    │  • Metrics:     │
│                    │    2-col            │    auto-fit     │
│  • Padding:        │  • Padding:          │  • Padding:     │
│    --space-4       │    --space-5         │    --space-6    │
│                    │                      │                 │
│  Bottom tab bar    │  Bottom tab bar      │  No bottom tab  │
│  visible           │  hidden at ≥768px    │  bar            │
└─────────────────────────────────────────────────────────────┘
```

### 3. Card Reflow Rules

**Metrics grid (`.dashboard-metrics-grid`):**

- **Default (<768px):** `repeat(auto-fit, minmax(160px, 1fr))` — cards flow naturally
- **Tablet (768–899px):** `repeat(2, minmax(0, 1fr))` — forced 2-column; third card wraps to new row
- **Desktop (≥900px):** `repeat(auto-fit, minmax(160px, 1fr))` — 3 cards fit side-by-side

**Section grid (`.dashboard-grid`):**

- **Default (<768px):** Single column — sections stack vertically
- **Tablet (768–899px):** 2 columns — Key metrics + Quick actions side by side
- **Desktop (≥900px):** 2 columns — maintained with increased gap

### 4. Padding Token Adjustments

| Breakpoint | `.app-main` | `.dashboard-section` | `.dashboard-grid` gap |
| --- | --- | --- | --- |
| <768px | 1.25rem | `--space-6` (1.5rem) | `--space-4` (1rem) |
| 768–899px | `--space-5` (1.25rem) | `--space-5` (1.25rem) | `--space-5` (1.25rem) |
| ≥900px | `--space-8` (2rem) | `--space-6` (1.5rem) | `--space-6` (1.5rem) |

---

## Annotated Figma-style Spec

```
┌──────────────────────────────────────────────────────────────────┐
│  Dashboard Page (768–899px viewport)                             │
│                                                                  │
│  ┌─ TopAppBar ─────────────────────────────────────────────────┐ │
│  │  [☰]  Veritasor        [Workspace ▼]  [🌙]  [Account]      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Sidebar (220px) ───┐  ┌─ Content Area (~540px) ──────────┐ │
│  │                      │  │                                   │ │
│  │  Dashboard  ●        │  │  Dashboard                        │ │
│  │  Attestations        │  │  Connect your revenue sources…    │ │
│  │  Revenue Sources     │  │                                   │ │
│  │                      │  │  ┌──────────────┐ ┌────────────┐ │ │
│  │                      │  │  │ Key metrics  │ │Quick actions│ │ │
│  │                      │  │  │              │ │             │ │ │
│  │                      │  │  │ ┌──────────┐ │ │● Connect…   │ │ │
│  │                      │  │  │ │Total Rev  │ │ │● Trigger…   │ │ │
│  │                      │  │  │ │$84,320   │ │ │● View…      │ │ │
│  │                      │  │  │ └──────────┘ │ │             │ │ │
│  │                      │  │  │ ┌──────────┐ │ └────────────┘ │ │
│  │                      │  │  │ │Attestatns│ │                 │ │
│  │                      │  │  │ │12        │ │                 │ │
│  │                      │  │  │ └──────────┘ │                 │ │
│  │                      │  │  │ ┌──────────┐ │                 │ │
│  │                      │  │  │ │Rev Source│ │                 │ │
│  │                      │  │  │ │3         │ │                 │ │
│  │                      │  │  │ └──────────┘ │                 │ │
│  │                      │  │  └──────────────┘                 │ │
│  │                      │  │                                   │ │
│  └──────────────────────┘  └───────────────────────────────────┘ │
│                                                                  │
│  Padding: --space-5 (1.25rem)                                    │
│  Section gap: --space-5 (1.25rem)                                │
│  Metric card gap: --space-3 (0.75rem)                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Accessibility Notes (WCAG 2.1 AA)

- **Landmarks:** Two `<section>` elements with descriptive `<h2>` headings provide clear document structure
- **Focus order:** Logical tab sequence: heading → metrics cards (non-interactive) → quick actions links/buttons → modal
- **Contrast:** All text uses `--text` (#f8fbff) on `--surface` or `--surface-strong` backgrounds, maintaining ≥4.5:1 ratio
- **Touch targets:** `.dashboard-action-btn` maintains 44px minimum height; links are large enough for touch
- **Screen readers:** Modal uses `role="dialog"` with proper focus trapping via `AttestationConfirmModal`; quick actions list uses semantic `<ul>`/`<li>`
- **Reduced motion:** Grid layout changes use no animation/transitions — they are instant reflows at breakpoints
- **200% zoom:** `auto-fit` metrics grid + percentage-based gaps allow reflow without horizontal scroll

---

## Edge Cases

| State | Behavior |
| --- | --- |
| **0–2 metrics** | `auto-fit` expands cards to fill available width; no orphan cards |
| **>3 metrics** | Cards automatically wrap; at tablet, forms 2-col rows; at desktop, forms 3+ col rows |
| **Long metric labels** | `minmax(160px, 1fr)` prevents cards from shrinking below readable width |
| **Sidebar overlay open** | At <768px, overlay covers content; layout remains single-col behind overlay |
| **Density: compact** | Respects `--density-gap` and `--density-padding` tokens for tighter spacing |
| **Theme: light** | All tokens resolve to light-theme values; contrast ratios verified for both themes |

---

## Validation

- **Breakpoints tested:** 320px, 480px, 600px, 768px, 834px (iPad portrait), 900px, 1024px, 1280px
- **Lint:** `npm run lint` passes
- **Typecheck:** `npx tsc --noEmit` passes
- **Tests:** `npm test` passes with >95% coverage on Dashboard
- **Keyboard:** Tab through links, buttons, and modal dialog works at all breakpoints
