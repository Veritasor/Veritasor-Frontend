# Attestation Confirm Modal — Design System Documentation

**Components:** `src/components/AttestationConfirmModal.tsx`, `src/pages/Dashboard.tsx`  
**Standard:** WCAG 2.1 AA  
**Added:** 2026-05-31

---

## Overview

The attestation confirm modal is a blocking dialog that appears before any on-chain attestation is submitted. It summarises what will be attested (source, period, record count, Merkle root), restates the irreversibility of the action, and presents a primary confirm action alongside a cancel path.

---

## Visual layout

```
┌──────────────────────────────────────────────┐
│  Confirm Revenue Attestation            [✕]  │
├──────────────────────────────────────────────┤
│  Review the details below. Once confirmed,   │
│  this attestation will be published as an    │
│  immutable on-chain record on Stellar.       │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Source      Stripe (live)              │  │
│  │ Period      May 2026                   │  │
│  │ Records     1,247 transactions         │  │
│  │ Merkle root 0x4a2f8c3d1e6b9f0a…       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ⚠  This action cannot be undone.           │
│     Attested data is permanent on-chain.     │
│                                              │
│              [Cancel]  [Confirm & Attest]    │
└──────────────────────────────────────────────┘
```

---

## ARIA structure

```html
<!-- Backdrop (closes dialog on click when not loading) -->
<div class="modal-backdrop">

  <!-- Dialog container -->
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="attest-modal-title"
    aria-describedby="attest-modal-desc"
    tabindex="-1"
  >
    <h2 id="attest-modal-title">Confirm Revenue Attestation</h2>

    <p id="attest-modal-desc">
      Review the details below…
    </p>

    <!-- Summary — description list -->
    <dl aria-label="Attestation details">
      <div><dt>Source</dt><dd>Stripe (live)</dd></div>
      <div><dt>Period</dt><dd>May 2026</dd></div>
      <div><dt>Records</dt><dd>1,247 transactions</dd></div>
      <div><dt>Merkle root</dt><dd>0x4a2f8c3d1e6b9f0a…</dd></div>
    </dl>

    <!-- Warning (no special role — content makes it clear) -->
    <div class="modal-warning">
      <span aria-hidden="true">⚠</span>
      <span>This action cannot be undone…</span>
    </div>

    <!-- Error (if present) -->
    <p role="alert" class="modal-error">…</p>

    <!-- Actions -->
    <button type="button" disabled?={isLoading}>Cancel</button>
    <button type="button" aria-busy="true|false" disabled?={isLoading}>
      Confirm & Attest | Attesting…
    </button>

    <!-- Always-enabled close button (keeps focus trap alive during loading) -->
    <button type="button" aria-label="Close dialog">✕</button>
  </div>
</div>
```

---

## Focus management

### On open
1. The element that triggered the modal (Dashboard trigger button) is saved to a ref.
2. Focus moves programmatically to the dialog container (`tabIndex={-1}`).

### Focus trap (while open)
- `Tab`: if the last focusable element is active, wraps to the first.
- `Shift+Tab`: if the first focusable element is active, wraps to the last.
- Focusable elements are determined by the selector:
  ```
  a[href], button:not([disabled]), input:not([disabled]),
  select:not([disabled]), textarea:not([disabled]),
  [tabindex]:not([tabindex="-1"])
  ```
- The close button (`✕`) is **never disabled**, ensuring at least one focusable element exists at all times (including during loading).

### On close
- Focus is restored to the saved trigger element.

---

## Keyboard interactions

| Key | Action |
|---|---|
| `Escape` | Closes the modal; focus returns to trigger |
| `Tab` | Moves focus forward; wraps at last focusable element |
| `Shift+Tab` | Moves focus backward; wraps at first focusable element |
| `Enter` / `Space` | Activates focused button (native behaviour) |

---

## Loading state

When `isLoading=true` (on-chain submission in progress):

| Element | Behaviour |
|---|---|
| Confirm button | Disabled; label becomes "Attesting…"; `aria-busy="true"` |
| Cancel button | Disabled |
| Close button (✕) | Remains **enabled** — user may still dismiss |
| Backdrop click | Ignored (`handleBackdropClick` checks `isLoading`) |
| Escape key | Still calls `onClose` |

