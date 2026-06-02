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
