# TODO - Issue #167 Attestation Scheduling Calendar

- [ ] Create `src/components/scheduling/AttestationCalendar.tsx`:
  - [ ] Month grid calendar with subtle scheduled indicators
  - [ ] WCAG 2.1 AA keyboard navigation (arrow keys, Enter/Space) + single live region announcements
  - [ ] Recurrence Builder (Daily/Weekly/Monthly) + live Plain-English Summary
  - [ ] Edge-case documentation block (DST, leap day behavior, mobile rendering, RTL)
- [ ] Integrate calendar into `src/pages/Attestations.tsx` (mount schedule view cleanly)
  - [ ] Ensure `Attestations.tsx` compiles (fix/replace broken references if needed)
- [ ] Run TypeScript/build/tests to confirm no regressions
- [ ] Quick manual keyboard/screen-reader sanity check

# TODO - Issue #284 Design Tokens CSS Export

- [x] Create `src/utils/parseTokens.ts` — parser for CSS custom properties from `src/index.css`
- [x] Create `src/components/tokens/TokensExport.tsx` — export UI with scope selector, copy & download
- [x] Add Tokens tab to Settings page (`src/pages/Settings.tsx`)
- [x] Write tests in `src/test/tokens-export.test.tsx` (36 tests, 99% statement / 100% line coverage)
- [x] Write documentation in `docs/uiux/tokens-css-export.md`
- [x] Pass `npm run lint` with zero errors in new files
- [ ] Create PR with detailed summary (Closes #284)