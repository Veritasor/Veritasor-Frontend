# Localization Layout Constraints and Truncation Rules

## Overview

This document outlines layout constraints and truncation rules for the Veritasor Frontend to ensure seamless localization support without compromising the trust-heavy UI. Veritasor deals with attestations, integrations, and revenue signals, where UI integrity is critical for user trust.

The primary focus is on accommodating string growth (e.g., German translations can be 20-30% longer than English) and right-to-left (RTL) languages while maintaining accessibility (WCAG 2.2 AA) and usability.

## Research and Validation

### String Growth Analysis
- **German**: Average string length increase of 20-30% compared to English. Compound words and formal language contribute to this.
- **Other languages**: French (10-15%), Spanish (5-10%), but prioritize German as the longest in European markets.
- **Impact**: Fixed-width elements (buttons, labels) must accommodate expansion without overflow or wrapping.

### Right-to-Left (RTL) Readiness
- **Scope**: Optional for initial release but planned for future markets (e.g., Arabic, Hebrew).
- **Requirements**: Use CSS logical properties (`margin-inline-start`, `padding-block-end`) instead of directional ones (`margin-left`, `padding-top`).
- **Validation**: Test with RTL simulation tools (e.g., Chrome DevTools RTL mode) to ensure icons, layouts, and text flow correctly.

### Button Width Rules
- **Flexible Width**: Buttons should use `min-width` with auto-expansion. Avoid fixed widths.
- **Minimum Width**: 120px for primary actions to prevent cramped appearance.
- **Maximum Width**: No hard limit, but ensure buttons don't exceed container width on mobile.
- **Truncation**: Never truncate button text; allow wrapping if necessary, but prefer single-line.

## General Layout Constraints

- **Responsive Design**: Use relative units (%, em, rem) for widths and spacing. Avoid absolute pixels for text containers.
- **Container Flexibility**: Dashboards and forms should use flexbox/grid with `min-content`/`max-content` where appropriate.
- **Text Containers**: Set `min-height` for readability, but allow vertical expansion.
- **Trust Elements**: Critical attestation displays (proofs, timestamps) must never truncate or overflow; use scroll or modal for long content.

## Component-Specific Rules

### Navigation and Menus
- **Sidebar/Dashboard Nav**: Use flexible widths; icons should remain visible. Text labels can wrap or truncate with ellipsis if space is constrained.
- **Breadcrumb**: Truncate middle segments with ellipsis (e.g., "Home > ... > Attestations").

### Forms and Inputs
- **Labels**: Allow multi-line if needed; ensure associated inputs remain aligned.
- **Placeholders**: Keep concise; avoid localization-dependent placeholders.
- **Error Messages**: Display below inputs; allow expansion without shifting layout.

### Tables and Lists
- **Attestation History**: Columns should be resizable; text can truncate with tooltips showing full content.
- **Headers**: Fixed height; truncate with ellipsis if too long.
- **Rows**: Allow vertical expansion for multi-line content.

### Buttons and CTAs
- **Primary Buttons**: Flexible width, centered text.
- **Secondary**: Same as primary, but ensure consistent sizing across locales.
- **Icon Buttons**: Icons only; tooltips for accessibility.

### Modals and Overlays
- **Width**: Responsive (80% max-width on desktop).
- **Content**: Scrollable; no fixed heights.

## Truncation Rules

- **Ellipsis**: Use `text-overflow: ellipsis` for single-line truncation.
- **Tooltips**: Required for truncated text; show full content on hover/focus.
- **Priority**: Never truncate trust-critical information (e.g., attestation IDs, timestamps, amounts). Use full display or scroll.
- **Fallback**: For unavoidable truncation, provide "Show More" links or expandable sections.
- **Accessibility**: Ensure truncated elements are keyboard accessible; screen readers should announce full text.

## Validation Criteria

- **Automated Tests**: Use CSS-in-JS or utility classes that adapt to content length.
- **Manual Review**: Test with mock long strings (e.g., append " - Übersetzung" to simulate German).
- **RTL Testing**: Enable RTL mode in browser dev tools; verify no layout breaks.
- **Accessibility Audit**: Run axe-core or similar on localized prototypes.

## Success Metrics

- **Task Completion**: 95%+ of UI elements accommodate 30% string growth without layout breaks.
- **Error Recovery**: Users can access full truncated content via tooltips/modals in <2 clicks.
- **Time-on-Task**: Localization testing adds <10% to development time.
- **Edge States**: Empty states, loading spinners, and error messages remain readable and accessible.

## Edge States Handling

- **Empty States**: Use flexible layouts; text can expand without overflow.
- **Loading**: Spinners should not shift layout; use skeleton screens if needed.
- **Permission Denied**: Error messages should be prominent and expandable.
- **Partial Data**: Gracefully handle missing fields; avoid breaking trust by hiding incomplete attestations.

## Implementation Notes

- **Component-Agnostic Specs**: Define states (normal, hover, focus), content rules, and interaction patterns independently of implementation.
- **Engineering Coordination**: Review with dev team for CSS Grid/Flexbox feasibility; avoid complex overrides.
- **Future Updates**: Re-evaluate after initial localization; monitor user feedback for RTL adoption.

This document serves as a foundation for accessible, localizable UI. Coordinate with design and engineering for iterative refinement.