# Summary

Adds focused behavior coverage for `src/components/toastRules.ts`, covering the `ToastSeverity` contract, the `MAX_VISIBLE_DESKTOP` / `MAX_VISIBLE_MOBILE` stack limits, representative invalid inputs, and the primary visible → overflow state transitions.

Closes #629

---

## What Changed

**`src/test/toast-rules.test.ts` — +191 lines, 0 deletions (purely additive)**

No production code was modified. The public contract of `toastRules.ts` is untouched: the existing 14 tests are preserved verbatim and 21 new tests were added alongside them (14 → 35).

### The type-level gap

`ToastSeverity` is a `type` union, so it is erased at runtime — no amount of runtime assertion can observe it directly. It is now covered two ways:

- A `severityLabel(severity: ToastSeverity)` helper with a `const exhaustive: never = severity` default branch. This is a **compile-time** guard: adding a fifth severity to the union without handling it here breaks `tsc`.
- `SEVERITIES = Object.keys(AUTO_DISMISS_MS) as readonly ToastSeverity[]` — a runtime view of the union derived from the typed `Record<ToastSeverity, number>`, so the union and the cadence map cannot silently drift.

**Verified load-bearing:** temporarily deleting the `case 'error'` branch produced `error TS2322: Type 'string' is not assignable to type 'never'`, and the branch was restored. The guard is reverted in the committed diff.

### Coverage added

| Area | Cases |
|---|---|
| `ToastSeverity` | Exactly the four documented members; `AUTO_DISMISS_MS` is a *total* record (no missing/extra keys); exhaustive guard maps every member; every union member resolves without throwing, while out-of-union values are rejected |
| Stack limits | Both caps are positive integers; mobile is strictly the stricter cap; each cap applied to a representative stack; the two viewports split the same stack differently |
| State transitions | At exactly the cap → all visible, **empty overflow, no group card**; one past the cap → oldest collapses into overflow, group card appears and renders its singular summary |
| `resolveAutoDismissMs` invalid/boundary | Unrecognised severity without undo; unrecognised severity with undo; explicit override short-circuits *before* the severity lookup; explicit `0` override forces persistence even for `success`/`info`; `warning`/`error` stay persistent across the undo flag |
| `splitStack` invalid/boundary | Zero and negative caps; fractional cap truncates; single item under a fractional cap does not overflow; infinite cap never overflows; `NaN` cap never silently drops toasts; returned arrays are fresh, never aliases of the input |
| `describeOverflow` boundaries | Only exactly `1` is singular; `0`, negative, and fractional counts take the plural branch rather than throwing |

### Every assertion was probed against real runtime behavior

Edge-case expectations were verified against actual execution before being written down — e.g. a `1.5` cap truncates to `2` for a 3-item stack (`slice()` semantics), and a `NaN` cap yields all-visible / no-overflow rather than dropping items.

---

## One finding: invalid severities leak non-numbers

`resolveAutoDismissMs` performs **no runtime validation** of its `type` argument. A plain-JS caller (or untyped data) passing an unrecognised severity gets:

| Input | Actual result |
|---|---|
| `resolveAutoDismissMs('critical', false)` | `undefined` |
| `resolveAutoDismissMs('critical', true)` | `NaN` |
| `resolveAutoDismissMs('critical', false, 4200)` | `4200` (override short-circuits) |

Both `undefined` and `NaN` are invalid return values for a function typed `(…) => number`, and a caller treating the result as a timeout would get a toast that never (or immediately) dismisses.

**This PR deliberately does not change that behavior.** Making it throw would be a real contract change, and the acceptance criteria require preserving the existing public contract absent an explicit compatibility plan. Instead the current behavior is **pinned by tests** so it cannot change silently, and the defect is recorded here.

**Recommended follow-up (separate PR, with a compatibility note):** make `resolveAutoDismissMs` fail loudly on an unknown severity — either throw a typed error or return a documented fallback — and update `ToastContext` accordingly.

---

## Validation

| Check | Result |
|---|---|
| `npx vitest run src/test/toast-rules.test.ts` | ✅ **35/35 passing** (was 14/14) |
| `npx vitest run src/test/toast-stacking.test.tsx` | ✅ 16 passing, 2 skipped |
| `npx vitest run src/test/toast.test.tsx` | ⚠️ Pre-existing failure — file cannot load (see below) |
| Full suite, **with** this change | 32 failed / 1011 passed / 2 skipped (1045) |
| Full suite, **at HEAD** (change reverted) | 32 failed / 990 passed / 2 skipped (1024) |
| → **Delta attributable to this PR** | **+21 passing, +0 failing** |
| `npx eslint src/test/toast-rules.test.ts src/components/toastRules.ts` | ✅ 0 errors |
| `tsc` (strict, project's flags) on the new test file | ✅ exit 0 |
| Coverage of `src/components/toastRules.ts` | ✅ **100%** stmts / branch / funcs / lines |

**No new failures. The 32 failing files and all type errors below are pre-existing at `HEAD` and unrelated to this change.**

### Pre-existing issues (not introduced, not fixed here)

1. **`src/i18n/messages/en.json` is malformed** — a missing comma after the `accountMenu.copyGuidance.body` value (line 39/40). Present at `HEAD`. This breaks `tsc -b` outright (`error TS1005: ',' expected`) *and* prevents `src/test/toast.test.tsx` from loading at all (`Error: expected ',' or '}' at line 40 column 3`). Because `tsc -b` halts on that parse error, the new test file was typechecked with an equivalent strict invocation instead.
2. **32 test files fail at `HEAD`** — e.g. `A11yCoverageMatrix.test.tsx` hits `getMultipleElementsFoundError` on an ambiguous `getByText(new RegExp(\`${pct}%\`))` selector. Established by reverting this change and re-running the full suite for the baseline above.

Because `npm run build` runs `tsc -b && vite build`, **the repository build is currently red on `main` for reason (1)** — worth a separate fix.

---

## Impact

- `src/components/toastRules.ts` reaches **100%** coverage from a single dedicated suite, up from partial.
- `ToastSeverity` gains real protection: a new severity now fails `tsc` unless its cadence and handling are both added.
- Error and boundary behavior is observable and deterministic rather than incidental.
- Test-only change; no runtime, API, or type surface modified, so no compatibility plan is required.
