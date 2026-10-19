# Accessible Toast & Notification Design System

This document outlines the UX/UI specifications, accessibility implementation, and responsive behaviors for the transient feedback system (toasts) in Veritasor.

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
- **Icons**: Non-color cues via custom SVG icons:
  - **Success**: Checkmark circle.
  - **Info**: Information "i" circle.
  - **Warning**: Exclamation triangle.
  - **Error**: Exclamation warning circle.
- **Dismissal**:
  - All toasts include an explicit close `button` with a clear SVG close icon.
  - Close buttons support focus rings (`outline: 2px solid var(--accent)`) for keyboard users.
  - Buttons carrying an undo affordance expose `aria-keyshortcuts="Enter"`; close buttons expose `aria-keyshortcuts="Escape"`.

### Auto-Dismiss & Persistence Rules
To ensure users have enough time to react but critical notifications are never silently lost, dismissal cadence depends on severity **and** the presence of an undo affordance:

| Severity | Base auto-dismiss | With `onUndo`          | Notes                                            |
| -------- | ----------------- | ---------------------- | ------------------------------------------------ |
| Success  | 5 000 ms          | 8 000 ms (5 s + 3 s)   | Confirmation feedback, low priority              |
| Info     | 5 000 ms          | 8 000 ms (5 s + 3 s)   | Informational context, low priority              |
| Warning  | Persist (0 ms)    | Persist (0 ms)         | Always explicit dismiss; critical even with undo |
| Error    | Persist (0 ms)    | Persist (0 ms)         | Always explicit dismiss; critical                |
| Group    | Persist           | n/a (group has no undo)| Always explicit dismiss via the group's clear-all |

These values live in [`src/components/toastRules.ts`](../src/components/toastRules.ts) (`AUTO_DISMISS_MS` + `UNDO_EXTRA_MS`) so they can be tuned from a single source.

---

## 2. Stack, Group, and Dismiss Behavior

### Stack cap

To prevent the corner from being eaten by an endless list of toasts, every toast belongs to a virtual stack capped at:

- **Desktop (≥481 px viewport width)**: 3 individual toasts visible at any time.
- **Mobile (≤480 px viewport width)**: 1 individual toast — secondary actions stay tucked behind a group summary to avoid covering on-screen keyboards and bottom-tab navigation.

The cap is enforced by `splitStack(items, maxVisible)` in `toastRules.ts`. The newest `maxVisible - 1` toasts are kept visible; older ones fall into the overflow group.

### Overflow group summary

When the stack exceeds the cap, the oldest items collapse into a single status region called the **overflow group summary**:

- Renders **above** the visible newest items (so the latest feedback gets prime visual real estate).
- Trigger button: `Previous notifications ▸ N`, with `role="status"` on the wrapper and `aria-expanded` on the trigger.
- Activating the trigger (`Enter`, `Space`, or click) reveals every collapsed toast inline as a regular toast with its own undo/close button.
- A small "clear all" button `(x)` in the summary header removes every collapsed entry in one action.

The count badge is announced as part of the screen reader label via `<span class="sr-only">Show N previous notifications</span>` so the trigger's accessible name reads naturally.

### Dismissal semantics

- **Close button on a single toast**: Removes only that toast. The `onUndo` callback is **not** called.
- **Undo button on a single toast**: Calls `onUndo()` then removes the toast. This is the only path that invokes the undo handler.
- **Clear-all button on the group summary**: Removes every collapsed toast **without** invoking any of their `onUndo` callbacks (consistent with a hard dismiss).
- **`Escape` key**: Dismiss the **topmost (most recent) toast only** — repeating `Escape` peels off the stack one entry per press. The handler is scoped to the `.toast-container` so it does not interfere with other dialogs (e.g. `ShortcutsOverlay`).
- **Auto-dismiss**: Honours the cadence table above. Hover or keyboard focus pauses the timer for the active toast; after blur/leave the timer resumes from where it left off.

### Why no auto-focus on Undo

