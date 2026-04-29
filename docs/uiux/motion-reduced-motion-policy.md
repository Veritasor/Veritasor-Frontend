# Veritasor Dashboard Motion and Reduced Motion Policy

## Document Metadata

- Owner: UX Design and Research
- Partners: Product, Engineering, Accessibility QA
- Status: Draft for UX acceptance
- Intended timeframe: 96 hours from assignment, with PM-approved extension for deeper research
- Scope: Dashboard transitions and state changes for attestations, integrations, and revenue signal experiences

## Purpose

Define a component-agnostic motion system that supports comprehension and trust while minimizing cognitive load and vestibular discomfort. This policy establishes:

- Motion tokens for consistent transition behavior
- `prefers-reduced-motion` fallback behavior
- Accessibility and interaction rules (WCAG 2.2 AA baseline)
- Edge state guidance for loading, empty, permission denied, and partial data
- Measurable UX outcomes for validation

This document is intentionally implementation-agnostic and should guide future engineering issues after UX acceptance criteria are approved.

## Product and Domain Principles

Veritasor serves trust-heavy workflows. Motion should reinforce clarity, not novelty.

- High signal, low drama: avoid decorative motion that can be interpreted as manipulation of financial, compliance, or attestation data
- Orientation before animation: use motion to preserve context during view changes and hierarchy shifts
- State truthfulness: loading and partial-data transitions must communicate uncertainty explicitly
- Predictable pacing: similar actions use similar duration and easing to build confidence

## Motion Token System

## 1) Timing tokens (duration)

Use a constrained duration scale. Values below are maximums, not defaults for all cases.

- `motion.duration.none`: `0ms` (instant updates, reduced-motion baseline)
- `motion.duration.xs`: `80ms` (micro feedback, hover/focus transitions)
- `motion.duration.sm`: `140ms` (small element transitions: chips, inline status)
- `motion.duration.md`: `200ms` (panel or card content updates)
- `motion.duration.lg`: `280ms` (dashboard section transitions)
- `motion.duration.xl`: `360ms` (layout-level transitions where orientation support is needed)

Rules:

- Avoid transitions longer than `360ms` in core dashboard workflows
- For chained transitions, total perceived time should remain under `500ms`

## 2) Easing tokens

- `motion.easing.standard`: `cubic-bezier(0.2, 0, 0, 1)` for most enter/update transitions
- `motion.easing.emphasized`: `cubic-bezier(0.2, 0, 0, 1)` with longer duration for high-context container changes only
- `motion.easing.exit`: `cubic-bezier(0.4, 0, 1, 1)` for fast exits
- `motion.easing.linear`: `linear` for indeterminate progress visuals only

Rules:

- No bounce, elastic, or overshoot easing in trust-critical views
- Avoid dual-easing combinations within a single interaction unless hierarchy demands it

## 3) Distance tokens (spatial movement)

- `motion.distance.none`: `0px`
- `motion.distance.xs`: `4px`
- `motion.distance.sm`: `8px`
- `motion.distance.md`: `16px`

Rules:

- Keep movement primarily on one axis per transition
- Avoid parallax and multi-layer depth effects for dashboard transitions
- Do not exceed `16px` travel in data-dense panels

## 4) Opacity tokens

- `motion.opacity.enter.start`: `0`
- `motion.opacity.enter.end`: `1`
- `motion.opacity.exit.start`: `1`
- `motion.opacity.exit.end`: `0`

Rules:

- Pair opacity change with minimal position change (`0-8px`) when orientation is needed
- Do not fade critical values without preserving previous context long enough for comparison

## Reduced Motion Policy (`prefers-reduced-motion`)

When user preference indicates reduced motion:

- Convert non-essential transform animations to instant state updates (`motion.duration.none`)
- Preserve only essential transitions that support orientation, capped at `80ms` and using opacity only
- Remove animated scrolling, parallax, and chart draw-in effects
- Replace pulsing or looping indicators with static or discrete-step indicators
- Preserve focus visibility and reading order without motion dependence

Behavioral matrix:

- Page/route transition: no sliding; instant swap with optional `80ms` cross-fade
- Drawer/modal: no translate animation; immediate appearance with focus trap
- Accordions: instant expand/collapse, maintain clear state affordance
- Toasts/alerts: fade only, no motion path
- Skeletons: static placeholders (no shimmer sweep)
- Charts: render final state immediately; no initial growth animation

## Dashboard Transition Patterns

## A) View and panel transitions

- Use `motion.duration.md` or `motion.duration.lg` with standard easing
- Keep outgoing and incoming content overlap below `120ms` to reduce visual clutter
- Maintain stable anchors (header, primary KPI row, nav landmarks) during transition

## B) Data refresh and reconciliation

