# Veritasor Frontend

**Live demo: https://veritasor-frontend-opal.vercel.app** (demo build, sample data only)

Web app for [Veritasor](https://github.com/Veritasor), an on-chain revenue attestation protocol. Businesses connect revenue sources, anchor a Merkle root of a reporting period on-chain (Stellar), and share verifiable proof with lenders, investors and partners without exposing raw transactions.

> This repository is the frontend only. All figures, accounts and attestations in the UI are **mock demo data**; sign-in is simulated and no backend is required to browse the app.

## Features

- Marketing landing page explaining the product
- Auth screens: login (with MFA challenge/recovery), sign up, forgot password
- Business onboarding wizard (business, owner, bank, documents, selfie, review)
- Dashboard with metrics, usage meters and attestation trigger flow
- Attestation list, schedule calendar and per-attestation detail with proof timeline and sharing
- Revenue source connection wizard (provider, authorize, scope, currency mapping)
- Settings: profile, team, API keys, webhooks, billing, audit log, accessibility, appearance (light/dark)
- i18n (en, de, es, fr, fi, zh, ar), cookie consent, keyboard shortcuts, command palette

## Quickstart

```bash
npm install
npm run dev      # http://localhost:5173
```

Requires Node 18+ (CI uses Node 22).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (proxies `/api/*` to `http://localhost:3000`) |
| `npm run build` | Production build into `dist/` |
| `npm run check:bundle` | Verify the main JS entry chunk in `dist/assets/` stays within the 450 KB budget |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b` (currently reports pre-existing type errors, mostly in tests) |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:coverage` | Vitest unit tests with V8 coverage thresholds |
| `npm run test:e2e` | Playwright end-to-end tests |

## Testing & Coverage Policy

Unit tests run with Vitest and V8 coverage (`npm run test:coverage`). Coverage thresholds (`>= 90%` for statements, branches, functions, and lines) are enforced in `vite.config.ts` across core UI components/pages as well as logic modules:

- `src/hooks/**`
- `src/state/**`
- `src/utils/**`
- `src/services/**`
- `src/store/**`
- `src/i18n/config.ts`

All unit tests must mock network calls (`fetch`) and use fake timers (`vi.useFakeTimers()`) instead of real timers to avoid flakiness.

## Routes

`/` landing, `/login`, `/signup`, `/forgot-password`, `/onboarding`, `/dashboard`, `/attestations`, `/attestations/:id`, `/sources`, `/connect-source/*`, `/settings`, `/api-keys`, `/help`, `/consent-preferences`, `/motion-tokens`, `/500`, anything else renders the 404 page.

Route pages are code-split with `React.lazy` and wrapped in a root `Suspense` fallback (`SkeletonLoader` with `aria-busy="true"`) and router `errorElement` (`ServerError`).

## Bundle-size budget

After running `npm run build`, run `npm run check:bundle` to enforce the main entry chunk (`dist/assets/index-*.js`) budget:

- **Default budget**: `450 KB` (raw)
- **Override**: pass `--budget=<kb>` (e.g. `node scripts/check-bundle-size.mjs --budget=400`) or set `BUNDLE_BUDGET_KB=<kb>`.

The script exits non-zero if the main entry chunk exceeds the configured budget.

## Environment variables

All environment variables are optional and typed in [`src/vite-env.d.ts`](src/vite-env.d.ts). Copy [`.env.example`](.env.example) to `.env` to customize local settings (never commit secrets):

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Base URL for backend API requests |
| `VITE_SESSION_DURATION_MINUTES` | `30` | Session timeout duration in minutes |
| `VITE_SESSION_WARNING_BEFORE_MINUTES` | `5` | Minutes before session expiry to show the warning modal |

## Deploy

Deployed on Vercel as a static Vite SPA. `vercel.json` rewrites all paths to `index.html`.

```bash
vercel --prod
```

## Documentation

Design and UX notes live in [`docs/`](docs) (design system, i18n, accessibility, density mode, original UX briefs in `docs/design-notes/`).

## Project structure

```
src/
  pages/        route-level screens (Landing, Login, Dashboard, Attestations, Settings, ...)
  components/   shared UI, layout, feature components
  hooks/        reusable hooks
  i18n/         locale provider and message catalogs
docs/           design and engineering docs
e2e/            Playwright tests
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) installs dependencies and builds on every push and pull request to `main`.
