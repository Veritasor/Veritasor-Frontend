# Batch Attestation Trigger

**Issue:** #308
**Component:** `src/pages/Attestations.tsx`
**Baseline:** WCAG 2.1 AA

## Overview

The batch attestation trigger lets operators select multiple reporting periods and start them together while preserving per-period review. The design keeps the batch action close to the schedule and history views so users can understand what will run, what already ran, and which items need follow-up.

## Interaction Model

- Periods use native checkboxes in a fieldset so multi-select works with pointer, keyboard, and screen readers.
- The primary action label includes the selected count, for example `Trigger 3 periods`.
- The trigger is disabled when no periods are selected and includes visible helper text explaining why.
- Outcomes are rendered per period with text labels, not color alone.
- Partial success is summarized as success, queued, and failed counts.
- `Re-run failed` only targets failed periods and becomes disabled when there are no failed items.

## Accessibility

- Native controls provide names and keyboard behavior without custom ARIA.
- Batch status uses `role="status"` with `aria-live="polite"` and `aria-atomic="true"`.
- Result badges pair status color with visible labels and a marker.
- Buttons meet the shared `--density-touch-min` minimum target size.
- The layout uses `repeat(auto-fit, minmax(280px, 1fr))` so the picker and outcome list stack on narrow screens without horizontal scrolling.

## Visual System

- The panel uses existing tokens: `--surface`, `--surface-soft`, `--border`, `--border-strong`, `--accent`, `--success`, `--warning`, and `--danger`.
- The signature element is the three-count outcome rail, which makes partial success visible before users scan the per-period list.
- No new global CSS classes or dependencies are required.

## Verification

- Unit coverage: `src/pages/Attestations.test.tsx`
- Manual checks: keyboard tab order, checkbox toggling, disabled trigger state, result announcement, mobile stacking at 375px.