- For auto-refresh updates, avoid aggressive content reflow animation
- Highlight changed values with subtle color/state cue rather than movement
- When data source is delayed, transition to explicit "data delayed" messaging instead of repeated animated retries

## C) Loading states and skeletons

- Initial load: skeleton or placeholder with clear region labels
- Background load: retain current data; indicate update in progress non-intrusively
- Reduced motion: static skeletons only, no shimmer

## D) Chart animation guidance

- Default: single, short intro transition for first render only (`<= 200ms`)
- No repeated replay animation on filter toggles
- Axis and scale changes should prioritize legibility over animated interpolation
- Reduced motion: no intro animation, no point-by-point motion

## E) Parallax and depth effects

- Parallax is disallowed in core dashboard and compliance workflows
- Layered depth motion is restricted to decorative marketing surfaces, not authenticated product flows

## Edge States and Interaction Rules

Define behavior independent of component implementation.

## 1) Empty state

- Explain why data is absent and what user can do next
- Include primary action where appropriate (connect integration, create attestation request)
- Motion: none or subtle fade-in (`<= 140ms`)

## 2) Loading state

- Distinguish first-load from background refresh
- Avoid layout shift by reserving stable space for eventual content
- Motion: optional subtle opacity transition; no continuous high-contrast shimmer in reduced mode

## 3) Permission denied

- Provide explicit scope ("You can view revenue summary but not account-level details")
- Offer recovery path (request access, switch workspace, contact admin)
- Motion: no celebratory or attention-grabbing motion; immediate state clarity

## 4) Partial data / degraded integration

- Mark sections with stale or missing data, include last-updated timestamp where available
- Keep unaffected sections interactive
- Motion: avoid sweeping reloads; only locally transition impacted modules

## Accessibility Baseline (WCAG 2.2 AA)

- Contrast: text and UI indicators meet AA minimums across all states, including loading placeholders and disabled controls
- Focus order: transitions must not alter logical tab sequence
- Focus visibility: visible focus indicator remains persistent during and after transitions
- Motion sensitivity: comply with reduced-motion preference and avoid trigger patterns
- Timing: no time-sensitive interactions that require rapid response during animated changes
- Error prevention/recovery: state changes should keep controls discoverable so users can recover without re-orienting

## UX Acceptance Criteria (for sign-off before engineering issue)

- Motion tokens approved by UX, PM, and engineering counterpart
- Reduced-motion behavior defined for every transition type in dashboard flows
- Edge state behavior documented for empty/loading/permission denied/partial data
- At least one walkthrough validates keyboard and screen-reader interaction order through state changes
- Success metrics instrument plan drafted and agreed

## Success Metrics and Validation Plan

Track by workflow cohort (attestations, integrations, revenue signals) and by motion setting (default vs reduced).

- Task completion rate: target `>= 95%` on primary dashboard workflows
- Error recovery rate: target `>= 85%` successful recovery after permission or partial-data interruption
- Time on task (median):
  - Locate latest attestation status
  - Resolve integration warning
  - Identify revenue trend direction and confidence marker
- Interaction stability:
  - Reduced repeated clicks during transitions
  - Lower abandonment on loading/degraded states

Recommended measurement windows:

- Moderated usability pass (5-7 participants internal/proxy users)
- Unmoderated scenario test for timing baselines
- Post-change telemetry comparison against pre-policy baseline

## Short Heuristic Evaluation Template

Use this checklist during review sessions.

- Visibility of system status: loading, stale, and denied states are explicit within 1 second
- Match between system and real-world language: trust-sensitive terms are precise and non-ambiguous
- User control and freedom: users can cancel, retry, or navigate away without waiting on long transitions
- Consistency and standards: token usage is consistent across modules
- Error recovery: clear next steps appear for denied/partial states without dead ends
- Accessibility: reduced-motion mode preserves full task path without hidden information

Findings capture format:

- Finding
- Severity (`low`, `medium`, `high`)
- Affected flow
- Evidence (task step or observation)
- Recommendation

## Engineering Coordination Notes (non-blocking)

- Validate token feasibility against current animation primitives and charting library capabilities
- Confirm where reduced-motion preference is read and propagated
- Identify telemetry hooks required for completion/error/time metrics
- If constraints prevent full compliance, log deviations with rationale and mitigation

Do not block UX acceptance on final implementation details. Open engineering follow-up only when acceptance criteria are explicit.

## Follow-up Engineering Issue Gate

Open the implementation issue only after:

- UX acceptance criteria in this doc are checked
- Motion token naming and mapping are stable
- Reduced-motion behavior matrix is approved
- Measurement plan includes event names, ownership, and dashboard/report destination

## Versioning

- Keep this policy in `docs/uiux/` for iterative updates
- Add dated revision notes below as policy evolves

### Revision Notes

- `2026-04-28`: Initial draft for dashboard motion token and reduced-motion policy
