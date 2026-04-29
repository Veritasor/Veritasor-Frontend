# Accessible Chart Patterns: Non-Color Cues

## Overview
This document specifies UI/UX patterns for trend visualization within Veritasor's dashboards, ensuring accessibility without relying solely on color. Given our trust-heavy domain (attestations, integrations, revenue signals), all data representations must be perceivable and understandable by all users, including those with visual impairments.

## Trend Visualization Patterns

To eliminate reliance on color-only cues, we propose the following **Multimodal Visualization Patterns**:

1. **Non-Color Indicators:**
   - **Shapes & Icons:** Pair status colors with distinct shapes (e.g., an upward-pointing triangle ▲ for positive revenue signals, a downward-pointing chevron ▼ for negative trends, and a dash — for neutral states).
   - **Textures & Patterns:** Use varied fill patterns (stripes, dots, crosshatches) to differentiate overlapping data series in bar and area charts.
   - **Line Styles:** Differentiate line charts using solid, dashed, and dotted line styles in addition to distinct markers at data points.
2. **Accessible Data Tables:**
   - Always provide a toggle to view chart data as an HTML data table (`<table>`). Tables must include proper `<caption>`, `<th>` with `scope` attributes, and `aria-sort` to communicate structure to screen readers.
3. **Explicit Text Labels:**
   - Ensure tooltips display the exact value, the data category, and any relevant trend indicator as plain text (e.g., "Revenue: $5,000 (+12%)"). Do not rely on a green or red border to convey the trend.

## Success Metrics
To validate the effectiveness of these patterns, we will measure:
- **Task Completion Rate:** The percentage of users successfully identifying data trends when charts are viewed in grayscale or with simulated color blindness.
- **Time-on-Task:** Time taken by screen-reader users to parse chart data via the accessible data table alternative.
- **Error Recovery:** The frequency of misinterpreting dense or overlapping data points.

## Edge States
Handling complex data states ensures reliability across the dashboard:

- **Empty States:** When a chart has no data (e.g., a new integration), replace the axes with a descriptive message ("No attestation data available for this period") and a prompt to adjust filters.
- **Loading States:** Display a skeleton loader that outlines the chart area and axes. Use a subtle pulsing animation that respects reduced motion preferences.
- **Permission Denied:** If a user lacks access to the data feeding a chart, hide the chart completely. Display an inline alert explaining the access restriction.
- **Partial Data:** When a time-series chart lacks data for certain intervals, do not connect the points across the gap. Display the gap explicitly or provide an annotation explaining the missing data.

## Research & Validation Findings

A heuristic evaluation was conducted focusing on current visualization constraints:

1. **Screen Reader Tables:** Relying purely on ARIA attributes applied to SVG elements proved brittle. **Recommendation:** A dedicated UI toggle to swap the visual chart for a semantic HTML table provides the most robust experience for screen reader users.
2. **Sparkline Limits:** Sparklines currently lack context. Without axes or clear markers, users struggle to identify the scale. **Recommendation:** Append explicit text labels for start/end values next to all sparklines.
3. **Dense Legends:** Legends with more than five items become difficult to parse, especially when using similar colors. **Recommendation:** Implement interactive legends that highlight the corresponding data series on focus or hover, and enforce line-style variations to aid visual differentiation.

## Accessibility Guidelines
All proposed patterns must adhere to WCAG 2.2 AA baseline standards:
- **Contrast:** Ensure all chart lines, text, and non-text visual boundaries meet a minimum contrast ratio of 3:1 against the background. Text elements must meet 4.5:1.
- **Focus Order:** Interactive chart elements (legends, tooltips, data table toggles) must be fully keyboard navigable with a logical left-to-right, top-to-bottom focus flow.
- **Motion:** Ensure tooltip animations or chart entrance animations respect the `prefers-reduced-motion` media query by falling back to instant transitions.
