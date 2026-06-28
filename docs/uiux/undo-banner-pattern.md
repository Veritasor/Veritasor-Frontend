# Undo and Redo Action Banner Pattern

## References
- **Issue**: `#190`
- **Pattern**: System-Wide Reliability Affordance / Undo Toast
- **Route / Context**: Integrated with `ToastContext.tsx`, `ToastItem.tsx`, and triggered in `RevenueSources.tsx`

---

## 1. Visual & Interaction Design

The Undo/Redo Banner pattern is designed as a non-intrusive, transient notification that appears in response to critical, destructive, or hard-to-reverse actions (e.g., disconnecting a sync partner or revenue source).

### Layout & Spacing
- **Desktop**: Renders at the bottom-right corner of the viewport (`bottom: 1.5rem`, `right: 1.5rem`). Multiple toasts stack upwards. Width is locked at `380px` for consistency.
- **Mobile**: Stacks at the bottom-center of the viewport (`bottom: 1rem`), stretching full-width with a comfortable margin to maximize thumb reachability.
- **Glassmorphism Theme**: Uses a dark translucent background (`rgba(15, 23, 42, 0.92)`) with a blur filter (`backdrop-filter: blur(12px)`) to remain high-contrast on any underlying dashboard content.

### Timer & Interactive Controls
- **Countdown Visual**: A linear turquoise progress bar (`.toast-progress-bar`) runs along the bottom of the toast panel, showing the time remaining until auto-dismissal.
- **Pause on Interaction**: Hovering the mouse over the toast or focusing any element within the toast (e.g., the Undo button) immediately pauses the timer and stops the progress bar countdown.
- **Resume on Blur/Leave**: The countdown and visual progress resume as soon as the mouse leaves the toast container and focus is shifted away.

---

## 2. Accessibility Compliance (WCAG 2.1 AA)

- **Semantic Role**: Uses `role="status"` for polite live region announcements. This ensures screen readers announce the action feedback without disrupting active speech.
- **Keyboard Traversal**: The "Undo" action and "Close" button are fully focusable, displaying a distinct focus ring (`3px solid rgba(94, 234, 212, 0.35)`) with a `2px` offset.
- **Global Key Dismissal**: Users can press the `Escape` key at any time to immediately close/dismiss the active notification.
- **Text Alternatives**: The close action uses an SVG icon with a screen-reader friendly `aria-label="Close notification"`.
- **Target Sizes**: The touch height of the banner is at least `var(--space-touch)` (`3.5rem` / `56px`), exceeding the minimum standard for touch targets.

---

## 3. System-Wide List of Undoable Actions

The following list identifies candidate actions throughout Veritasor that must trigger this undoable banner:

1. **Disconnecting Revenue Integrations** (Implemented): Disconnecting active sources (Stripe, Shopify, QuickBooks).
2. **Archiving Attestation Proofs**: Hiding or removing historically attested files from the public ledger grid.
3. **Muting Account Warning Rules**: Temporarily ignoring warnings on API sync failures or credentials.
4. **Clearing Onboarding Setup Drafts**: Clicking "Reset Form" or "Clear Setup" inside multi-step onboarding flows.
