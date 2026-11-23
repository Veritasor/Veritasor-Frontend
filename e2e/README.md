# Visual Regression & Accessibility Tests

This directory contains E2E visual regression and accessibility baseline tests built with **Playwright** and **@axe-core/playwright**.

## Running Tests

- Run tests in headless mode:
  ```bash
  npm run test:e2e
  ```

- Update visual baselines after reviewing the rendered changes:
  ```bash
  npm run test:e2e-update
  ```

`theme-density-visual.spec.ts` covers Dashboard, every Settings tab, and the
Dashboard and unsaved-changes dialogs in the dark/high-contrast ×
comfortable/compact × Arabic RTL matrix. Its shared helper fixes the browser
clock, seeds persisted preferences, stubs density preference requests, and
disables motion for repeatable screenshots.
