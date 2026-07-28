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

### Auto-Dismiss & Persistence Rules
To ensure users do not miss critical notifications, auto-dismiss timing depends on the severity:
- **Success & Info**: Auto-dismisses after **5 seconds** (5000ms). These represent low-priority confirmations.
- **Warning & Error**: **Persists indefinitely** (no auto-dismiss) until explicitly closed by the user. This ensures critical alerts and cautions are not missed.


---

### Undo Toast Support
Toasts can include an optional undo action via the `onUndo` and `undoLabel` parameters. When present, an **Undo** button appears alongside the close button. Clicking the Undo button executes the undo callback and immediately dismisses the toast (with exit animation). The countdown timer pauses on hover/focus, giving users ample time to review and click Undo.

### Timer & Interactive Controls
- **Countdown Visual**: A linear turquoise progress bar (`.toast-progress-bar`) runs along the bottom of the toast, showing the time remaining until auto-dismissal.
- **Pause on Interaction**: Hovering the mouse over the toast or focusing any element within it (e.g., the Undo button) immediately pauses the timer and stops the progress bar.
- **Resume on Blur/Leave**: The countdown resumes as soon as the mouse leaves the toast container and focus is shifted away.

---

## Stacking & Grouping Rules

When multiple toasts are active simultaneously, stacking rules determine how they are displayed to avoid overwhelming the user.

### Max-Visible Threshold
- **`MAX_VISIBLE_TOASTS = 3`**: At most **3 individual toasts** are displayed at once.
- When the toast count is **≤ 3**, all toasts are rendered individually, newest first (stacking upward).
- When the toast count reaches **4 or more**, the **oldest toasts** (beyond the 3 newest) are collapsed into a **grouped summary toast**.

### Collapse-to-Group Threshold
- **Threshold**: 4+ active toasts trigger collapsing.
- **Visible**: The 3 newest toasts remain visible as individual items.
- **Collapsed**: The overflow (oldest) toasts are hidden behind a single `ToastGroup` component, rendered at the bottom of the stack.

### Grouped Toast Summary Design
The `ToastGroup` component replaces the overflow toasts with a compact summary:

**Collapsed view (default):**
- **Count badge**: A pill showing the number of collapsed notifications (e.g., "2").
- **Type chips**: Small colored indicator chips showing the count of each type (e.g., success=1, error=1).
- **Undo hint**: If any collapsed toast has an undo action, a "N undoable" label appears.
- **Chevron**: A downward chevron indicates the group is clickable to expand.
- **Progress bar**: A subtle animated indicator shows that timers are active.
- **Click to expand**: Clicking the summary expands to show individual items.

**Expanded view:**
- **Header**: Shows total count ("3 notifications") with a collapse button.
- **Item list**: Each collapsed toast is rendered individually using `ToastItem` (condensed styling: no borders, smaller buttons, no progress bars).
- **Footer actions**:
  - **Dismiss all**: Removes all collapsed toasts.
  - **Undo all**: If any collapsed toast has an undo action, executes all undo callbacks and removes the toasts.

### Dismissal & Undo Interaction
- **Dismiss all**: Removes all collapsed toasts from state immediately (no exit animation for batch dismissals).
- **Undo all**: Executes each toast's `onUndo` callback individually, then removes them.
- **Individual dismiss**: When expanded, each toast's close/undo button works normally (with exit animation).
- **Auto-dismiss**: Individual timers continue to run in the background. When a collapsed toast auto-dismisses, it's removed from state, and the group count updates automatically.

### Auto-Dismiss Cadence per Severity
| Severity | Duration | Behavior |
|---|---|---|
| `success` | 5000ms | Auto-dismisses |
| `info` | 5000ms | Auto-dismisses |
| `warning` | 0 (persistent) | Must be manually dismissed |
| `error` | 0 (persistent) | Must be manually dismissed |
| undo toasts (custom) | 8000ms default | Auto-dismisses unless custom duration specified |

### Accessibility for Grouped View
- The group summary button uses `aria-expanded="false"` and `aria-label` describing the count (e.g., "2 notifications. Click to expand.").
- The expanded item list uses `role="list"` with each item having `role="listitem"`.
- All buttons have `aria-label` attributes describing their action.
- Focus-visible outlines are applied to all interactive elements.
- Keyboard users can tab to the summary button and press Enter/Space to expand.

The `ToastGroup` component is defined in `src/components/ToastGroup.tsx` and the stacking logic lives in `src/components/ToastContainer.tsx`.

---

## 2. Accessibility Compliance (WCAG 2.1 AA)

To satisfy accessibility requirements, the toast container and individual items utilize specific attributes and behavior controls:

### Live Region
- The toast container employs `aria-live="polite"` and `aria-atomic="true"`.
  - `aria-live="polite"`: Screen readers will announce new toasts when they occur without interrupting active user speech/actions.
  - `aria-atomic="true"`: Screen readers read the entire message of the toast, not just parts.
- The screen-reader announcers are assigned semantic HTML roles:
  - **Error toasts** use `role="alert"` for assertive screen-reader announcement.
  - **Success, Info, and Warning toasts** use `role="status"` to maintain a polite live region.

### Keyboard Interactivity
- **Dismiss via Keyboard**: Each toast registers a global keydown event listener. When the keyboard focuses on any part of the UI, pressing the `Escape` key automatically closes/dismisses the active toasts.
- **Accessible Naming**: The close button uses `aria-label="Close notification"` to describe its function to screen readers.
- **Focus Rings**: Focused interactive elements maintain highly visible turquoise outlines (`3px solid rgba(94, 234, 212, 0.35)`).

### Visual Accessibility
- **Contrast**: Text uses light colors on a dark theme (`#f8fbff` / `#adc0d9` on `#0f1b30`), exceeding the WCAG **4.5:1** contrast ratio.
- **Non-Color Cues**: Success/error/warning states use distinct icons in addition to color borders to convey status.
- **Reduced Motion**: Supports `@media (prefers-reduced-motion: reduce)` to disable transition animations for users with vestibular/motion sensitivities.
