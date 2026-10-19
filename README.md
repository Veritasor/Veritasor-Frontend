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
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b` (currently reports pre-existing type errors, mostly in tests) |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Routes

`/` landing, `/login`, `/signup`, `/forgot-password`, `/onboarding`, `/dashboard`, `/attestations`, `/attestations/:id`, `/sources`, `/connect-source/*`, `/settings`, `/api-keys`, `/help`, `/consent-preferences`, `/motion-tokens`, `/500`, anything else renders the 404 page.

## Environment variables

Optional `.env`:

```
VITE_API_URL=http://localhost:3000
```

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
