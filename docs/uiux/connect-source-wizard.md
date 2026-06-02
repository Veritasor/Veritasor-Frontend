# Connect Source Wizard

## References

- Issue: `#111`
- Routes: `/connect-source/provider`, `/connect-source/authorize`, `/connect-source/scope`, `/connect-source/confirm`
- Entry point: dashboard CTA and primary navigation link

## Goal

Define a reusable multi-step shell for connecting a revenue source that makes progression, permission risk, and validation state obvious before a user grants access.

## Wizard Chrome

- Shared route shell wraps every step with:
  - page-level intro
  - reusable step progress header
  - step heading with provider context
  - persistent footer actions
- Step progress is informational, not clickable. This prevents users from skipping required consent or scope decisions while still making the sequence easy to review.
- Current progress is exposed to assistive tech with a live `status` announcement in the format `Step X of 4: Step label`.

## Step Sequence

1. **Select provider**
   Choose Stripe, Shopify, or Razorpay before any authorization language is shown.
2. **Authorize**
   Explain the read-only access needed, then complete the secure provider handoff.
3. **Configure scope**
   Select the initial sync window and any optional supporting scopes.
4. **Confirm**
   Review the connection summary and explicitly confirm least-privilege access.

## Footer Actions

- Layout
  - mobile: `Cancel`, `Back`, and primary action stack full-width in DOM order
  - tablet and desktop: `Cancel` sits left, `Back` and primary action align right
- Rules
  - `Cancel` is always available and returns to the dashboard
  - `Back` is hidden on the first step and available on steps 2 to 4
  - `Next` is disabled on provider selection until a provider is chosen
  - `Next` is disabled on authorization until the secure handoff completes successfully
  - `Next` remains enabled on scope configuration so missing required fields can surface inline
  - `Finish connection` is disabled until the final least-privilege acknowledgement is checked

## Validation Pattern

- Missing or invalid step data is surfaced in the step body, not only in the footer.
- Scope configuration uses:
  - an inline alert summary with `role="alert"`
  - field-level supporting copy prefixed with `Error:`
  - `aria-describedby` from the radio group to the validation message
- Authorization denial uses a persistent error state that keeps the user on the same step and offers a retry path.

## Responsive Notes

- Wizard cards stack into one column on small screens and expand into multi-column layouts from tablet upward.
- Progress items remain vertical on smaller viewports and switch to four columns on desktop.
- App navigation wraps on small screens so the wizard remains reachable without horizontal scrolling.
- Primary touch targets use a minimum height above 44px.

## Accessibility Notes

- Designed against WCAG 2.1 AA expectations
- Skip link targets the app main region
- Navigation uses `aria-current="page"` through `NavLink`
- Progress header announces current and total steps through a live region
- Error states do not rely on color alone
- Buttons and card-like radio options preserve visible focus styles

## Edge States Covered

- Empty state: dashboard calls out that no revenue sources are connected yet
- Loading state: authorization step shows an in-progress status while the secure handoff resolves
- Error state: authorization denial and missing scope selection both remain visible in context
- Direct-link protection: incomplete users are redirected to the earliest valid step

## Review Notes

- Screenshots saved for review:
  - `docs/uiux/screenshots/connect-source-dashboard.png`
  - `docs/uiux/screenshots/connect-source-provider-desktop.png`
  - `docs/uiux/screenshots/connect-source-provider-mobile.png`
  - `docs/uiux/screenshots/connect-source-scope-error.png`
- Manual browser review should confirm:
  - 375px mobile layout
  - desktop four-column progress header
  - keyboard-only footer navigation order
  - screen-reader announcement of `Step X of 4`