---

## Error state

When `error` prop is a non-empty string, a `role="alert"` paragraph is rendered inside the modal body. Screen readers announce this automatically. The error is cleared when the modal closes.

---

## Colour and contrast

| Pairing | Approx. ratio | WCAG |
|---|---|---|
| `--text` on `--surface-strong` (dialog bg) | ~15:1 | ✓ AA |
| `--muted` on `--surface-strong` (description) | ~4.8:1 | ✓ AA |
| `--warning` on `--warning-soft` (warning banner) | ~5.0:1 | ✓ AA |
| `#ffd7dd` on `--danger-soft` (error text) | ~5.2:1 | ✓ AA |
| `#04111f` on accent gradient (confirm button) | ~8.5:1 | ✓ AA |
| `--text` on `--border` bg (cancel button) | ~15:1 | ✓ AA |

No information is conveyed by colour alone: the warning uses both the ⚠ icon and text; error uses `role="alert"` and explicit text.

---

## Responsive behaviour

| Viewport | Behaviour |
|---|---|
| ≥481px | Dialog max-width 520px, centred; footer buttons side-by-side |
| ≤480px | Dialog full viewport width; footer buttons stacked (column-reverse — confirm on top); summary rows single-column |

The backdrop uses `overflow-y: auto` + `padding: 1rem` to allow scrolling on very short screens without clipping the dialog.

---

## Props

```ts
interface AttestationDetails {
  source: string      // e.g. "Stripe (live)"
  period: string      // e.g. "May 2026"
  recordCount: number // e.g. 1247
  merkleRoot: string  // full hex string; display truncated to 18 chars + ellipsis
}

interface AttestationConfirmModalProps {
  open: boolean                    // controls visibility
  onClose: () => void              // called on: ✕ click, Cancel, Escape, backdrop click (when !loading)
  onConfirm: () => void            // called when Confirm & Attest is clicked
  isLoading?: boolean              // default false
  error?: string | null            // shown as role="alert" when truthy; default null
  details?: AttestationDetails | null  // null shows loading placeholder; default null
}
```

---

## Dashboard integration

`src/pages/Dashboard.tsx` wires the modal to the "Trigger monthly revenue report" quick action:

```tsx
<button
  type="button"
  className="dashboard-action-btn"
  onClick={() => setModalOpen(true)}
>
  Trigger monthly revenue report
</button>

<AttestationConfirmModal
  open={modalOpen}
  onClose={handleClose}
  onConfirm={handleConfirm}   // async: awaits API call, then closes
  isLoading={isLoading}
  error={attestError}
  details={DEMO_DETAILS}
/>
```

When `handleConfirm` resolves (successfully), the modal closes automatically. In production, replace `Promise.resolve()` with the real API call; pass `error` if the API throws.

---

## Test coverage

File: `src/test/attestation-confirm-modal.test.tsx`

| Area | Tests |
|---|---|
| Closed state | 2 |
| Open — ARIA & structure | 10 |
| Attestation details (with / without) | 7 |
| Error state | 3 |
| Loading state | 6 |
| Dismissal actions (✕, Cancel, backdrop, dialog click, confirm) | 6 |
| Keyboard (Escape, Tab trap, Shift+Tab trap, other keys) | 6 |
| Focus management (open / close restore) | 2 |
| Dashboard integration | 9 |
| **Total** | **51** |

Branch coverage: **100%** for `AttestationConfirmModal.tsx` and `Dashboard.tsx` (global 98.42%, threshold 95%).

---

## axe audit checklist

- [ ] Zero contrast violations in axe DevTools
- [ ] `role="dialog"` + `aria-modal` pattern passes axe 4.x dialog rules
- [ ] `aria-labelledby` and `aria-describedby` IDs resolve to visible content
- [ ] `role="alert"` fires immediately on error (not deferred render)
- [ ] Tab cycles only within the dialog (no focus escape to background)
- [ ] Escape closes dialog; focus returns to trigger
- [ ] No content behind modal is reachable via keyboard while dialog is open
- [ ] `aria-busy="true"` on confirm button announced during loading
- [ ] Backdrop does not receive keyboard focus
