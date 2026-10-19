# Terms of Service Versioned Changelog Modal

**Component:** `src/components/TermsOfServiceChangelogModal.tsx`  
**Integration:** `src/pages/Signup.tsx`  
**Standard:** WCAG 2.1 AA  
**Issue:** `#263`

---

## Purpose

When the Terms of Service changes, users should not be asked to accept a blank wall of legal text. The modal below presents:

- the current policy version
- the previous version for context
- a short diff summary with explicit change types
- links to download the full text in text and PDF form
- a required acknowledgement checkbox before the primary action is enabled

This keeps the legal update reviewable, keyboard-friendly, and consistent with the existing modal pattern used elsewhere in the product.

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Terms update                                  [Close]        │
├──────────────────────────────────────────────────────────────┤
│ Review the latest terms change log                           │
│                                                              │
│ v2.4.0  →  v2.3.0   Effective 2026-07-29                     │
│                                                              │
│ Download the complete policy                                 │
│ [Download full text] [Download PDF]                          │
│                                                              │
│ What changed in this release                                 │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                    │
│ │ Added     │ │ Updated   │ │ Removed   │                    │
│ │ Versioned │ │ Retention  │ │ Ambiguous │                    │
│ │ changelog │ │ language   │ │ wording   │                    │
│ └───────────┘ └───────────┘ └───────────┘                    │
│                                                              │
│ [ ] I have reviewed version v2.4.0 and understand it applies│
│                                                              │
│                 [Cancel] [Acknowledge and continue]          │
└──────────────────────────────────────────────────────────────┘
```

---

## Information Architecture

- **Title**: “Review the latest terms change log”
- **Version strip**: current version, previous version, and effective date
- **Downloads**: full text and PDF links for offline review
- **Diff summary**: three-card summary using `Added`, `Updated`, and `Removed`
- **Acknowledgement**: a checkbox tied to the enabling state of the CTA
- **CTA**: disabled until the checkbox is checked

---

## Accessibility

- Uses `role="dialog"` and `aria-modal="true"`
- Provides accessible naming via `aria-labelledby`
- Provides a descriptive summary via `aria-describedby`
- Traps focus within the modal while open
- Restores focus to the trigger when closed
- Supports `Escape` to close
- Keeps the acknowledgement checkbox and CTA large enough for touch targets
- Avoids colour-only meaning by pairing change type chips with text labels

### Keyboard order

1. Close button
2. Download links
3. Diff cards are read in document order
4. Acknowledgement checkbox
5. Cancel
6. Acknowledge and continue

---

## Responsive Behaviour

- On wide screens, the diff cards render in a three-column grid
- On small screens, the cards stack into a single column
- The modal width caps at a comfortable reading measure so legal text does not sprawl across the viewport
- Footer buttons stack vertically on mobile, following the existing modal pattern

---

## Data Contract

```ts
interface TermsChange {
  kind: 'Added' | 'Updated' | 'Removed'
  title: string
  detail: string
}

interface TermsOfServiceChangelogModalProps {
  open: boolean
  currentVersion: string
  previousVersion: string
  effectiveDate: string
  summary: string
  changes: TermsChange[]
  fullTextHref: string
  pdfHref: string
  onAcknowledge: (version: string) => void
  onClose: () => void
}
```

---

## Validation Notes

- The modal is covered by unit tests for open/closed rendering, download links, acknowledgement gating, and Escape-to-close behavior.
- The signup screen is covered by an integration test that verifies the create-account action remains disabled until acknowledgement is completed.
- Manual axe review should confirm:
  - no dialog name/description violations
  - no focus escape outside the overlay
  - no contrast regressions in the diff chips or warning strip

---

## Review Checklist

- [ ] Review button opens the modal
- [ ] Diff cards clearly communicate what changed
- [ ] Download links work for text and PDF outputs
- [ ] Checkbox is required before acknowledging
- [ ] CTA remains disabled until the checkbox is checked
- [ ] Escape and close button both dismiss the modal
- [ ] Focus returns to the trigger after close

