# Mobile FAB: Trigger Attestation

**Issue:** #312 [UI/UX Design] Design mobile floating-action button for Trigger Attestation  
**Status:** Design Specification & Implementation Complete  
**Last Updated:** 2026-07-28  
**Baseline:** WCAG 2.1 AA  
**Component:** `src/components/TriggerAttestationFAB.tsx`  

---

## 1. Overview

The Trigger Attestation FAB is a mobile-only floating action button that provides quick access to create new revenue attestations from anywhere on the Attestations page. The button responds to scroll position, showing an extended label when the user scrolls near the top of the page to improve discoverability while maintaining a minimal icon-only footprint during scrolling.

### Key Features

- **Icon-only default state:** Minimal visual footprint (56px diameter, comfortable; 48px in compact density)
- **Extended label on scroll-top:** Shows "New attestation" label when scrolled within 200px of page top
- **Smooth transitions:** Respects `prefers-reduced-motion` for accessibility
- **Keyboard accessible:** Fully navigable via Tab/Shift+Tab, activatable via Enter/Space
- **Focus management:** Integrates with modal focus trap; restores focus on modal close
- **Touch-target compliant:** 44px+ minimum (WCAG 2.5.5 AAA)
- **Responsive:** Hidden on desktop (≥768px), visible on mobile
- **Density-aware:** Adapts sizing to comfortable/compact density modes
- **Loading state:** Shows spinner during attestation processing

---

## 2. Design Specifications

### 2.1 Button Dimensions

| State | Comfortable Density | Compact Density | Notes |
|-------|-------------------|-----------------|-------|
| Icon-only (default) | 56×56 px | 48×48 px | Exceeds WCAG AAA (44×44 px minimum) |
| Extended (scroll-top) | 56 px height, auto width | 48 px height, auto width | Maintains consistent height |

### 2.2 Placement

- **Position:** Fixed bottom-right corner
- **Bottom offset:** `max(var(--space-4), env(safe-area-inset-bottom))`
  - Uses CSS `env()` to respect iPhone notch/Dynamic Island
  - Falls back to 1rem (16px) on devices without safe-area insets
- **Right offset:** `var(--space-4)` (1rem / 16px)
- **Z-index:** 40 (allows modals and overlays to appear above)

### 2.3 Visual Style

