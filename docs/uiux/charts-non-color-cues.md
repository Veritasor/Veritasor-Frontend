# Accessible Chart Patterns: Non-Color Cues

## Overview
This document specifies UI/UX patterns for trend visualization within Veritasor's dashboards, ensuring accessibility without relying solely on color. Given our trust-heavy domain (attestations, integrations, revenue signals), all data representations must be perceivable and understandable by all users, including those with visual impairments. This document outlines the pattern for the attestation history trend chart, ensuring trends (counts, success vs failure) are communicated at a glance while reinforcing the brand's calm, data-forward voice.

## Trend Visualization Patterns

To eliminate reliance on color-only cues, we propose the following *Multimodal Visualization Patterns*:

1. **Non-Color Indicators:**
   - *Shapes & Icons** Pair status colors with distinct shapes (e.g., an upward-pointing triangle ▢ for positive revenue signals, a downward-pointing chevron ▷ for negative trends, and a dash — for neutral states).
   - *Textures & Patterns:* Use varied fill patterns (stripes, dots, crosshatches) to differentiate overlapping data series in bar and area charts.
   - *Line Styles:* Differentiate line charts using solid, dashed, and dotted line styles in addition to distinct markers at data points.
2. **Accessible Data Tables:**
   - Always provide a toggle to view chart data as an HTML data table (`<table>`). Tables must include proper `<caption>`, `<th>` with `scope` attributes, and `aria-sort` to communicate structure to screen readers.
3. **Explicit Text Labels:**
   - Ensure tooltips display the exact value, the data category, and any relevant trend indicator as plain text (e.g., "Revenue: $5,000 (+12%)"). Do not rely on a green or red border to convey the trend.

**This pattern is applied to the attestation history chart, specifically with a stacked bar/line variant that separates success and failure using fill patterns and line styles, not color alone.**

## Attestation History Chart Specification

The attestation history chart summarizes attestation activity over time on the Attestations page. It communicates trends in the total number of attestations as well as the split between successful and failed attestations over a selected time range.

[figure:/attestation-history-chart.png]

### Chart Type
- **Default:** Stacked bar chart showing counts on the y-axis and time on the x-axis.
   - Bars are stacked to show total count per period, with the bottom segment indicating successful attestations and the top segment indicating failudes.
   - *+Line overlay**: A line connecting the total count per period can be toggled on to emphasize the overall trend.  When enabled, the line uses a solid stroke with distinct markers at each data point.J
### Design Tokens
- **Axis and Grid:** Must meet WCAG 2.1 AA contrast ratios (text 4.5:1, non-text 3:1) against the background. Axis labels are set in the design system tokens (`.ch-axis-label`, `.ch-grid-line`).
- **Series:**
   - Successful: Fill with a solid pattern (e.g., solid color block) and a triangle marker at the top of each bar.
   - Failed: Fill with diagonal stripes (and/or crosshatch) and a circle marker at the top of each bar.
   - Total line (optional): Dashed line with square markers at data points.
   - Use the same colors defined in the design system for success/failure, but never rely on color alone to convey the category.

### Interactivity

- Hover: Display a tooltip with the exact value, category, and trend indicator as text, e.g.: "Successful: 124 on Jun 15. Failed: 3 on Jun 15. Total: 127."
Engular trend: last 14 days." 
- Keyboard Navigation: All interactive elements (legend, toggles, data points) are focusable via keyboard. Use arrow keys to move between data points, left/right to change time period, and Enter to select/activate a toggle. A clear focus indicator is visible at all times.
 - Chart Legend: Interactive legend items that highlight the corresponding series on hover or focus. The legend itself must be keyboard navigable.

- **View as Table Toggle:** A prominent toggle labeled "View as table" switches the chart for a semantic HTML table. The table must include:
  - a `<caption>` summarizing the content, e.g., "Attestation history for the last 30 days"
  - `<th>` elements with `scope="col"` for each column (e.g., Date0, Total, Successful, Failed)
   - `aria-sort` attributes on sortable column headers
  - A row per time period, and a summary row for totals if data warrants it.
   - Turn off color-coding or markers in the table, relying on text only.

$### Edge States

handling complex data states ensures reliability across the dashboard:

  - **Empty States:** When a chart has no data (e.g., a new integration), replace the axes with a descriptive message ("No attestation data available for this period") and a prompt to adjust filters. 
  - **Loading States:** Display a skeleton loader that outlines the chart area and axes. Use a subtle pulsing animation that respects reduced motion preferences.
  - **Permission Denied:** If a user lacks access to the data feeding a chart, hide the chart completely. Display an inline alert explaining the access restriction.
  - **Partial Data:** When a time-series chart lacks data for certain intervals, do not connect the points across the gap. Display the gap explicitly or provide an annotation explaining the missing data.

## Research & Validation Findings

A heuristic evaluation was conducted focusing on current visualization constraints:

1. **Screen Reader Tables:** Relying purely on ARIA attributes applied to SVG elements proved brittle. **Fecommendation:** A dedicated UI toggle to swap the visual chart for a semantic HTML table provides the most robust experience for screen reader users.
2. **Sparkline Limits:** Sparklines currently lack context. Without axes or clear markers, users struggle to identify the scale. **Recommendation:** Append explicit text labels for start/end values next to all sparklines.
3. **Dense Legends:** Legends with more than five items become difficult to parse, especially when using similar colors. **Recommendation:** Implement interactive legends that highlight the corresponding data series on focus or hover, and enforce line-style variations to aid visual differentiation.

## Accessibility Guidelines
All proposed patterns must adhere to WCAG 2.2 AA baseline standards:
  - **Contrast:** Ensure all chart lines, text, and non-text visual boundaries meet a minimum contrast ratio of 3:1 against the background. Text elements must meet 4.5:1.
   - **Focus Order:** Interactive chart elements (legends, tooltips, data table toggles) must be fully keyboard navigable with a logical left-to-right, top-to-bottom focus flow.
   - **Motion:** Ensure tooltip animations or chart entrance animations respect the prefers-reduced-motion media query by falling back to instant transitions.

## Success Metrics
To validate the effectiveness of these patterns, we will measure:
   - **Task Completion Rate:** The percentage of users successfully identifying data trends when charts are viewed in grayscale or with simulated color blindness.
   - **Time-on-Task:** Time taken by screen-reader users to parse chart data via the accessible data table alternative.
   - **Error Recovery:** The frequency of misinterpreting dense or overlapping data points.