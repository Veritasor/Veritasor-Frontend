// ---------------------------------------------------------------------------
// A11y audit — types and mock data
//
// Internal-only triage surface for WCAG/axe-core findings.
// Severity ordering follows the axe-core convention (critical → serious →
// moderate → minor). The chip colour tokens reuse the existing semantic
// tokens (--danger, --warning, --accent, --muted) so the panel matches the
// rest of the design system; colour is always paired with an explicit
// icon glyph and text label (dual-coding).
// ---------------------------------------------------------------------------

export type A11ySeverity = 'critical' | 'serious' | 'moderate' | 'minor'

export const SEVERITY_ORDER: readonly A11ySeverity[] = [
  'critical',
  'serious',
  'moderate',
  'minor',
] as const

export function isA11ySeverity(value: string): value is A11ySeverity {
  return (SEVERITY_ORDER as readonly string[]).includes(value)
}

export interface SeverityMeta {
  /** Short human label, used in chips and badges. */
  label: string
  /** Verbose label announced to assistive tech. */
  ariaLabel: string
  /** Single Unicode glyph that conveys the severity in monochrome print. */
  glyph: string
  /** Border / icon colour (CSS variable). */
  cssVar: string
  /** Soft fill colour for active chips (CSS variable or rgba()). */
  softCssVar: string
}

export const SEVERITY_META: Record<A11ySeverity, SeverityMeta> = {
  critical: {
    label: 'Critical',
    ariaLabel: 'Critical severity — blocking access',
    glyph: '!',
    cssVar: 'var(--danger)',
    softCssVar: 'var(--danger-soft)',
  },
  serious: {
    label: 'Serious',
    ariaLabel: 'Serious severity — major barrier',
    glyph: '⚠',
    cssVar: 'var(--warning)',
    softCssVar: 'var(--warning-soft)',
  },
  moderate: {
    label: 'Moderate',
    ariaLabel: 'Moderate severity — notable barrier',
    glyph: '◐',
    cssVar: 'var(--accent)',
    softCssVar: 'rgba(94, 234, 212, 0.12)',
  },
  minor: {
    label: 'Minor',
    ariaLabel: 'Minor severity — inconvenience',
    glyph: '·',
    cssVar: 'var(--muted)',
    softCssVar: 'var(--surface-soft)',
  },
}

export interface A11yIssue {
  id: string
  severity: A11ySeverity
  /** axe-core rule id, e.g. `color-contrast`, `label`. */
  ruleId: string
  /** Human-readable rule name. */
  ruleName: string
  /** WCAG SC, e.g. "1.4.3". */
  wcag: string
  /** DOM selector or aria-xpath. */
  selector: string
  description: string
  fixSuggestion: string
  /** Optional snippet of the offending innerHTML / aria-name. */
  element?: string
  /** Documentation URL. */
  url: string
  /** ISO timestamp the issue was detected. */
  detectedAt: string
  /** Page where the issue was detected. */
  documentTitle: string
}

// ---------------------------------------------------------------------------
// Mock fixtures (replace with real axe-core scan results in production).
// Twelve issues spread across the four severity bands so triage-by-chip is a
// realistic flow.
// ---------------------------------------------------------------------------

