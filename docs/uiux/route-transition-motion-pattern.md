# Page Transition Motion Pattern & Exemption System

## Document Metadata

- **Owner**: UX Engineering & Accessibility QA
- **Status**: Production Standard (Issue #303)
- **Target Timing**: `120ms` Crossfade (`--motion-duration-route-crossfade`)
- **Accessibility Compliance**: WCAG 2.1 AA & WCAG 2.2 AA Baseline
- **Scope**: Route navigation transitions across authenticated dashboard workflows, authentication entry points, and modal views

---

## Overview

The Veritasor route transition motion pattern establishes a predictable, high-contrast, non-distracting visual transition during page-to-page navigation. Motion in trust-heavy revenue attestation software must preserve visual orientation without introducing artificial lag or cognitive noise.

### Key Principles

1. **Subtle & Fast**: Standard route transitions use a `120ms` crossfade duration.
2. **Context-Aware Exemptions**: Authentication screens (`/login`, `/signup`, `/forgot-password`) and modal routes/dialogs bypass crossfade motion to provide immediate response and avoid visual flicker.
3. **Reduced Motion First**: Respects `prefers-reduced-motion: reduce` system settings, falling back to instant (`0ms`) state swaps.

---

## Token Specifications

| Token Name | Value | Easing Curve | Applied Context |
| :--- | :--- | :--- | :--- |
| `--motion-duration-route-crossfade` | `120ms` | `cubic-bezier(0.2, 0, 0, 1)` | Standard layout route changes (`/dashboard`, `/attestations`, `/sources`, `/settings`) |
| `--motion-duration-none` | `0ms` | `none` | Exempt routes (Auth, Modals, Reduced Motion) |

---

## Exemption Guidance

### 1. Authentication Screens (`/login`, `/signup`, `/forgot-password`, `/reset-password`)
- **Rationale**: Users navigating to security-critical entry points expect immediate responsiveness without visual fade delays.
- **Behavior**: Instant (`0ms`) transition.

### 2. Modal Routes & Dialog Overlays
- **Rationale**: Modals render on top of current view context. Crossfading the entire page container underneath a modal creates undesirable double-flicker.
- **Behavior**: Instant (`0ms`) route transition; modal overlay entrance is managed independently by dialog motion tokens.

### 3. User Reduced Motion Preference (`prefers-reduced-motion: reduce`)
- **Rationale**: Avoid triggering vestibular discomfort or distraction for users with motion sensitivities.
- **Behavior**: Forced instant (`0ms`) transition across all routes via CSS `@media (prefers-reduced-motion: reduce)` and JS media query listener.

---

## Accessibility & Responsive Considerations

- **Keyboard Focus Management**: Route changes maintain focus on the main content landmark (`#main-content`) with `tabIndex={-1}`.
- **Screen Reader Announcements**: Container uses semantic layout wrappers and preserves `aria-live` regions for status updates without disrupting screen reader focus.
- **Responsive Breakpoints**: Works uniformly across mobile (`< 768px`), tablet, and desktop viewports.

---

## Verification & Testing Notes

- **Unit Test Coverage**: `src/test/route-transition.test.tsx` validates 120ms crossfade class application, exemption rules, and reduced motion fallbacks.
- **Automated Checks**: `npm test` and `npm run lint` pass cleanly with zero errors.
