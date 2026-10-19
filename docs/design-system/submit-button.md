# Submit button micro-interactions

**Status:** Stable
**Component:** `SubmitButton` (`src/components/SubmitButton.tsx`)
**CSS:** `src/index.css` — `.auth-button`, `.auth-submit`

---

## Overview

Primary form submits on Login and Signup share one control for hover, press,
loading, and disabled. Pages decide when `busy` is true. The button owns the
spinner, label swap, `aria-busy`, and the disable lock.

```
idle  →  hover (lift) / press (scale + ripple)  →  busy (spinner + busyLabel)
disabled  →  no hover, press, or ripple; opacity 0.55
```

---

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `idleLabel` | `ReactNode` | required | Label when the request is not in flight. |
| `busyLabel` | `ReactNode` | required | Label while `busy` is true. |
| `busy` | `boolean` | `false` | In-flight. Sets `aria-busy` and disables the control. |
| `disabled` | `boolean` | `false` | Validation or TOS gate. Combined with `busy`. |
| `className` | `string` | `""` | Extra class. Does not replace `auth-button`. |
| `type` | `"submit" \| "button" \| "reset"` | `"submit"` | Native button type. |

`SUBMIT_DEMO_MS` (400) is the demo delay on screens with no auth API. Keep it
between 1ms and 1000ms.

---

## Motion tokens

| Token | Use on submit |
| --- | --- |
| `--motion-duration-xs` | Hover / press / color transition |
| `--motion-duration-sm` | Ripple |
| `--motion-duration-lg` | Spinner rotation |
| `--motion-easing-standard` | Hover, press, ripple |
| `--motion-easing-linear` | Spinner only |

Do not use `--motion-easing-spring` on submits.

Lift only under `@media (hover: hover)` so touch does not leave a stuck hover.

---

## Accessibility

| Concern | Implementation |
| --- | --- |
| Busy | `aria-busy="true"` while loading |
| Disable | `disabled={disabled \|\| busy}` so keyboard and pointer cannot re-fire |
| Label swap | `aria-live="polite"` on `.auth-submit-label` |
| Spinner | `aria-hidden="true"` and `focusable="false"` |
| Reduced motion | No lift, scale, ripple, or spinner rotation |
| Contrast | Keeps `.auth-button-primary` so high-contrast theme rules still apply |
| Keyboard | Native submit / Enter / Space. Do not intercept keydown. |

WCAG 2.1 AA: 1.4.3 contrast (existing primary colors), 2.1.1 keyboard, 2.3.3
animation from interactions (`prefers-reduced-motion`), 4.1.3 status via
`aria-busy` and the live label.

### Axe notes

There is no `jest-axe` in this repo. Check the control with Playwright
`@axe-core/playwright` on `/login` and `/signup` if you add an e2e spec. Unit
tests assert `aria-busy`, `disabled`, and `aria-hidden` on the spinner.

---

## Do / don't

**Do**

- Pass `busy` from in-flight state. Let `SubmitButton` disable the control.
- Use existing `--motion-*` tokens.
- Keep idle and busy labels short and specific (`Sign in` / `Signing in…`).

**Don't**

- Copy spinner markup into Login or Signup.
- Leave the native button enabled while a request is in flight.
- Use spring easing or a duration above `--motion-duration-xl`.
- Put this primitive on secondary, ghost, or SSO actions in this change.
- Invent a register/login API here; demo delay only.

---

## CSS architecture

```
.auth-button                 shared chrome (height, type, transition)
.auth-button-primary         fill (also targeted by high-contrast)
.auth-submit                 flex row, ripple host
.auth-submit-spinner         linear rotate; none under reduced motion
```

`disabled` and `busy` both map to the native `disabled` attribute. There is no
pointer-events-only lock.

---

## Before / after

| State | Before | After |
| --- | --- | --- |
| Hover | 160ms ease lift on all pointers | Tokenized lift, hover-capable pointers only |
| Press | None | `scale(0.98)` + ripple |
| Loading (Sign in / Create account) | Instant continue or native submit | Spinner, busy label, `aria-busy`, no second click |
| Reduced motion | Lift still ran | Instant, no transform or spinner spin |
