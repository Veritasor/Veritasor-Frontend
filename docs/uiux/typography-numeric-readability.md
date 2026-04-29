# Typography & Numeric Readability Specs

## 1. Scope & Objective
Define typographic rules for tabular numbers, monospace IDs, and currency formatting in UI specs to ensure a highly accessible, trust-heavy product experience for the Veritasor revenue attestation protocol.

## 2. Typographic Rules

### 2.1 Tabular Numbers (Data Tables & Financials)
- **Font Feature Settings**: Use `font-variant-numeric: tabular-nums` for all numeric data displayed in tables, dashboards, and financial summaries. This ensures that numbers align perfectly vertically, making it easier to compare digits.
- **Font Choice**: Prefer modern sans-serif typefaces with distinct numerals (e.g., Inter, Roboto, SF Pro) to prevent ambiguity between '0' and 'O', or '1', 'l', and 'I'.
- **Spacing**: Maintain adequate padding within table cells (minimum 12px) to prevent visual crowding.

### 2.2 Monospace IDs (Transaction Hashes & On-chain Proofs)
- **Font Choice**: Use a dedicated monospace font (e.g., Fira Code, Roboto Mono, SF Mono) for all system-generated IDs, transaction hashes, wallet addresses, and on-chain proofs.
- **Truncation & Copying**:
  - Long IDs (e.g., 0x addresses) should be truncated using middle truncation (e.g., `0x1234...abcd`) when space is limited.
  - Always provide an accessible "Copy to clipboard" button next to monospace IDs.
- **Styling**: Render IDs with a subtle background color or boundary to distinguish them from standard text.

### 2.3 Currency Formatting
- **Locale Separators**: Format currency and large integers with appropriate locale separators (e.g., `$1,234,567.89` for US layout, `1.234.567,89 €` for European layout). 
- **Decimal Alignment**: In tables, align currency values by the decimal point.
- **Signage**: Clearly distinguish positive and negative values using standard symbols (`+`, `-`) and color cues (e.g., Green for revenue, Red/Gray for deductions), ensuring color is not the *only* indicator of state.
- **Precision**: Use a consistent number of decimal places (e.g., 2 for fiat, up to 6 or 8 for crypto depending on the asset) to maintain alignment and readability.

## 3. Research & Validation

### 3.1 Locale Separators
- **Finding**: Users in different regions expect different grouping and decimal separators.
- **Recommendation**: Rely on the user's browser locale (via `Intl.NumberFormat`) by default, but allow manual override in user settings. Always fall back to a consistent default (e.g., `en-US`) if locale detection fails.

### 3.2 Alignment in Columns
- **Finding**: Center or left-aligning numbers makes comparison difficult across rows.
- **Recommendation**: Right-align all numerical data and currency in columns. For currencies with varying decimal counts, align strictly by the decimal point.

### 3.3 Screen Zoom & Responsiveness
- **Finding**: At 200% screen zoom (WCAG 2.2 requirement), dense tables break layout or truncate critical digits.
- **Recommendation**: Implement horizontal scrolling for data tables on smaller viewports or high zoom levels rather than truncating numbers. Ensure sticky headers and left-most identifying columns (like the ID) remain visible.

## 4. Edge States & Error Recovery

- **Empty States**: Display a clear placeholder (e.g., `—` or `$0.00`) instead of leaving cells blank or displaying `NaN`/`null`.
- **Loading States**: Use skeleton loaders roughly the width of expected data rather than spinners in individual table cells to reduce visual noise.
- **Permission Denied**: If a user lacks access to view specific revenue figures, display a lock icon and "Hidden" or "Restricted", with a tooltip explaining why.
- **Partial Data**: If attestation is pending, indicate the unverified state (e.g., grayed-out text, italicized, or an accompanying "Pending" badge) alongside the preliminary number.

## 5. Success Metrics (UX Outcomes)
- **Task Completion Rate**: Users successfully locate and copy an on-chain proof ID on the first attempt (>95% success).
- **Error Recovery**: Users easily identify discrepancies in revenue tables (measured by time-on-task during heuristic evaluations).
- **Time-on-task**: Decrease the time taken to cross-reference multiple attestation records by 20% through improved tabular alignment.

## 6. Accessibility & Guidelines (WCAG 2.2 AA)
- **Contrast**: Ensure all numbers, including "Pending" or disabled states, meet the minimum 4.5:1 contrast ratio against their backgrounds.
- **Focus Order**: Ensure "Copy" buttons next to monospace IDs are easily reachable via keyboard navigation in a logical DOM order.
- **Motion**: Avoid unnecessary animations when financial data updates in real-time; prefer subtle background highlights that fade (flash) to indicate a value change, respecting `prefers-reduced-motion` settings.

---
*Note to Engineering: These are component-agnostic specifications. Implementation details, such as specific React components or CSS variables, will be defined in a follow-up issue once these UX criteria are accepted.*
