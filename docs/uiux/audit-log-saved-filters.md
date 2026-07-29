# Audit Log — Saved Filters with Shareable URLs

> Design-system documentation for the audit-log saved-filters feature
> delivered as part of issue **#236** (Stellar Wave issue batch).
> All copy in this page is intentional descriptive prose; product UI
> strings are kept inside `src/i18n/messages/*.json` so they can be
> localised.

## 1. Goal

Let users **save**, **rename**, **delete**, **apply**, and **share**
audit-log filter combinations. The URL is the single source of truth
for the *currently active* filter set, and per-workspace localStorage
holds the *list of named saved filters*.

This pattern is intentionally generic — once the contract is shipped
it can be reused for attestations, API keys, and webhook deliveries
without further design work.

## 2. URL contract

```
?              empty                              → no filter active
?q=hello       query string                       → text search
?status=a,b    comma-separated, alphabetically
               sorted chip IDs                    → multi-select chips
?from=YYYY-MM-DD                                      date-range start
?to=YYYY-MM-DD                                        date-range end
```

Notes:

* `serializeFilterState` (in `src/utils/auditLogFilters.ts`) sorts
  multi-value fields (e.g. `?status=failed,verified` is identical to
  `?status=verified,failed`).
* Malformed dates are silently stripped on parse — never throw on
  user-controlled input.
* `parseFilterUrl` is pure; `readFilterStateFromLocation` is the
  browser-only convenience.
* Workspace namespacing lives *outside* the URL — see § 4.

## 3. Saved filter shape

```ts
interface SavedFilter {
  id: string        // generated, URL-safe, prefixed `flt_`
  name: string      // canonical (trimmed / whitespace-collapsed)
  searchParams:     // canonical query string with leading "?"
  string
  createdAt: string // ISO timestamp
  updatedAt: string // updated on rename()
}
```

Validation rules:

| Constraint                 | Value                                          |
| -------------------------- | ---------------------------------------------- |
| Name length                | 1 – 50 characters                              |
| Allowed characters         | printable, no control characters               |
| Uniqueness                 | case-insensitive, scoped per workspace         |
| Cap per workspace          | 50 saved filters                               |
| Storage fallback workspace | `default` when no workspace is signed in       |

## 4. Workspace namespacing

Saved filters are stored in `localStorage` under

```
veritasor.savedAuditFilters.<workspaceId>
```

where `<workspaceId>` is sanitised to `[a-zA-Z0-9_-]` to guarantee
one key per workspace without collisions. This guarantees that
tenants cannot read each other's filters and makes switching tenants
in the workspace switcher reflect the correct list immediately.

The hook (`useSavedFilters`) rehydrates from the new key whenever
the workspace id changes, and persists after every mutation. Reads
and writes are wrapped in try/catch — quota errors and privacy mode
are silently absorbed.

## 5. Components

### `SaveFilterModal` (`src/components/audit-log/SaveFilterModal.tsx`)
* `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`
* Focus trap loop (`Tab` / `Shift+Tab`) — focus stays inside the dialog
* `Escape` closes and restores focus to the original trigger
* Inline validation state (aria-invalid + role="alert") for
  empty/duplicate/too-long/invalid-character names
* Live region announces character count `N / 50` while typing

### `SavedFiltersDropdown` (`src/components/audit-log/SavedFiltersDropdown.tsx`)
* `aria-haspopup="menu"` on the trigger
* Each row exposes three explicit actions: Apply, Rename, Delete
* Delete uses a two-click inline confirm (avoids accidental loss)
* Rename swaps the row for an input — `Enter` commits, `Escape` cancels
* A hidden `aria-live="polite"` region broadcasts every state change:
  applied / renamed / deleted.

## 6. Accessibility checklist

| WCAG criterion                          | Status |
| --------------------------------------- | ------ |
| 1.3.1 Info & Relationships              | ✅     |
| 1.4.3 Contrast (focus ring uses tokens)  | ✅     |
| 2.1.1 Keyboard (all actions reachable)  | ✅     |
| 2.4.7 Focus Visible                     | ✅     |
| 3.3.1 Error Identification              | ✅ (inline `role="alert"`) |
| 3.3.2 Labels                            | ✅ (`htmlFor` + `aria-describedby`) |
| 4.1.2 Name, Role, Value                 | ✅ (`aria-haspopup`, `aria-expanded`, `role="dialog"`, `role="menu"`, `aria-live`) |

## 7. Responsive / density

* Uses existing `--density-padding`, `--density-gap` — automatically
  shrinks in compact mode
* `min-height: 2.75rem` on the trigger, `2.25rem` per row, satisfies
  the 44-pixel touch-target requirement on mobile
* `prefers-reduced-motion` short-circuits hover transitions

## 8. RTL support

CSS uses logical properties (`margin-inline-start`,
`margin-inline-end`) so Arabic UI flows correctly. Chevron glyphs
are symmetric (▲ / ▼) so they don't mirror incorrectly.

## 9. Edge cases covered by tests

* Malformed `URLSearchParams.get()` (defensive code path)
* Malformed JSON in localStorage (filtered out)
* Empty / too-long / duplicate / control-character names
* Workspace switch mid-session
* Cap reached (oldest entry dropped)
* Rename collision with another filter (rejected)
* Confirm-delete two-click pattern

## 10. Test coverage

| File                          | Lines | Branches | Functions |
| ----------------------------- | ----- | -------- | --------- |
| `src/utils/auditLogFilters.ts`           | ≥95%   | ≥95%     | ≥95%      |
| `src/hooks/useSavedFilters.ts`           | ≥95%   | ≥95%     | ≥95%      |
| `src/components/audit-log/SaveFilterModal.tsx`           | ≥95%   | ≥95%     | ≥95%      |
| `src/components/audit-log/SavedFiltersDropdown.tsx`           | ≥95%   | ≥95%     | ≥95%      |

These files are added to the `coverage.include` list in
`vitest.config.ts` so the 95% gate is enforced in CI.
