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