# PR Description: API Key Scoping Selector with Grouped Permissions

Closes #265

---

## Summary

Redesigned the "Create API key" modal scope selector from a flat 3-scope checkbox list into a **grouped permission tree** with **tri-state checkboxes**, **search/filter**, **select-all/clear-all** quick actions, and a **live selected-count summary badge** — all meeting WCAG 2.1 AA accessibility standards.

---

## What Changed

### `src/components/api-keys/CreateApiKeyModal.tsx`

**Before:** A flat, unstructured list of 3 scopes (`read:attestations`, `write:attestations`, `read:sources`) rendered as simple checkboxes with no grouping, filtering, or bulk actions.

**After:** A structured scope selector with:

| Feature | Description |
|---|---|
| **Grouped tree** | 4 resource groups (Attestations, Revenue Sources, Webhooks, API Keys), each with read/write scopes — 8 scopes total |
| **Tri-state group checkboxes** | Groups show **checked** (all children selected), **indeterminate** (some children selected), or **unchecked** (none selected). Clicking a group checkbox toggles all its scopes atomically. |
| **Search/filter** | `type="search"` input filters across scope labels, descriptions, and group names. Matching scopes are shown in-place; groups with no matches are hidden. Empty state with dashed border when 0 results. |
| **Selected-count summary** | `aria-live="polite"` badge showing `N / 8 selected` with accent highlighting when > 0. |
| **Select all / Clear all** | Quick-action buttons with proper disabled states (Select all disabled when all 8 selected; Clear all disabled when 0 selected). |
| **Accessibility (WCAG 2.1 AA)** | `role="tree"` → `role="treeitem"` → `role="group"` hierarchy. Every checkbox has `aria-label`. Group headers have `aria-expanded`. Search input has `aria-label`. Empty state has `role="status"`. All interactive elements meet minimum touch-target sizing. |
| **Design consistency** | Uses existing CSS variable tokens (`--text`, `--muted`, `--accent`, `--border`, `--radius-sm`, etc.) and class patterns (`auth-input`, `app-button`, `modal-*`). Group cards use accent-highlighted borders/backgrounds when scopes are selected. Transitions on border, background, and color. |

### `src/test/create-api-key-modal.test.tsx` (new file)

**37 tests** covering:

| Category | Tests |
|---|---|
| **Rendering** | Closed state (null), dialog role, `aria-modal`/`aria-labelledby`, heading, form fields |
| **Scope groups** | 4 group headers, 12 total checkboxes (4 group + 8 scope), treeitem roles with `aria-expanded` |
| **Tri-state checkboxes** | All-checked, indeterminate, unchecked, group toggle (deselect/select), indeterminate→checked→indeterminate transitions |
| **Search/filter** | By label, by description, by group name (cross-scope matching), empty state, clearing search restores all |
| **Selected-count summary** | Default "1/8", increment, "0/8" on clear, "8/8" on select all, `aria-live`/`aria-atomic` attributes |
| **Select all / Clear all** | Bulk select all 8 scopes, bulk deselect, disabled states for both buttons |
| **Form validation** | Short label, out-of-range expiry, no scopes selected, valid form opens confirm dialog |
| **Confirm dialog** | Scope labels in description, minting produces correct `key_` ID and `vtsr_live_` secret |
| **Close interactions** | Cancel button, X close button, backdrop click |

---

## Why

Issue `#265` called for a grouped scope selector that lets users pick permissions by resource with select-all-per-group, human-readable descriptions, and filter/search. The previous flat list didn't scale beyond 3 scopes and lacked grouping, bulk actions, and discoverability for larger permission sets.

---

## Key Design Decisions

1. **Tri-state computed from full group** — Even when search filters the visible scopes, group checkboxes reflect the aggregate state of ALL scopes in that group (not just visible ones). Clicking a group checkbox toggles all scopes (including hidden ones), preventing accidental "I missed one" scenarios.

