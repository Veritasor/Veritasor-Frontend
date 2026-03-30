# Summary

Implements a shared visual system for Veritasor authentication screens and applies it across login, signup, and forgot-password routes.

## What Changed

- added a reusable `AuthShell` component to standardize page structure, supporting copy, and route-to-route consistency
- introduced responsive `/login`, `/signup`, and `/forgot-password` screens with shared typography, spacing, action hierarchy, and validation messaging
- expanded global styling tokens to cover auth surfaces, focus treatment, button hierarchy, status messaging, and mobile-first layout behavior
- documented the visual system, acceptance criteria, accessibility assumptions, and Figma reference in `docs/authentication-visual-system.md`
- added a Vitest + Testing Library harness with coverage thresholds and auth screen tests

## Why

Issue `#28` called for a cohesive, accessible authentication visual system that is easy for engineers to review and extend without guessing at spacing, typography, or state treatment.

## Impact

- gives product and engineering a concrete, implemented auth direction instead of separate notes only
- makes accessibility expectations explicit through visible focus states, minimum target sizing, and documented keyboard flow
- provides route-level examples for error, success, warning, loading, hover, and disabled states

## Validation

- `npm run lint`
- `npm run build`
- `npm run test:coverage`

## Coverage

- auth-screen UI test coverage: 100% statements / 100% branches / 100% functions / 100% lines

## Notes

- screenshots were not generated in this CLI environment; reviewers can inspect `/login`, `/signup`, and `/forgot-password` locally after `npm run dev`
