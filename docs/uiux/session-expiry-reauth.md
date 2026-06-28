
# Session Expiry Warning &amp; Re-authentication Modal — Design System Documentation

**Components:** `src/hooks/useSession.ts`, `src/components/SessionExpiryWarning.tsx`, `src/components/ReauthModal.tsx`, `src/App.tsx`
**Standard:** WCAG 2.1 AA
**Added:** 2026-06-26

---

## Overview

This system provides automatic session timeout management with:
- A non-blocking warning that appears before session expiry
- A lightweight re-authentication modal that preserves user context
- User activity detection to automatically extend active sessions

---

## Visual Layout

### Session Expiry Warning
```
┌──────────────────────────────────────────────┐
│  Your session is about to expire             │
├──────────────────────────────────────────────┤
│  For your security, your session will expire  │
│  in 5:00. You can extend your session or     │
│  re-authenticate to continue.                │
│                                              │
│              [Extend Session] [Re-auth Now]  │
└──────────────────────────────────────────────┘
```

### Re-authentication Modal
```
┌──────────────────────────────────────────────┐
│  Please re-authenticate to continue      [✕] │
├──────────────────────────────────────────────┤
│  Your session has expired or requires        │
│  re-authentication. Please enter your        │
│  password to continue.                       │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Password: [•••••••••••]                │  │
│  └────────────────────────────────────────┘  │
│                                              │
│              [Cancel] [Continue]              │
└──────────────────────────────────────────────┘
```

---

## Hook API (`useSession`)

```ts
interface UseSessionOptions {
  sessionDurationMinutes: number;       // Total session length
  warningBeforeMinutes: number;         // When to show warning before expiry
  onSessionExpiry?: () =&gt; void;         // Callback when session expires
  onReauthSuccess?: () =&gt; void;         // Callback after successful re-auth
}

// Returns:
{
  showWarning: boolean;                 // Show expiry warning modal
  isExpired: boolean;                   // Session has expired
  isReauthenticating: boolean;          // Re-auth modal is open
  timeLeft: number;                     // Seconds remaining in session
  extendSession: () =&gt; void;            // Reset session timer manually
  initiateReauth: () =&gt; void;           // Open re-auth modal
  reauthSuccess: () =&gt; void;            // Called after successful re-auth
  resetSession: () =&gt; void;             // Full reset of all state
}
```

**User Activity Detection:**
The hook automatically detects and resets the session on:
- Mouse clicks/movement
- Key presses
- Scrolling
- Touch events

---

## ARIA Structure

### Session Expiry Warning
```html
&lt;div class="modal-backdrop"&gt;
  &lt;div
    role="dialog"
    aria-modal="true"
    aria-labelledby="session-warning-title"
    aria-describedby="session-warning-desc"
    tabindex="-1"
  &gt;
    &lt;h2 id="session-warning-title"&gt;Your session is about to expire&lt;/h2&gt;
    &lt;p id="session-warning-desc"&gt;
      For your security, your session will expire in 5:00.
      You can extend your session or re-authenticate to continue.
    &lt;/p&gt;
    &lt;button type="button"&gt;Extend Session&lt;/button&gt;
    &lt;button type="button"&gt;Re-authenticate Now&lt;/button&gt;
  &lt;/div&gt;
&lt;/div&gt;
```

### Re-authentication Modal
```html
&lt;div class="modal-backdrop"&gt;
  &lt;div
    role="dialog"
    aria-modal="true"
    aria-labelledby="reauth-title"
    aria-describedby="reauth-desc"
    tabindex="-1"
  &gt;
    &lt;h2 id="reauth-title"&gt;Please re-authenticate to continue&lt;/h2&gt;
    &lt;button type="button" aria-label="Close dialog"&gt;✕&lt;/button&gt;
    &lt;p id="reauth-desc"&gt;
      Your session has expired or requires re-authentication.
      Please enter your password to continue.
    &lt;/p&gt;
    &lt;form&gt;
      &lt;label htmlFor="reauth-password"&gt;Password&lt;/label&gt;
      &lt;input id="reauth-password" type="password" /&gt;
    &lt;/form&gt;
    &lt;button type="button"&gt;Cancel&lt;/button&gt;
    &lt;button type="submit" aria-busy="true|false"&gt;Continue&lt;/button&gt;
  &lt;/div&gt;
&lt;/div&gt;
```

---

## Focus Management

### On Open
1. Save the currently focused element (trigger)
2. Move focus programmatically to the dialog container

### Focus Trap
- `Tab`: wraps from last to first focusable element
- `Shift+Tab`: wraps from first to last focusable
- Focusable selector:
  ```
  a[href], button:not([disabled]), input:not([disabled]),
  select:not([disabled]), textarea:not([disabled]),
  [tabindex]:not([tabindex="-1"])
  ```

### On Close
- Restore focus to the saved trigger element

---

## Keyboard Interactions

| Key | Action |
|---|---|
| `Escape` | Closes modal, returns focus to trigger |
| `Tab` | Cycles focus forward within modal |
| `Shift+Tab` | Cycles focus backward within modal |
| `Enter` / `Space` | Activates focused button/input |

---

## Colour &amp; Contrast

All colours use existing design tokens from `index.css`:
- `--surface-strong` for modal background
- `--text` for primary text
- `--muted` for secondary text
- `--accent` gradient for primary buttons
- All pairings meet or exceed WCAG 2.1 AA contrast ratios

---

## Responsive Behaviour

- Follows same responsive breakpoint patterns as `AttestationConfirmModal`
- &lt;=480px: Full-width modal, stacked buttons (confirm on top)
- &gt;480px: Centered 520px modal, side-by-side buttons
- Backdrop allows scrolling on short screens

---

## Usage Example

```tsx
// In App.tsx or root layout
const session = useSession({
  sessionDurationMinutes: 30,
  warningBeforeMinutes: 5,
  onSessionExpiry: () =&gt; console.log('Session expired'),
  onReauthSuccess: () =&gt; console.log('Re-authenticated'),
});

return (
  &lt;&gt;
    {/* Your app content */}

    &lt;SessionExpiryWarning
      isOpen={session.showWarning}
      timeLeft={session.timeLeft}
      onExtendSession={session.extendSession}
      onReauth={session.initiateReauth}
    /&gt;

    &lt;ReauthModal
      isOpen={session.isReauthenticating || session.isExpired}
      onSuccess={session.reauthSuccess}
      onClose={() =&gt; {}}
    /&gt;
  &lt;/&gt;
);
```

---

## Axe Audit Checklist

- [x] Zero contrast violations
- [x] `role="dialog"` + `aria-modal` pattern
- [x] `aria-labelledby` and `aria-describedby` with valid IDs
- [x] Focus trap active while modal open
- [x] Escape closes modal + focus restored to trigger
- [x] Form inputs have correct `label` associations
- [x] No information conveyed by colour alone
- [x] Tab order follows visual order