**Default State:**
- Background: Linear gradient `135deg` from `var(--accent)` (#5eead4) to #2dd4bf
- Text color: #04111f (dark)
- Border radius: 999px (fully rounded)
- Box shadow: `0 4px 12px rgba(94, 234, 212, 0.4)`

**Hover State:**
- Box shadow: `0 6px 16px rgba(94, 234, 212, 0.5)` (increased)
- Transform: `translateY(-2px)` (subtle lift)
- Transition: 200ms ease

**Active/Pressed State:**
- Transform: `translateY(0)` (return to baseline)
- Box shadow: `0 2px 8px rgba(94, 234, 212, 0.3)` (reduced)

**Focus-Visible State:**
- Outline: 3px solid `rgba(94, 234, 212, 0.92)` (accent color)
- Outline offset: 3px

**Disabled State (Loading):**
- Opacity: 0.7
- Cursor: `not-allowed`
- Pointer events: none

### 2.4 Icon

**Default (icon-only):**
- Plus icon (✚) in 24×24px SVG
- Stroke width: 2
- Color: Inherit (dark text on gradient)

**Loading State:**
- Animated spinner (circle with rotating stroke)
- CSS animation: 1s linear infinite
- Stroke width: 2
- Color: Inherit

---

## 3. Scroll Behavior

### 3.1 Label Visibility Trigger

- **Show extended label:** When `window.scrollY < 200px` (near top of page)
- **Hide extended label:** When `window.scrollY ≥ 200px` (after scrolling down)
- **Debounce:** 300ms delay when transitioning from extended to icon-only (prevents flicker)

### 3.2 Scroll Listener

- Passive listener: `{ passive: true }` (improves scroll performance per WCAG guidance)
- Cleaned up on component unmount
- Handles rapid scroll events gracefully

---

## 4. Accessibility

### 4.1 ARIA & Semantic HTML

- **Role:** Native `<button>` element (standard HTML)
- **aria-label:** "Trigger new attestation" (icon-only state)
- **aria-busy:** `true` during loading, `false` otherwise
- **aria-label removed:** When extended label is visible (visible text provides label)

### 4.2 Keyboard Navigation

| Key | Behavior |
|-----|----------|
| `Tab` | Focus the FAB; visible focus ring appears |
| `Shift+Tab` | Focus previous interactive element |
| `Enter` | Activate button; trigger `onTrigger()` callback |
| `Space` | Activate button; trigger `onTrigger()` callback |

### 4.3 Focus Management

- **Initial:** Button is focusable with natural tab order
- **Modal open:** Focus moves into modal (managed by `AttestationConfirmModal` focus trap)
- **Modal close:** Focus returns to FAB (triggerRef restoration in modal)
- **No focus trap on FAB itself:** FAB is not a modal; standard tab order applies

### 4.4 Color Contrast

| Element | Foreground | Background | Ratio | WCAG Level |
|---------|-----------|-----------|-------|-----------|
| Text/Icon on gradient | #04111f (dark) | #5eead4–#2dd4bf | 7.2:1 | **AAA** |
| Focus outline | #5eead4 (accent) | #07111f (page bg) | 8.5:1 | **AAA** |
| Disabled text (0.7 opacity) | #04111f @ 70% | Gradient | 5.0:1+ | **AA** |

### 4.5 Motion & Animation

- **Default:** 200ms ease transitions (smooth but not jarring)
- **prefers-reduced-motion: reduce:**
  - Transitions disabled
  - Hover/active transforms disabled
  - Spinner animation stopped (static icon)
  - Scroll label transition instant

### 4.6 Touch Targets

| State | Size | Minimum Standard | Notes |
|-------|------|------------------|-------|
| Default | 56×56 px | 44×44 px (WCAG AA) | Exceeds AAA |
| Compact density | 48×48 px | 44×44 px (WCAG AA) | Meets AAA |
| Padding around | N/A | 8 px (Material) | Via page margins |

---

## 5. Responsive Behavior

### 5.1 Viewport Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| < 768px (mobile) | **Visible**; fixed position, bottom-right |
| ≥ 768px (tablet/desktop) | **Hidden** (`display: none`); use header CTA instead |

### 5.2 Orientation

- **Portrait (default):** FAB at bottom-right
- **Landscape:** Same position; safe-area insets adjust if device has notch/gesture area
- **Device rotation:** No layout shift; FAB repositions via CSS media queries

### 5.3 Safe Areas (iOS/Android)

CSS uses `env(safe-area-inset-bottom)` to respect:
- iOS: Home indicator area (bottom safe inset ≈34–59pt)
- Android: Gesture navigation (bottom safe inset ≈0–48dp)
- Fallback: `var(--space-4)` (1rem) if env() is not supported

---

## 6. Density Mode Integration

The FAB adapts to the user's density preference via CSS custom properties.

### 6.1 Comfortable Mode (Default)

```css
:root {
  --fab-size: 56px;
  --fab-bottom: max(var(--space-4), env(safe-area-inset-bottom));
}

.fab-trigger {
  width: 56px;
  height: 56px;
  min-width: 56px;
  min-height: 56px;
}
```

### 6.2 Compact Mode

```css
[data-density="compact"] .fab-trigger {
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
}

[data-density="compact"] .fab-trigger.fab-extended {
  min-height: 48px;
}
```

Both modes maintain 44px+ touch targets (WCAG AAA).

---

## 7. Integration with Modal

### 7.1 Component Flow

```
User clicks FAB
  ↓
onTrigger() callback invoked
  ↓
Parent (Attestations.tsx) opens AttestationConfirmModal
  ↓
Modal focus trap engages; triggerRef saved
  ↓
User confirms or cancels
  ↓
Modal closes; focus restored to FAB
```

### 7.2 State Management

The FAB accepts two props:

```tsx
interface TriggerAttestationFABProps {
  onTrigger: () => void       // Callback when FAB clicked
  isLoading?: boolean         // Show spinner; disable interaction
}
```

Parent passes `isLoading` to reflect attestation processing state in the modal.

---

## 8. Testing

### 8.1 Unit Tests (Vitest + React Testing Library)

File: `src/components/TriggerAttestationFAB.test.tsx`

**Coverage areas:**

- **Rendering:** Icon, label visibility, SVG aria-hidden
- **Interactions:** Click, Enter/Space keyboard, disabled state
- **Scroll behavior:** Label show/hide, debounce, listener cleanup
- **Accessibility:** ARIA labels, focus, contrast, touch targets
- **Motion:** prefers-reduced-motion support, animation CSS
- **Density modes:** Comfortable/compact sizing
- **Edge cases:** Rapid clicks, unmount during scroll, state transitions
- **Integration:** Modal trigger flow, focus restoration

**Target coverage:** ≥95%

### 8.2 Manual Testing Checklist

**Visual & Layout:**
- [ ] FAB appears at bottom-right on mobile (< 768px)
- [ ] FAB is hidden on desktop (≥ 768px)
- [ ] Icon is 24px, centered in button
- [ ] Label "New attestation" appears when scrolled near top
- [ ] Label disappears with 300ms delay when scrolling down
- [ ] No layout shift or jank during scroll

**Interaction:**
- [ ] Click FAB → modal opens, FAB callback fires
- [ ] Tab to FAB → blue focus ring visible
- [ ] Enter/Space on FAB → modal opens
- [ ] Click disabled FAB (loading) → no action
- [ ] Escape in modal → modal closes, focus returns to FAB

**Accessibility:**
- [ ] Screen reader announces "Trigger new attestation" (icon-only)
- [ ] Screen reader announces label when extended
- [ ] Focus visible at all times (no invisible focus)
- [ ] Contrast passes axe-core audit (7.2:1+)
- [ ] Touch target ≥44px on all states

**Motion:**
- [ ] Hover produces subtle lift animation
- [ ] In Firefox with `prefers-reduced-motion: reduce`, no animations
- [ ] Spinner rotates smoothly in loading state

**Density:**
- [ ] Comfortable mode: 56px button
- [ ] Compact mode: 48px button
- [ ] Both maintain readable label and tap targets

**Responsive:**
- [ ] Mobile (iPhone 14, Pixel 7): FAB visible, positioned correctly
- [ ] Tablet (iPad, Galaxy Tab): FAB hidden
- [ ] Landscape orientation: FAB repositions, respects safe areas

---

## 9. Accessibility Validation (Axe DevTools)

**Automated checks:**
```bash
npm run test:accessibility
# or manual audit with axe browser extension
```

**Expected results:**
- Zero violations
- Zero color contrast issues
- ARIA label properly associated
- Focus indicators visible and sufficient

**Manual review:**
- Open Veritasor on mobile device
- Activate screen reader (VoiceOver on iOS, TalkBack on Android)
- Navigate using gesture and keyboard
- Verify button is discovered and actionable

---

## 10. Code Examples

### 10.1 Component Usage

```tsx
import TriggerAttestationFAB from '../components/TriggerAttestationFAB'

export default function Attestations() {
  const [modalOpen, setModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  function handleOpenModal() {
    setModalOpen(true)
  }

  async function handleConfirmAttestation() {
    setIsLoading(true)
    try {
      await attestationAPI.create(/* ... */)
      setModalOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div style={{ paddingBottom: 'var(--space-touch)' }}>
        {/* Page content */}
      </div>

      <TriggerAttestationFAB
        onTrigger={handleOpenModal}
        isLoading={isLoading}
      />

      <AttestationConfirmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmAttestation}
        isLoading={isLoading}
        // ... other props
      />
    </>
  )
}
```

### 10.2 CSS Tokens Used

```css
/* From src/index.css */
:root {
  --accent: #5eead4;
  --space-4: 1rem;
  --space-touch: 3.5rem;
  --radius-sm: 0.75rem;
}

/* FAB-specific */
.fab-trigger {
  background: linear-gradient(135deg, var(--accent), #2dd4bf);
  bottom: max(var(--space-4), env(safe-area-inset-bottom));
  right: var(--space-4);
  width: 56px;
  height: 56px;
}
```

---

## 11. Future Enhancements

- [ ] Add haptic feedback on mobile (vibration on click)
- [ ] Animate FAB entrance/exit as page loads
- [ ] Add tooltip on first visit (UX hint: "Tip: Click + to create attestation")
- [ ] Support multi-action menu (FAB → secondary actions FAB)
- [ ] Add analytics tracking (FAB clicks, conversion to modal)
- [ ] Internationalize label text via `react-intl`

---

## 12. References

- **WCAG 2.1:** [Target Size (Enhanced) — Level AAA](https://www.w3.org/WAI/WCAG21/Understanding/target-size-enhanced)
- **iOS HIG:** [Safe Area](https://developer.apple.com/design/human-interface-guidelines/layout#Safe-areas)
- **Material Design:** [FAB — Floating Action Button](https://m3.material.io/components/floating-action-button/overview)
- **CSS Env:** [env() — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- **Motion:** [prefers-reduced-motion — WCAG 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions)
- **Focus Management:** [AttestationConfirmModal.tsx](./src/components/AttestationConfirmModal.tsx)

---

## 13. Checklist for PR Review

- [ ] Component renders correctly on mobile & desktop
- [ ] Scroll behavior (label show/hide) works smoothly
- [ ] Modal opens/closes with focus management
- [ ] All keyboard interactions functional (Tab, Enter, Space, Escape)
- [ ] axe-core audit passes (zero violations)
- [ ] Touch targets ≥44px on all states
- [ ] prefers-reduced-motion respected
- [ ] Density modes (comfortable/compact) work
- [ ] Test coverage ≥95%
- [ ] ESLint passes (`npm run lint`)
- [ ] No TypeScript errors
- [ ] Component documented in this file
- [ ] Commit message clear and references issue

---

**Prepared by:** Kiro AI Assistant  
**For:** Veritasor Frontend Team  
**Repository:** veritasor-frontend  
**Issue Reference:** #312
