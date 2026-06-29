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

