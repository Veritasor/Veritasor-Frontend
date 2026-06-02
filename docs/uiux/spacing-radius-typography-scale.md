# Spacing, Radius, and Typography Scale

## References

- Issue: `#118`
- Foundation file: `src/index.css`
- Consumers: auth screens, app shell, dashboard pages

## Spacing Scale

Use `--space-*` tokens for layout, component padding, and gaps. The scale is intentionally compact so pages remain dense enough for operational finance workflows while preserving readable touch targets.

| Token | Value | Intended usage |
| --- | --- | --- |
| `--space-0` | `0` | Reset margins and padding |
| `--space-1` | `0.25rem` | Fine alignment, icon offsets |
| `--space-2` | `0.5rem` | Compact field gaps and nav item padding |
| `--space-3` | `0.75rem` | Inline element gaps and small stacks |
| `--space-4` | `1rem` | Default component padding |
| `--space-5` | `1.25rem` | Form rhythm and list indentation |
| `--space-6` | `1.5rem` | Mobile section padding and card padding |
| `--space-8` | `2rem` | Desktop page padding and major stack gaps |
| `--space-10` | `2.5rem` | Large card padding when extra breathing room is needed |
| `--space-12` | `3rem` | Desktop hero and panel padding |
| `--space-touch` | `3.5rem` | Primary button and input minimum height |

## Radius Scale

Radius tokens already existed and remain the canonical shape system.

| Token | Value | Intended usage |
| --- | --- | --- |
| `--radius-sm` | `0.75rem` | Inputs, buttons, page cards, nav links |
| `--radius-md` | `1.25rem` | Emphasized cards and contained surfaces |
| `--radius-lg` | `1.75rem` | Large shells and full-screen panels |

## Typography Scale

Use `--text-*` tokens for font sizing and `--leading-*` tokens for line-height. Display sizes use `clamp()` so headings stay responsive without requiring viewport-scaled body text.

| Token | Value | Intended usage |
| --- | --- | --- |
| `--text-xs` | `0.78rem` | Eyebrows and uppercase metadata |
| `--text-sm` | `0.9rem` | Inline links and helper messages |
| `--text-md` | `0.95rem` | Labels, footers, compact body text |
| `--text-base` | `1rem` | Default body text and card headings |
| `--text-lg` | `1.1rem` | Brand text and emphasized labels |
| `--text-xl` | `1.25rem` | App brand and compact section titles |
| `--text-display` | `clamp(1.8rem, 4vw, 3rem)` | Page and panel titles |
| `--text-hero` | `clamp(2rem, 5vw, 4.5rem)` | Large hero titles only |

| Token | Value | Intended usage |
| --- | --- | --- |
| `--leading-tight` | `1.05` | Display and hero headings |
| `--leading-normal` | `1.5` | Compact body and labels |
| `--leading-relaxed` | `1.6` | Paragraphs, descriptions, and messages |

## Usage Rules

- Reach for tokens before adding literal spacing, radius, or font-size values.
- Use `--space-touch` for primary interactive controls that need a comfortable touch target.
- Use `--text-display` for app page headings and `--text-hero` only for immersive hero content.
- Keep body text at `--text-base`, `--text-md`, or `--text-sm`; do not scale body text with viewport width.
- Pair `--radius-sm` with dense operational components and reserve larger radii for full shells or visually prominent surfaces.

## Accessibility Notes

- The tokenized controls preserve the existing `3.5rem` input and button height, exceeding the 44px target-size baseline.
- The shell now stacks navigation above content on narrow screens and returns to a sidebar at `720px`, avoiding horizontal overflow.
- Typography uses fixed body-size tokens and responsive display tokens, so 200% zoom can reflow without clipped text.
- Color tokens were not changed; existing text, muted text, and accent pairings continue to target WCAG 2.1 AA contrast.

## Review Notes

- Check `/`, `/attestations`, `/login`, `/signup`, and `/forgot-password` at mobile, tablet, and desktop widths.
- Tab through the app shell and auth forms to confirm focus rings remain visible.
- Confirm no new component spacing uses one-off numeric values where a `--space-*`, `--radius-*`, or `--text-*` token would fit.
