# Not-Found Page

## References

- Issue: `#130`
- Route: `path="*"`
- Page: `src/pages/NotFound.tsx`

## Goal

Give users a clear, branded recovery path when they land on an unknown URL. The page should explain what happened, avoid dead ends, and send people back to known safe destinations.

## Pattern

- Use the shared dark surface, border, radius, accent, muted text, and shadow tokens from `src/index.css`.
- Keep one meaningful `h1`: "We could not find that page".
- Lead with the primary recovery action, "Back to dashboard".
- Include a secondary "Go to login" action for users whose session or bookmark may be stale.
- Provide support links for attestations and secure sign-in without introducing new navigation patterns.

## Accessibility Notes

- The page uses a section labelled by the `h1` so screen-reader users get immediate orientation.
- Links use semantic anchors through React Router `Link`, so keyboard activation and accessible names are native.
- Tap targets meet the 44px minimum through `3.5rem` primary actions and `4.5rem` support links.
- Text uses `var(--text)` and `var(--muted)` on dark surfaces, matching existing WCAG 2.1 AA contrast assumptions.
- Layout stacks at mobile widths and becomes two columns for action groups at `720px`, avoiding horizontal scrolling.

## Review Notes

- Check `/not-a-real-route` and confirm the 404 heading is visible.
- Tab through the page and confirm focus is visible on every link.
- Confirm the primary action routes to `/` and the secondary action routes to `/login`.
- Validate at mobile, tablet, desktop, and 200% zoom.
