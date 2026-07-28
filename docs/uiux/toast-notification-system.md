# Accessible Toast & Notification Design System

This document outlines the UX/UI specifications, accessibility implementation, and responsive behaviors for the transient feedback system (toasts) in Veritasor.

> **Codification update — issue [#292]**:
> Stacking rules, collapse-to-group behaviour and severity-based dismiss
> cadence are now enforced by `ToastContext` and `ToastContainer`. Tests in
> `src/test/toast.test.tsx` lock these rules in place at ≥95% coverage.

---

## 1. Visual & Interaction Design

Toasts are used to provide lightweight, transient feedback about an action (e.g., copying a Merkle root, disconnecting a source, or sending a recovery link).

### Design Specifications
- **Placement**:
  - **Desktop**: Bottom-right corner (`bottom: 1.5rem`, `right: 1.5rem`), stacking upwards to preserve space and match natural scanning patterns.
  - **Mobile**: Bottom-center (`bottom: 1rem`), stretching full-width with horizontal padding for optimal touch targets and thumb reachability.
- **Styling**: Glassmorphism aesthetic.
  - **Background**: `rgba(15, 23, 42, 0.92)` with `backdrop-filter: blur(12px)`.
  - **Border**: `1px solid var(--border)` with custom status borders and colors:
    - **Success**: Left border `4px solid var(--success)` (`#34d399`), border outline `rgba(52, 211, 153, 0.3)`.
    - **Info**: Left border `4px solid var(--border-strong)` (`#60a5fa`), border outline `rgba(96, 165, 250, 0.3)`.
    - **Warning**: Left border `4px solid var(--warning)` (`#fbbf24`), border outline `rgba(251, 191, 36, 0.3)`.
    - **Error**: Left border `4px solid var(--danger)` (`#fb7185`), border outline `rgba(251, 113, 133, 0.3)`.
  - **Group summary**: Dashed accent border (`rgba(94, 234, 212, 0.35)`), uses the design-system accent gradient surface.
- **Icons**: Non-color cues via custom SVG icons:
  - **Success**: Checkmark circle.
  - **Info**: Information "i" circle.
  - **Warning**: Exclamation triangle.
  - **Error**: Exclamation warning circle.
  - **Group**: Stacked-cards glyph using the accent color.
- **Dismissal**:
  - All visible toasts include an explicit close `button` with a clear SVG close icon.
  - Group summary exposes a "Show all" disclosure (`aria-expanded`) and a "Clear all" close button.
  - Close buttons support focus rings (`outline: 2px solid var(--accent)`) for keyboard users.

---

## 2. Stacking & Collapse-to-Group Rules (issue #292)

| Constant                  | Value | Source                              |
| ------------------------- | ----- | ----------------------------------- |
| `MAX_VISIBLE_TOASTS`      | `3`   | `src/components/ToastContext.tsx`   |
| `COLLAPSE_THRESHOLD`      | `4`   | Derived as `MAX_VISIBLE_TOASTS + 1` |
| `UNDO_EXTENDED_CADENCE_MS`| `8000`| `src/components/ToastContext.tsx`   |

### How the queue is split

When `queue.length < COLLAPSE_THRESHOLD`, every toast is rendered
individually. Once the threshold is reached or exceeded, the renderer keeps
**only the most recent `MAX_VISIBLE_TOASTS`** in the visible stack and
collapses every older entry into a single summary card (`GroupedToast`).

The container renders the summary card **on TOP of the visible stack** so
the most recent action stays at the bottom-right corner (next to other
viewport affordances).

> Visual: Add a 4th toast → 1 visible collapses to summary. Add a 5th →
> 2 collapse. Maximum additional visible count beyond individual stack
> is unbounded; older entries always collapse, never get dropped silently.

### Group summary UX

- **Default state**: Dashed-border card with a `${count} more
  notifications` message, "Show all" disclosure button, and close (clear)
  button.
- **Show all**: Toggles the card into an expanded list (`<ul>`) showing
  every collapsed toast with its severity badge. Each list item has its
  own dismiss button.
- **Clear all**: Removes every toast in the overflow (the visible stack
  remains). The card animates exit and unmounts.
- **Show-all disclosure** uses `aria-expanded` so assistive tech tracks the
  collapsed/expanded state.

### Escape key dismiss behaviour

A single `Escape` keypress now dismisses only the **topmost** toast — the
most recently added — rather than clearing the entire queue. Successive
`Escape` presses step through the visible stack one toast at a time and
ultimately clear the group when no individual toasts remain.

> Before #292, every toast listened for `Escape` and dismissed
> simultaneously. The new behaviour mirrors Linear, Slack and macOS
> notification patterns where Escape removes a single, focused or
> most-recent item.

---

## 3. Auto-Dismiss Cadence (per severity)

To ensure users do not miss critical notifications, auto-dismiss timing depends on the severity:

| Severity    | Default duration | When `onUndo` is present | Notes                          |
| ----------- | ---------------- | ------------------------ | ------------------------------ |
| `success`   | **5000ms**       | 5000ms                   | Low-priority confirmations.    |
| `info`      | **5000ms**       | **8000ms**               | Undo affordance gets more time.|
| `warning`   | **Persist**      | **Persist**              | Manual dismiss only.           |
| `error`     | **Persist**      | **Persist**              | Manual dismiss only.           |

> Cadence constants are exposed via `DEFAULT_CADENCE_MS` and
> `UNDO_EXTENDED_CADENCE_MS` so consumers (e.g. tests) can reason about
> timing without re-implementing the table. `resolveDuration(type,
> duration, hasUndo)` is the authoritative helper.

The countdown UI (`.toast-progress-bar`) only renders for toasts with a
non-zero duration; persistent severities omit the bar entirely and rely on
the explicit close button and Escape keypress.

---

## 4. Accessibility Compliance (WCAG 2.1 AA)

### Live Region
- The toast container employs `aria-live="polite"` and `aria-atomic="false"`.
  - `aria-live="polite"`: Screen readers announce new toasts without interrupting active user speech/actions.
  - `aria-atomic="false"`: Screen readers read just the added message rather than re-reading the entire queue.
- Roles:
  - **Error toasts** use `role="alert"` for assertive screen-reader announcement.
  - **Success, Info, and Warning toasts**, plus the **group summary**, use `role="status"` to stay in the polite live region.

### Keyboard Interactivity
- **Dismiss via Keyboard**: Pressing `Escape` dismisses only the **topmost** toast (most recently added). Successive presses step through the stack.
- **Group navigation**: Tab to focus "Show all" then Enter/Space to expand or the close button to clear.
- **Accessible Naming**: Close button uses `aria-label="Close notification"` / `"Clear all grouped notifications"`. "Show all" uses `aria-label="Show all ${count} grouped notifications"` and `aria-expanded`.
- **Focus Rings**: Focused interactive elements maintain highly visible turquoise outlines (`3px solid rgba(94, 234, 212, 0.35)`).

### Visual Accessibility
- **Contrast**: Text uses light colors on a dark theme (`#f8fbff` / `#adc0d9` on `#0f1b30`), exceeding the WCAG **4.5:1** contrast ratio.
- **Non-Color Cues**: Success/info/warning/error/group states use distinct icons in addition to color borders to convey status.
- **Reduced Motion**: Supports `@media (prefers-reduced-motion: reduce)` to disable translate/scale animations for users with vestibular/motion sensitivities.

---

## 5. Responsive Behaviour

- Container `max-width: min(400px, calc(100vw - 2 * var(--space-6)))` ensures
  the stack never exceeds the viewport margins on mobile.
- The group summary collapses its expanded list to a fixed `max-height: 16rem`
  internal scroll on small screens, so it never pushes the visible stack off
  the viewport.
- All actionable controls maintain a minimum 44×44px hit target via the
  `--space-touch` token, satisfying WCAG 2.5.5.