export const MOCK_ISSUES: readonly A11yIssue[] = [
  {
    id: 'issue-001',
    severity: 'critical',
    ruleId: 'image-alt',
    ruleName: 'Images must have alternative text',
    wcag: '1.1.1',
    selector: '#hero-illustration > img',
    description: 'An image is marked decorative but conveys load-bearing information about the attest flow.',
    fixSuggestion: 'Provide an `alt` attribute that describes the illustration, or use `role="presentation"` only for genuinely decorative images.',
    element: '<img src="/hero.svg" alt="">',
    url: 'https://dequeuniversity.com/rules/axe/4.7/image-alt',
    detectedAt: '2026-07-22T09:14:00Z',
    documentTitle: 'Landing page',
  },
  {
    id: 'issue-002',
    severity: 'critical',
    ruleId: 'color-contrast',
    ruleName: 'Elements must have sufficient color contrast',
    wcag: '1.4.3',
    selector: '.auth-secondary-button',
    description: 'Text on the secondary CTA falls below the 4.5:1 contrast ratio against `--surface`.',
    fixSuggestion: 'Increase text colour to `--text` (≈15:1) or darken the background.',
    element: 'Cancel',
    url: 'https://dequeuniversity.com/rules/axe/4.7/color-contrast',
    detectedAt: '2026-07-23T11:42:00Z',
    documentTitle: 'Signup',
  },
  {
    id: 'issue-003',
    severity: 'serious',
    ruleId: 'label',
    ruleName: 'Form elements must have labels',
    wcag: '3.3.2',
    selector: 'form.api-key-form > input[name="scope"]',
    description: 'The scope picker has no associated label, so screen readers announce it as "combobox".',
    fixSuggestion: 'Add a `<label for="api-key-scope">` or `aria-label` attribute.',
    element: '<input ...>',
    url: 'https://dequeuniversity.com/rules/axe/4.7/label',
    detectedAt: '2026-07-21T15:01:00Z',
    documentTitle: 'API keys',
  },
  {
    id: 'issue-004',
    severity: 'serious',
    ruleId: 'button-name',
    ruleName: 'Buttons must have discernible text',
    wcag: '4.1.2',
    selector: '.toast > button.close',
    description: 'The dismiss button relies on a "✕" glyph with no accessible name.',
    fixSuggestion: 'Provide an `aria-label="Dismiss notification"` attribute.',
    element: '<button class="close">✕</button>',
    url: 'https://dequeuniversity.com/rules/axe/4.7/button-name',
    detectedAt: '2026-07-20T08:33:00Z',
    documentTitle: 'Global toast',
  },
  {
    id: 'issue-005',
    severity: 'serious',
    ruleId: 'aria-toggle-field-name',
    ruleName: 'ARIA toggle fields must have accessible names',
    wcag: '4.1.2',
    selector: '.theme-switcher [role="radiogroup"]',
    description: 'The theme switcher radiogroup has no `aria-labelledby` reference.',
    fixSuggestion: 'Add `aria-labelledby="theme-switcher-label"` and ensure a heading with that id exists.',
    url: 'https://dequeuniversity.com/rules/axe/4.7/aria-toggle-field-name',
    detectedAt: '2026-07-19T10:11:00Z',
    documentTitle: 'Top app bar',
  },
  {
    id: 'issue-006',
    severity: 'moderate',
    ruleId: 'landmark-unique',
    ruleName: 'Landmarks should be unique',
    wcag: '4.1.2',
    selector: 'main[aria-label], main[aria-label="…"]',
    description: 'More than one `<main>` landmark uses the same label, making top-level navigation ambiguous.',
    fixSuggestion: 'Differentiate landmark labels with the parent context (e.g., "Settings content").',
    url: 'https://dequeuniversity.com/rules/axe/4.7/landmark-unique',
    detectedAt: '2026-07-18T13:27:00Z',
    documentTitle: 'Settings',
  },
  {
    id: 'issue-007',
    severity: 'moderate',
    ruleId: 'heading-order',
    ruleName: 'Heading levels should only increase by one',
    wcag: '1.3.1',
    selector: '.attestation-detail h3',
    description: 'The detail page skips from `<h2>` to `<h3>` for the metadata card label.',
    fixSuggestion: 'Use a `<p class="caption">` instead of an `h3`, or insert an `<h2>` wrapper.',
    url: 'https://dequeuniversity.com/rules/axe/4.7/heading-order',
    detectedAt: '2026-07-17T09:50:00Z',
    documentTitle: 'Attestation detail',
  },
  {
    id: 'issue-008',
    severity: 'moderate',
    ruleId: 'tabindex',
    ruleName: 'No element should have a positive tabindex',
    wcag: '2.4.3',
    selector: '#command-palette input',
    description: 'The command-palette search field uses a positive `tabindex` to keep focus order; users land on it unexpectedly after page load.',
    fixSuggestion: 'Use DOM ordering for tab order and rely on natural focus restoration when the palette opens.',
    url: 'https://dequeuniversity.com/rules/axe/4.7/tabindex',
    detectedAt: '2026-07-16T16:02:00Z',
    documentTitle: 'Command palette',
  },
  {
    id: 'issue-009',
    severity: 'minor',
    ruleId: 'meta-viewport',
    ruleName: 'Zooming and scaling must not be disabled',
    wcag: '1.4.4',
    selector: 'meta[name="viewport"]',
    description: 'The maximum-scale attribute is set below 2 on the dataset export page.',
    fixSuggestion: 'Remove `maximum-scale` or set it to `5` to allow users to zoom freely.',
    url: 'https://dequeuniversity.com/rules/axe/4.7/meta-viewport',
    detectedAt: '2026-07-15T07:18:00Z',
    documentTitle: 'Data export',
  },
  {
    id: 'issue-010',
    severity: 'minor',
    ruleId: 'list',
    ruleName: 'Lists must only contain `<li>` elements',
    wcag: '1.3.1',
    selector: 'ul.dashboard-actions',
    description: 'A non-`<li>` element appears as a direct child of the dashboard actions list.',
    fixSuggestion: 'Wrap the stray element in an `<li>`, or use a `<div>` instead of the `<ul>`.',
    element: '<div class="empty-state"></div>',
    url: 'https://dequeuniversity.com/rules/axe/4.7/list',
    detectedAt: '2026-07-14T11:45:00Z',
    documentTitle: 'Dashboard',
  },
  {
    id: 'issue-011',
    severity: 'minor',
    ruleId: 'definition-list',
    ruleName: '`<dl>` must have direct `<dt>` and `<dd>` children',
    wcag: '1.3.1',
    selector: 'dl.meta-row',
    description: 'The meta-row `<dl>` wraps each row in a `<div>` which breaks some assistive-tech navigation.',
    fixSuggestion: 'Either remove the wrapper `<div>`s or use `role="list"` with paired `<dt>/<dd>`-equivalent markup.',
    url: 'https://dequeuniversity.com/rules/axe/4.7/definition-list',
    detectedAt: '2026-07-13T14:09:00Z',
    documentTitle: 'Attestation detail',
  },
  {
    id: 'issue-012',
    severity: 'critical',
    ruleId: 'region',
    ruleName: 'All page content must be contained by landmarks',
    wcag: '1.3.1',
    selector: 'body > .floating-error',
    description: 'A floating error toast is rendered outside any landmark, so landmark-based screen-reader navigation skips it.',
    fixSuggestion: 'Move the toast into the toast `<div role="region" aria-live="polite">` container, or add `role="status"` to the toast markup.',
    url: 'https://dequeuniversity.com/rules/axe/4.7/region',
    detectedAt: '2026-07-12T08:01:00Z',
    documentTitle: 'Global error toast',
  },
]

export const ENTITY_LABEL = 'accessibility issue'

/** Filter issues to those whose severity is in the active set (or all when empty). */
export function filterBySeverities(
  issues: readonly A11yIssue[],
  active: readonly A11ySeverity[],
): A11yIssue[] {
  if (active.length === 0) return [...issues]
  return issues.filter((i) => active.includes(i.severity))
}

/** Case-insensitive substring search across rule id, selector, description, and wcag. */
export function matchesQuery(issue: A11yIssue, q: string): boolean {
  if (!q) return true
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return (
    issue.ruleId.toLowerCase().includes(needle) ||
    issue.ruleName.toLowerCase().includes(needle) ||
    issue.selector.toLowerCase().includes(needle) ||
    issue.description.toLowerCase().includes(needle) ||
    issue.wcag.toLowerCase().includes(needle) ||
    (issue.documentTitle?.toLowerCase().includes(needle) ?? false)
  )
}
