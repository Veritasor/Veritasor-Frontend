# Reduced-Motion Fallback Specification

## Document Metadata

- Owner: UX Design and Research
- Partners: Engineering, Accessibility QA
- Status: Implemented — companion to `motion-reduced-motion-policy.md`
- Scope: Every animated component in the dashboard, its default motion, and its `prefers-reduced-motion` fallback
- WCAG baseline: WCAG 2.1 AA (Success Criterion 2.3.3 — Animation from Interactions)

## Purpose

`motion-reduced-motion-policy.md` defines the component-agnostic motion system. This document is the
**per-component specification**: it lists every animated component, classifies its reduced-motion
fallback as one of three predictable behaviors, and pins the implementation details so behavior is
reviewable and testable.

## Fallback classification

| Classification | Meaning |
| --- | --- |
| **Fade-only** | Any translate/scale path is removed; only opacity animates, capped at `--motion-duration-xs` (80 ms) |
| **No motion** | All transition/animation properties are removed (`transition: none` / `animation: none`); state changes are instant |
| **Dampened** | Duration shortened and amplitude reduced, but a (usually single-axis, opacity-only) transition remains |

## Per-component fallback table

| Component | File(s) | Default motion | Reduced-motion fallback | Classification |
| --- | --- | --- | --- | --- |
| Toast | `src/components/ToastItem.tsx`, `src/index.css` (`.toast-entering`, `.toast-exiting`) | Enter: slide + scale + fade (`toast-enter`, `--motion-duration-lg`). Exit: slide + fade (`toast-exit`, `--motion-duration-sm`). JS auto-dismiss 300 ms enter / 200 ms exit timers | `@keyframes` redefined to opacity-only; `.toast-entering`/`.toast-exiting` run at `--motion-duration-xs`. JS timers honour `useReducedMotion()` (80 ms both phases) | Fade-only |
| Modal | `src/index.css` (`.modal-backdrop`, `.modal-dialog`, `modal-in`) | Backdrop: fade in. Dialog: fade + scale (0.98 → 1) at `--motion-duration-md` | `modal-in` collapses to opacity-only at `--motion-duration-xs` | Fade-only |
| Drawer (audit log) | `src/components/audit-log/AuditLogDetailDrawer.tsx` (`auditDrawerIn`, `auditDrawerBackdropIn`) | Slide from right (`--motion-duration-lg`) + backdrop fade (`--motion-duration-md`) | In-component `<style>` block redefines keyframes to opacity-only at `--motion-duration-xs` | Fade-only |
| Drawer (API key detail) | `src/components/api-keys/ApiKeyDetailPanel.tsx` (`apiKeyDrawerIn`, `apiKeyDrawerBackdropIn`) | Slide from right (200 ms) + backdrop fade (150 ms) | In-component `<style>` block redefines keyframes to opacity-only at `--motion-duration-xs` | Fade-only |
| Skeleton shimmer | `src/index.css` (`.skeleton`) | `shimmer` background sweep, 2 s infinite | Swapped to `pulse` (static-position, opacity) 2 s infinite | Dampened |
| Skeleton crossfade | `src/components/SkeletonLoader.tsx` (`CrossfadeReveal`) | Staggered opacity crossfade (40 ms/step) | CSS transitions disabled — swap is instant; `loaded` still toggles visibility | No motion |
| Progress — wizard steps | `src/components/WizardProgress.tsx`, `src/index.css` (`.wizard-progress-item`, `.wizard-progress-marker`) | Background/border/color transitions (200 ms) + current-marker scale 1.06 | `transition: none` on both classes; marker scale removed | No motion |
| Progress — attestation timeline | `src/components/AttestationProgress.tsx`, `src/index.css` (`.ap-step`, `.ap-step-panel`, `.ap-chevron`) | Panel `max-height` expand (200 ms), background (140 ms), chevron rotate (140 ms) | `transition: none` on all three classes; expand/collapse is instant | No motion |
| Progress — usage meter fill | `src/components/UsageMeter.tsx` | Fill width transition 400 ms `cubic-bezier(0.2, 0, 0, 1)` | In-component `<style>` block: `transition: none !important` on the fill | No motion |
| Charts (entrance) | `src/index.css` (`.chart-entrance*`) | Bar-grow / line-draw scale entrances (`--motion-duration-lg`) | All collapsed to `chart-fade-in` at `--motion-duration-xs`, no transform | Fade-only |
| FAB loading spinner | `src/components/TriggerAttestationFAB.tsx` | `fab-spin` rotation, 1 s infinite | In-component `<style>` block: rotation disabled, `transition: none` | No motion |
| Address autocomplete spinner | `src/components/AddressAutocomplete.tsx` | `addr-spin` rotation, 0.7 s infinite | `animation: none` in `@media (prefers-reduced-motion: reduce)` | No motion |

## Rules for new animated components

1. All motion must use the `--motion-*` tokens from `motion-reduced-motion-policy.md`. Never hardcode durations or easing.
2. Every animation/transition must have a `@media (prefers-reduced-motion: reduce)` override in the same file (or a co-located `<style>` block when inline styles are unavoidable).
3. JS timing (timeouts driving animation state machines) must read the user preference through `useReducedMotion()` (`src/hooks/useReducedMotion.ts`) so DOM lifecycle never outlasts the CSS animation.
4. Do not use `transition` or `animation` in JSX `style` props — the ESLint rule `veritasor/no-inline-motion` warns on direct usage. Move motion to classes in `src/index.css` (or a co-located `<style>` block) where the reduced-motion override can live next to the rule.

## Validation checklist

- [ ] `npm run lint` passes (includes `veritasor/no-inline-motion` warnings)
- [ ] `npm run test` passes (CSS contract tests in `src/test/motion-tokens.test.ts`, ToastItem reduced-motion timing in `src/test/toast.test.tsx`, lint rule tests in `eslint-rules/no-inline-motion.test.js`)
- [ ] Manual pass with OS `prefers-reduced-motion: reduce` enabled: toasts fade (no slide), modals/drawers fade, skeletons pulse (no sweep), progress steps swap instantly, focus trap/order unaffected
- [ ] Keyboard and screen-reader pass: reduced-motion never hides content or delays focus

## Revision Notes

- `2026-08-02`: Initial per-component fallback specification (issue #302). Added modal entrance animation, wizard/attestation progress CSS overrides, reduced-motion-aware ToastItem timers, and `veritasor/no-inline-motion` lint rule.
