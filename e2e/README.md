# End-to-End, Visual Regression & Accessibility Tests

This directory contains Playwright end-to-end tests for core user flows, route-level WCAG 2.0 A/AA accessibility scans (`@axe-core/playwright`), and RTL visual regression baselines.

## Setup

Install the Chromium browser binary once:

```bash
npx playwright install chromium
```

## Running Tests

- Run the full E2E suite across both `desktop-chrome` and `mobile-chrome` (Pixel 5) projects:
  ```bash
  npm run test:e2e
  ```
- Run a single spec file:
  ```bash
  npx playwright test e2e/auth.spec.ts
  ```
- Run against a specific project:
  ```bash
  npm run test:e2e
  ```

- Update visual baselines after reviewing the rendered changes:
  npx playwright test --project=desktop-chrome
  npx playwright test --project=mobile-chrome
  ```
- Update RTL visual snapshots:
  ```bash
  npm run test:e2e-update
  ```

`theme-density-visual.spec.ts` covers Dashboard, every Settings tab, and the
Dashboard and unsaved-changes dialogs in the dark/high-contrast ×
comfortable/compact × Arabic RTL matrix. Its shared helper fixes the browser
clock, seeds persisted preferences, stubs density preference requests, and
disables motion for repeatable screenshots.
## Test Suite Overview

- `e2e/fixtures.ts` — shared Playwright fixtures (`autoMockApi`) and helpers (`mockApi`, `login`).
- `e2e/auth.spec.ts` — login validation, focus management, MFA challenge, and redirect to `/dashboard`.
- `e2e/attestations.spec.ts` — triggering a revenue attestation via the confirmation modal, Escape focus restoration, and verifying the run in `/attestations`.
- `e2e/api-keys.spec.ts` — creating a new API key (one-time secret reveal) and revoking an active key via typed confirmation.
- `e2e/settings.spec.ts` — switching settings tabs, URL hash synchronization, and direct hash navigation.
- `e2e/onboarding.spec.ts` — onboarding wizard draft persistence and mocked `POST /api/onboarding/submit` submission.
- `e2e/a11y-routes.spec.ts` — axe-core WCAG 2.0 A/AA scans covering every route registered in `src/App.tsx`.
- `e2e/rtl-visual.spec.ts` — RTL layout snapshots and WCAG 2.1 AA checks.

## Mock Conventions

- Import `test` and `expect` from `./fixtures` rather than `@playwright/test` so `mockApi(page)` is registered automatically before every test.
- All backend calls (`/v1/preferences/density`, `/api/onboarding/submit`, and `/api/**`) are intercepted via `page.route(...)` so tests are deterministic and never require a live backend.
- To override a response for a specific test (for example, simulating a 500 error on onboarding submission), call `await mockApi(page, { onboardingSubmit: { status: 500, body: { error: 'Server error' } } })` before triggering the action.
- Do **not** use `page.waitForTimeout(...)`; rely on Playwright's web-first assertions (`expect(locator).toBeVisible()`, `expect(page).toHaveURL(...)`, `page.waitForRequest(...)`).
