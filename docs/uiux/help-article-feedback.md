# Help Article Feedback — Design System Documentation

**Component:** `HelpArticleFeedback`
**Location:** `src/components/HelpArticleFeedback.tsx`
**Status:** Draft
**Last updated:** 2026-07-28

---

## Overview

A "Was this helpful?" thumbs-up / thumbs-down rating pattern with an optional
free-text follow-up field, designed to capture document quality signal for help
articles.

---

## Anatomy

| Element | Purpose |
|---|---|
| Heading (`<h3>`) | "Was this helpful?" — primary prompt |
| Thumbs up button | Positive signal; `aria-pressed` toggle |
| Thumbs down button | Negative signal; reveals comment textarea |
| Comment textarea | Optional free-text follow-up, max 500 chars |
| Submit button | Submits rating + comment; disabled until rating chosen |
| Thanks message | Confirmation shown after successful submit |
| Reset button | Allows re-submission after thanks |

---

## States

### Default
Thumbs up and down buttons are unselected. No actions taken.

### Rating Selected
One button is `aria-pressed="true"`. Submit button appears. If down is chosen,
the optional textarea becomes visible and receives focus automatically.

### Submitted (Thanks)
A confirmation message with `role="status"` replaces the form. A reset button
lets users submit different feedback.

### Error
Rate-limit or character-limit errors display as an `role="alert"` banner.

---

## Accessibility (WCAG 2.1 AA)

- **Buttons** use `aria-pressed` to convey the active rating state.
- **Grouping** uses `role="group"` with `aria-label="Rate this article"`.
- **Status region** uses `role="status"` with `aria-live="polite"` for the
  confirmation message.
- **Error messages** use `role="alert"` so screen readers announce them
  immediately.
- **Focus management**: auto-focus shifts to the textarea on down selection,
  and to the thanks confirmation after submit.
- **Keyboard**: all interactive elements are native `<button>` or `<form>`
  elements; no custom key handlers needed.
- **Skip link** compatibility: the component works within the existing skip-to-
  content flow.

---

## Rate Limiting

The component enforces a **60-second cooldown** between submissions to prevent
spam. When the cooldown is active, an error banner is shown and the submit button
is ignored.

---

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| `< 720px` | Buttons stack vertically; textarea full-width |
| `≥ 720px` | Buttons side-by-side with increased gap |

---

## Props

```tsx
interface HelpArticleFeedbackProps {
  articleId?: string        // Data attribute for tracking; defaults to 'help-article'
  onSubmit?: (rating: FeedbackRating, comment: string) => void
}

type FeedbackRating = 'up' | 'down' | null
```

---

## Theming

The component uses existing design tokens:
- `--surface` — button background
- `--surface-soft` — feedback section background
- `--accent` — active/pressed state and links
- `--success` — thanks confirmation icon
- `--danger-soft` — error banner background
- `--border` / `--border-strong` — borders and focus rings
- `--text` / `--muted` — text colors (auto-adapts light/dark)

---

## Before / After

### Before (no feedback mechanism)
```
┌──────────────────────────────┐
│  Getting Started with Veritasor  │
│  ...article body content...      │
│                                  │
│  [No way to rate this article]  │
└──────────────────────────────┘
```

### After (with HelpArticleFeedback)
```
┌──────────────────────────────┐
│  Getting Started with Veritasor  │
│  ...article body content...      │
│                                  │
│  Was this helpful?               │
│  👍 Helpful    👎 Not helpful    │
│                                  │
│  [Submit feedback]               │
│                                  │
│  Or: 👎 selected → textarea     │
│  ┌──────────────────────────┐   │
│  │ Any additional thoughts? │   │
│  │ (optional)               │   │
│  │ [________________]       │   │
│  │ 12/500 characters        │   │
│  └──────────────────────────┘   │
└──────────────────────────────┘
```

---

## Axe Notes

Run `npm run test -- --coverage` and the component targets 95%+ coverage.

Manual axe audit checklist:
- [ ] No color-contrast issues (all text uses `--text` / `--muted` tokens)
- [ ] All interactive elements have accessible names
- [ ] Focus indicator visible via `focus-visible` styles
- [ ] `aria-live` region announces confirmation
- [ ] `aria-pressed` accurately reflects state
- [ ] `role="alert"` announced for errors