# Breadcrumb Navigation Pattern

## References

- Issue: `#185`
- Component: `src/components/Breadcrumb.tsx`
- Routes: `/attestations/:id`, `/onboarding`

## Goal

Provide a lightweight secondary wayfinding aid that tells users where they are within a nested route without competing with the sidebar's primary navigation. Breadcrumbs appear only on detail and wizard views — not on top-level pages where the sidebar active state is sufficient.

## When to Show a Breadcrumb

| Context | Breadcrumb trail |
|---|---|
| Attestation detail | Attestations › Attestation {id} |
| Onboarding wizard | Dashboard › Onboarding › {step title} |

Do not add a breadcrumb to top-level pages (Dashboard, Attestations list, Settings). The sidebar already conveys location there.

## Placement

- Render directly above the page `<h1>`, outside any card or panel.
- Use a standard `<nav aria-label="Breadcrumb">` wrapping an `<ol>` so assistive technology identifies the landmark separately from the main navigation sidebar.
- Margin below the breadcrumb is `1rem` to maintain vertical rhythm before the heading.

## Truncation Rules

Long route labels (e.g. a business name used as a step title) must not overflow the breadcrumb row or push the separator off-screen.

- **Default limit:** 24 characters per crumb label.
- Labels that exceed the limit are cut to 23 characters and appended with `…` (U+2026 HORIZONTAL ELLIPSIS).
- The full label is exposed via the `title` attribute on the element so pointer users can hover to read it. Screen readers receive the untruncated label through `aria-label` on the link or the visible `title`.
- The `maxLabelLength` prop on `<Breadcrumb>` can be overridden per call-site for layouts with more horizontal space.

### Examples

| Full label | Displayed (max 24) |
|---|---|
| `Business details` | `Business details` (no truncation) |
| `Document upload and verification` | `Document upload and verificat…` |
| `att-001` | `att-001` (no truncation) |

## Interaction and Visual Design

- All crumbs except the last are `<Link>` elements styled with the primary brand colour.
- The last crumb (current page) is a `<span aria-current="page">` with muted colour — it is not a link.
- Separator `/` is `aria-hidden="true"` so screen readers only hear `Attestations, Attestation att-001` rather than `Attestations slash Attestation att-001`.
- Focus and hover: ancestor links show an underline on hover. No extra ring needed — the browser default focus outline is preserved.

## Accessibility

- The `<nav>` landmark uses `aria-label="Breadcrumb"` to distinguish it from the sidebar `<nav aria-label="Main navigation">`.
- `aria-current="page"` on the final item allows screen readers to announce the current location without requiring separate visually-hidden text.
- Truncated labels always carry a `title` attribute so users with low vision who enlarge text can still discover the full string via tooltip.
- The component does not render if `items` is empty — this prevents an empty `<nav>` from appearing in the accessibility tree.

## Sidebar Coexistence

- The breadcrumb does not duplicate the sidebar's active link highlight. It adds depth information (which record or which step) that the sidebar cannot express.
- On mobile, the sidebar collapses into a hamburger. The breadcrumb remains visible above the page heading so users always know their location regardless of sidebar state.
- Do not place the breadcrumb inside the sidebar or the top app bar. It belongs to the page content region (`<main>`).

## Edge States

- **Single item:** If only one item is passed (unusual — avoid this), render it as a non-linked `aria-current="page"` span with no separator.
- **Missing `href`:** A crumb without an `href` renders as a plain `<span>` rather than a dead `<a>`. This is intentional for the current-page crumb and for any intermediate step that cannot be deep-linked.
- **Very long IDs:** Attestation IDs are truncated to the configured limit. The full ID remains accessible via `title` and in the `<h1>` below.
