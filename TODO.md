# TODO - Issue #167 Attestation Scheduling Calendar

- [x] Create `src/components/scheduling/AttestationCalendar.tsx`:
  - [x] Month grid calendar with subtle scheduled indicators
  - [x] Keyboard navigation (arrow keys, Enter/Space) + single live region announcements
  - [x] Recurrence Builder (Daily/Weekly/Monthly) + Plain-English Summary
  - [x] Edge-case documentation block (DST, leap day behavior, mobile rendering, RTL)
- [x] Integrate calendar into `src/pages/Attestations.tsx` as a Schedule tab
- [x] Persist recurrence rules in a versioned localStorage schedule store
- [x] Generate upcoming occurrences with month-end, leap-day, and IANA time-zone DST handling
- [x] Show upcoming runs and support editing/deleting saved rules
- [x] Add occurrence-generation and page integration tests
- [ ] Run TypeScript/build/tests to confirm no regressions (build and focused tests pass; project-wide TypeScript checks have pre-existing errors)
- [ ] Quick manual keyboard/screen-reader sanity check

# TODO - Issue #284 Design Tokens CSS Export

- [x] Create `src/utils/parseTokens.ts` — parser for CSS custom properties from `src/index.css`
- [x] Create `src/components/tokens/TokensExport.tsx` — export UI with scope selector, copy & download
- [x] Add Tokens tab to Settings page (`src/pages/Settings.tsx`)
- [x] Write tests in `src/test/tokens-export.test.tsx` (36 tests, 99% statement / 100% line coverage)
- [x] Write documentation in `docs/uiux/tokens-css-export.md`
- [x] Pass `npm run lint` with zero errors in new files
- [ ] Create PR with detailed summary (Closes #284)
# TODO - API Key Management UI (Veritasor)
## Plan Steps
- [x] Step 1: Add routing + navigation for new API key management screen
  - Add page: `src/pages/ApiKeys.tsx`
  - Register route in `src/App.tsx`
  - Add nav link in `src/components/Layout.tsx`
- [x] Step 2: Implement keys list view (with status badges)
  - Accessible semantics (list/table-like)
  - Masked key rendering
  - Copy-to-clipboard buttons w/ feedback
- [x] Step 3: Implement “create key” flow
  - Add modal `src/components/api-keys/CreateApiKeyModal.tsx`
  - Scopes + expiry inputs + validation
  - Show newly minted full key exactly once in a dedicated success UI
- [ ] Step 4: Implement rotation + revocation
  - Confirmation modals for rotate/revoke
  - Disable actions based on key status and “last admin key” edge case
- [ ] Step 5: Accessibility (WCAG 2.1 AA)
  - Ensure dialogs use `role="dialog"`, `aria-modal`, focus trap, Escape, focus restore
  - Ensure copy feedback uses accessible live region/toast + button label change
  - Verify no keyboard traps
- [ ] Step 6: Add tests (minimum 95% coverage target)
  - Unit/component tests for page + modals
  - Test “minted key shown exactly once” behavior
  - Test clipboard + feedback
- [ ] Step 7: Add documentation + notes
  - `docs/uiux/api-key-management.md`
  - Include a11y notes and key masking behavior
- [ ] Step 8: Run lint + tests
  - `npm run lint`
  - `npm test`
