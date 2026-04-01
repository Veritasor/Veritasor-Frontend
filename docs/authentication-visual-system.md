# Authentication Screens Visual System

## References

- Issue: `#28`
- Existing auth exploration notes: `Veritas login and Sign UIUX.txt`
- Figma concept reference: https://www.figma.com/design/iiJC76tgZiO4ZAU5gvmNhu/Veritas-Login-screen?node-id=1-223&t=rSlnndhCYxCpgNbZ-0
- Implemented routes: `/login`, `/signup`, `/forgot-password`

## Goal

Create a cohesive, accessible visual system for authentication screens that engineers can extend without redefining spacing, typography, or state treatment.

## Visual System Tokens

- Typography scale
- `eyebrow`: 0.78rem, 700, uppercase
- `label/body`: 0.92rem to 0.95rem
- `panel title`: clamp(1.8rem, 4vw, 3rem)
- `hero title`: clamp(2rem, 5vw, 4.5rem)

- Spacing scale
- `container padding`: 1rem mobile, 1.5rem tablet, 3rem desktop
- `form gap`: 1.25rem
- `input/message gap`: 0.5rem
- `section gap`: 2rem

- Surfaces and borders
- shared auth shell uses a glass surface with `var(--surface)` and a single border token
- inputs, cards, and buttons all use rounded corners from the same radius scale
- background uses layered gradients to keep auth pages distinct from the dashboard while still matching the dark product palette

## Interaction Hierarchy

- Primary action is always full-width on mobile and spans the full action row on tablet+
- Secondary actions stay outlined to avoid competing with the main completion path
- Ghost/disabled actions are visually quieter and never outrank the primary CTA
- Error, success, and warning states share the same spacing and border radius so validation feels systematic instead of ad hoc

## Accessibility Notes

- Focus is visible on links, inputs, and buttons through a 3px outline plus offset
- Contrast assumptions use near-white text on deep navy surfaces and tinted status backgrounds with readable foreground colors
- Keyboard flow is linear: brand link, form fields, inline recovery link where present, checkbox, then actions
- Touch targets use a minimum height of `3.5rem`
- Mobile-first layout avoids horizontal scrolling and stacks all actions into one column below `720px`

## Acceptance Criteria

- Login, signup, and forgot-password screens use the same typography, spacing, border, and action hierarchy tokens
- Each screen includes clear hover, focus, disabled, and at least one validation or informational state
- Error styling is consistent and readable without relying on color alone
- Layout remains usable at mobile, tablet, and desktop widths with no clipped content or horizontal overflow
- Engineers can implement new auth screens by reusing the shared shell and CSS classes without inventing new naming patterns

## Review Notes

- `Login` demonstrates inline error styling, checkbox treatment, and disabled/loading action treatment
- `Signup` demonstrates multi-column expansion at tablet width and password-strength support content
- `ForgotPassword` demonstrates recovery guidance with success and warning messaging
- Screenshots were not generated in this CLI-only environment; route-level review is available locally after `npm run dev`