Industry guidance and internal accessibility review agree: stealing focus from the user's current task to surface a transient toast is a violation of WCAG 2.4.3 and confuses screen-reader users mid-flow. Instead, the container uses `aria-live="polite"` so new undoable toasts are announced, and the `Undo` button itself exposes `aria-keyshortcuts="Enter"` so keyboard users can act on a nearby toast without hunting.

---

## 3. Accessibility Compliance (WCAG 2.1 AA)

To satisfy accessibility requirements, the toast container and individual items utilize specific attributes and behavior controls:

### Live Region
- The toast container employs `aria-live="polite"` and `aria-atomic="false"`.
  - `aria-live="polite"`: Screen readers announce new toasts when they occur without interrupting active user speech/actions.
  - `aria-atomic="false"`: Screen readers announce only the newly added toast, so a stack of five does not cause re-announcement of the first four every time the fifth appears.
- The screen-reader announcers are assigned semantic HTML roles:
  - **Error & Warning toasts** use `role="alert"` so screen readers announce them assertively.
  - **Success and Info toasts** use `role="status"` so the announcement stays polite.
- The group summary is itself a single `role="status"` region so its expanding/collapsing state change is announced once, not on every leave/enter of focus inside.

### Keyboard Interactivity
- **Dismiss via Keyboard (Escape)**: A scoped `keydown` handler on the `.toast-container` removes the topmost toast. This scoping prevents Escape from conflicting with other dialogs (shortcut overlay, command palette). Repeated presses peel the stack one entry at a time.
- **Accessible Naming**: Close buttons expose `aria-label="Close notification"`; the group's clear-all button exposes `aria-label="Dismiss all N previous notifications"`.
- **Undo Activation**: Undo buttons carry `aria-keyshortcuts="Enter"` so keyboard users have an unambiguous path to act.
- **Focus Rings**: Focused interactive elements maintain highly visible turquoise outlines (`3px solid rgba(94, 234, 212, 0.35)`).

### Visual Accessibility
- **Contrast**: Text uses light colors on a dark theme (`#f8fbff` / `#adc0d9` on `#0f1b30`), exceeding the WCAG **4.5:1** contrast ratio. The group summary uses the same palette so it remains ≥4.5:1 in both light and dark themes.
- **Non-Color Cues**: Success/error/warning states use distinct icons in addition to color borders to convey status.
- **Reduced Motion**: Supports `@media (prefers-reduced-motion: reduce)` to disable transition animations for users with vestibular/motion sensitivities and to swap enter/exit animations for opacity fades only.

---

## 4. Responsive Breakpoints

| Breakpoint                  | Visible cap | Container layout                                |
| --------------------------- | ----------- | ----------------------------------------------- |
| `≥481 px` (desktop / tablet)| 3           | Bottom-right, `max-width: min(400px, 100vw – 2 × 1.5rem)` |
| `≤480 px` (mobile portrait) | 1           | Bottom-anchored, full-width, `left/right: 0.75rem` |

The mobile cap exists because the on-screen keyboard and bottom-tab bar would otherwise be obscured; older items still live in the group summary above the newest one.

---

## 5. Source-of-Truth Cross-References

| Concern                | Implemented in                                                  | Tested in                                                  |
| ---------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| Stack cap + cadence    | `src/components/toastRules.ts`                                  | `src/test/toast-rules.test.ts`                             |
| Container + grouping + scoped Escape | `src/components/ToastContainer.tsx`                  | `src/test/toast-stacking.test.tsx`                         |
| Group summary render + Escape clear-all | `src/components/ToastGroup.tsx`                      | `src/test/toast-stacking.test.tsx`                         |
| Item rendering / focus / aria-keyshortcuts / idempotent exit | `src/components/ToastItem.tsx`        | `src/test/toast.test.tsx`, `src/test/toast-stacking.test.tsx` |
| Context + dismissal    | `src/components/ToastContext.tsx`                               | `src/test/toast.test.tsx`                                  |
| Stacking integration (Escape, undo-extended cadence, group clear-all, mobile cap) | `src/components/ToastContainer.tsx`, `src/components/ToastItem.tsx` | `src/test/toast-stacking.test.tsx` |

Changing a number on this page? Update `toastRules.ts` in the same commit so the spec and the code never drift.