2. **Functional updater in `toggleGroup`** — Uses `setSelected(prev => ...)` with `groupTriState(group, prev)` inside the updater, avoiding stale closure issues and eliminating the need for `selected` in dependency arrays.

3. **Ref callback + useEffect for indeterminate** — Sets `el.indeterminate` both in the render-time ref callback (for initial display) and in a post-render `useEffect` (as a safety net for any race conditions). The effect always wins, ensuring correct tri-state even during rapid interactions.

4. **Search matches label, description, AND group name** — A group is shown if its name matches the query OR any of its scopes' labels/descriptions match. This makes it easy to discover scopes by domain terms (e.g., "revenue" matches both the Revenue Sources group and write:attestations description).

5. **No new dependencies** — All styling uses the existing CSS variable token system. No external libraries added.

---

## How to Test

```bash
# Lint
npm run lint

# Typecheck (no errors on our files)
npx tsc -b --noEmit 2>&1 | grep -E "create-api-key" || echo "Clean"

# Unit tests
npx vitest run src/test/create-api-key-modal.test.tsx
```

Manual testing paths:
1. **Basic flow:** Navigate to API Keys page → "Create key" → verify 4 grouped sections, select/deselect individual scopes, observe group tri-state updates and count badge.
2. **Group toggle:** Click a group header checkbox → all scopes in that group toggle. Click again → all deselect.
3. **Search:** Type "webhook" → only Webhooks group appears. Type "read" → only read scopes visible across all groups. Clear → all groups restored.
4. **Select all:** Click "Select all" → badge shows "8/8 selected", button disables. Click "Clear all" → badge shows "0/8 selected", validation error on submit.
5. **Keyboard:** Tab through checkboxes, Space to toggle. Escape closes the modal. Tab trapped within ConfirmDialog.
6. **Screen reader:** Verify group tree hierarchy announced, live count updates, search results.

---

## Validation

- ✅ **ESLint**: 0 errors, 0 warnings
- ✅ **TypeScript**: 0 errors on changed files
- ✅ **Vitest**: 37/37 tests passing
- ✅ **Accessibility**: `role="tree"`, `role="treeitem"`, `role="group"`, `aria-expanded`, `aria-live="polite"`, `aria-atomic`, proper `aria-label` on all checkboxes and inputs
- ✅ **Responsive**: Modal uses `min(520px, 100%)`, search and actions wrap with `flexWrap`, groups stack vertically
- ✅ **Design tokens**: All colors/spacing use CSS variables; respects light/dark theme via `--text`, `--muted`, `--accent`, `--border`, `--surface-soft`

---

## Test Coverage

| Metric | Value |
|---|---|
| Test file | `src/test/create-api-key-modal.test.tsx` |
| Number of tests | **37** |
| Passing | 37 / 37 |
| Categories covered | Rendering, scope groups, tri-state checkboxes, search/filter, count summary, select/clear all, form validation, confirm dialog, close interactions |
| Edge cases covered | Empty search state, 0/8 and 8/8 count extremes, disabled button states, cross-group search matching, indeterminate → checked → indeterminate transitions |

---

## Screenshots / Before-After

*Screenshots were not generated in this CLI environment. Reviewers can inspect the "Create API key" modal locally:*

```bash
npm run dev
# Navigate to /api-keys → click "Create key"
```

**Before:** Flat list of 3 scopes with no grouping, search, or bulk actions.
**After:** Grouped tree with 4 resource groups, tri-state checkboxes, search/filter, select-all/clear-all, and live count badge.

---

## Notes

- The `keyId` memo dependency was cleaned up (removed unnecessary `open` dep) as a drive-by fix.
- Pre-existing TypeScript errors in other files (`Settings.tsx`, `Attestations.tsx`, etc.) are unrelated to this change.
- For full CI to pass on the PR, those pre-existing errors would need to be addressed in a separate PR.
- The scope data structure (`SCOPE_GROUPS`, `ScopeGroup`, `ScopeItem`) is designed to be easily replaced with a backend-driven API when ready.
