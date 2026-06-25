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
