# Edge Case Testing for Locale Formatters

## Overview

This document outlines the edge case testing scenarios for locale formatting utilities, including breakpoints, states, keyboard/screen-reader interactions, and contrast requirements.

## Test Environment

### Browsers
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Screen Readers
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS)
- TalkBack (Android)

### Breakpoints
- 320px (Mobile portrait)
- 375px (Mobile large)
- 768px (Tablet portrait)
- 1024px (Tablet landscape/Desktop)
- 1440px (Desktop large)
- 1920px (Desktop extra large)

## Edge Case Scenarios

### 1. Zero Values

#### Numbers
**Input**: `0`
**Expected Output**:
- en: `0`
- ar: `٠`
- All other locales: `0`

**Test Cases**:
- [ ] Display in table cell
- [ ] Display in card component
- [ ] Display in list item
- [ ] Display in modal
- [ ] Display at 320px breakpoint
- [ ] Display at 1920px breakpoint

#### Currency
**Input**: `0`
**Expected Output**:
- en: `$0.00`
- ar: `٠٫٠٠ US$`
- de: `0,00 €`
- fi: `0,00 €`

**Test Cases**:
- [ ] Display in price tag
- [ ] Display in transaction list
- [ ] Display in dashboard widget
- [ ] Display in receipt
- [ ] Display at all breakpoints

#### Percentage
**Input**: `0`
**Expected Output**:
- en: `0%`
- ar: `٠٪`
- All other locales: `0%`

**Test Cases**:
- [ ] Display in progress bar
- [ ] Display in chart tooltip
- [ ] Display in statistics card
- [ ] Display at all breakpoints

### 2. Negative Values

#### Numbers
**Input**: `-1234.56`
**Expected Output**:
- en: `-1,234.56`
- ar: `-١٬٢٣٤٫٥٦`
- es: `-1.234,56`
- fr: `-1 234,56`

**Test Cases**:
- [ ] Display in financial statement
- [ ] Display in balance sheet
- [ ] Display in chart
- [ ] Display in table
- [ ] Screen reader announces "minus"
- [ ] Color contrast for negative indicator (red text)
- [ ] Display at all breakpoints

#### Currency
**Input**: `-1234.50`
**Expected Output**:
- en: `-$1,234.50`
- ar: `-١٬٢٣٤٫٥٠ US$`
- de: `-1.234,50 €`
- fi: `-1.234,50 €`

**Test Cases**:
- [ ] Display in expense tracker
- [ ] Display in transaction list
- [ ] Display in budget overview
- [ ] Screen reader announces "negative"
- [ ] Color contrast for negative indicator
- [ ] Display at all breakpoints

### 3. Large Numbers

#### Numbers
**Input**: `1234567890.123456`
**Expected Output**:
- en: `1,234,567,890.12` (truncated to 2 decimals)
- ar: `١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢`
- es: `1.234.567.890,12`

**Test Cases**:
- [ ] Display in statistics dashboard
- [ ] Display in analytics chart
- [ ] Display in table with fixed width
- [ ] Overflow handling with CSS ellipsis
- [ ] Display at 320px breakpoint (critical)
- [ ] Display at 768px breakpoint
- [ ] Screen reader announces correctly

#### Currency
**Input**: `999999999.99`
**Expected Output**:
- en: `$999,999,999.99`
- ar: `٩٩٩٬٩٩٩٬٩٩٩٫٩٩ US$`
- de: `999.999.999,99 €`

**Test Cases**:
- [ ] Display in financial report
- [ ] Display in revenue chart
- [ ] Overflow handling in constrained space
- [ ] Display at 320px breakpoint (critical)
- [ ] Screen reader announces amount correctly

### 4. Decimal Values

#### Numbers
**Input**: `0.123456789`
**Expected Output**:
- en: `0.12` (truncated to 2 decimals)
- ar: `٠٫١٢`
- es: `0,12`

**Test Cases**:
- [ ] Display in precision measurements
- [ ] Display in scientific data
- [ ] Display in table
- [ ] Display at all breakpoints

#### Currency
**Input**: `0.01`
**Expected Output**:
- en: `$0.01`
- ar: `٠٫٠١ US$`
- de: `0,01 €`

**Test Cases**:
- [ ] Display in micro-transactions
- [ ] Display in fee breakdown
- [ ] Display in table
- [ ] Display at all breakpoints

### 5. Invalid Dates

#### Invalid Date String
**Input**: `"invalid-date"`
**Expected Output**: `"Invalid Date"` (native Date behavior)

**Test Cases**:
- [ ] Display error state
- [ ] Fallback to placeholder text
- [ ] Screen reader announces error
- [ ] Display at all breakpoints

#### Edge Date Values
**Input**: `new Date('9999-12-31')`
**Expected Output**: Valid formatted date

**Test Cases**:
- [ ] Display in date picker
- [ ] Display in calendar
- [ ] Display at all breakpoints

### 6. Time Edge Cases

#### Midnight
**Input**: `2024-01-15T00:00:00`
**Expected Output**:
- en: `12:00 AM`
- es: `0:00`
- ar: `١٢:٠٠ ص`

**Test Cases**:
- [ ] Display in schedule
- [ ] Display in timeline
- [ ] Screen reader announces "midnight"
- [ ] Display at all breakpoints

#### Noon
**Input**: `2024-01-15T12:00:00`
**Expected Output**:
- en: `12:00 PM`
- es: `12:00`
- ar: `١٢:٠٠ م`

**Test Cases**:
- [ ] Display in schedule
- [ ] Display in timeline
- [ ] Screen reader announces "noon"
- [ ] Display at all breakpoints

#### End of Day
**Input**: `2024-01-15T23:59:59`
**Expected Output**:
- en: `11:59 PM`
- es: `23:59`
- ar: `١١:٥٩ م`

**Test Cases**:
- [ ] Display in schedule
- [ ] Display in timeline
- [ ] Display at all breakpoints

### 7. Unsupported Locales

**Input**: `formatDate('2024-01-15', 'xx')`
**Expected Output**: Falls back to English formatting

**Test Cases**:
- [ ] Graceful fallback behavior
- [ ] No console errors
- [ ] Display at all breakpoints

### 8. RTL Layout Edge Cases (Arabic)

#### Mixed Content
**Input**: Arabic text with English brand names
**Test Cases**:
- [ ] Brand names display correctly in LTR
- [ ] Numbers display in Arabic-Indic digits
- [ ] Layout direction is RTL
- [ ] Display at all breakpoints

#### Long Arabic Text
**Input**: Long Arabic date string with weekday
**Test Cases**:
- [ ] Text wraps correctly
- [ ] No overflow at 320px breakpoint
- [ ] Screen reader announces correctly

#### Arabic Numbers in LTR Context
**Input**: Arabic-Indic digits in English text
**Test Cases**:
- [ ] Digits display correctly
- [ ] No layout issues
- [ ] Screen reader announces correctly

## Breakpoint-Specific Testing

### 320px (Mobile Portrait)

**Critical Scenarios**:
- [ ] Long date formats (full style) with ellipsis
- [ ] Large currency values with ellipsis
- [ ] Time with timezone abbreviation
- [ ] Arabic RTL layout
- [ ] Touch targets for interactive formatted elements

**CSS Requirements**:
```css
@media (max-width: 320px) {
  .formatted-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
```

### 768px (Tablet Portrait)

**Test Scenarios**:
- [ ] Medium date formats display correctly
- [ ] Currency values display without overflow
- [ ] Time formats display correctly
- [ ] Arabic RTL layout
- [ ] Touch targets adequate

### 1024px (Tablet Landscape/Desktop)

**Test Scenarios**:
- [ ] All date formats display correctly
- [ ] All currency values display correctly
- [ ] Time with timezone displays correctly
- [ ] Arabic RTL layout
- [ ] Hover states on interactive elements

### 1440px (Desktop Large)

**Test Scenarios**:
- [ ] All formats display with ample spacing
- [ ] Long formats display without truncation
- [ ] Arabic RTL layout
- [ ] Hover and focus states

### 1920px (Desktop Extra Large)

**Test Scenarios**:
- [ ] All formats display optimally
- [ ] No unnecessary whitespace
- [ ] Arabic RTL layout
- [ ] All interactive states

## State Testing

### Normal State
- [ ] All formats display correctly
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Text is readable

### Hover State
- [ ] Interactive formatted elements show hover indicator
- [ ] Color contrast maintained on hover
- [ ] No layout shift

### Focus State
- [ ] Keyboard focus indicator visible
- [ ] Focus indicator meets WCAG AA (3:1)
- [ ] Focus order logical

### Disabled State
- [ ] Disabled formatted elements show disabled state
- [ ] Color contrast maintained (3:1 for disabled)
- [ ] Screen reader announces "disabled"

### Error State
- [ ] Invalid formatted values show error indicator
- [ ] Error color contrast meets WCAG AA
- [ ] Screen reader announces error

### Loading State
- [ ] Loading placeholder for formatted values
- [ ] Skeleton loader matches formatted value width
- [ ] Screen reader announces "loading"

## Keyboard Navigation Testing

### Tab Order
- [ ] Tab navigates to interactive formatted elements
- [ ] Tab order follows logical reading order
- [ ] RTL tab order for Arabic locale

### Keyboard Shortcuts
- [ ] Enter/Space activates interactive formatted elements
- [ ] Escape closes modals with formatted values
- [ ] Arrow keys navigate within formatted lists

### Focus Management
- [ ] Focus moves correctly after formatting changes
- [ ] Focus is not trapped in formatted components
- [ ] Focus returns to correct position after modal close

## Screen Reader Testing

### NVDA (Windows)
- [ ] Dates announced in correct order
- [ ] Times announced with AM/PM or 24-hour format
- [ ] Numbers announced with separators
- [ ] Currency symbols announced correctly
- [ ] Arabic-Indic digits announced as digits
- [ ] RTL content announced correctly

### JAWS (Windows)
- [ ] Dates announced in correct order
- [ ] Times announced correctly
- [ ] Numbers announced correctly
- [ ] Currency symbols announced correctly
- [ ] Arabic-Indic digits announced correctly
- [ ] RTL content announced correctly

### VoiceOver (macOS)
- [ ] Dates announced in correct order
- [ ] Times announced correctly
- [ ] Numbers announced correctly
- [ ] Currency symbols announced correctly
- [ ] Arabic-Indic digits announced correctly
- [ ] RTL content announced correctly

### TalkBack (Android)
- [ ] Dates announced in correct order
- [ ] Times announced correctly
- [ ] Numbers announced correctly
- [ ] Currency symbols announced correctly
- [ ] Arabic-Indic digits announced correctly
- [ ] RTL content announced correctly

## Color Contrast Testing

### Normal Text
- [ ] Black on white: 21:1 ✅
- [ ] Dark gray on white: 12:1+ ✅
- [ ] White on dark: 12:1+ ✅
- [ ] Colored text on white: 4.5:1+ ✅

### Large Text (18pt+)
- [ ] Colored text on white: 3:1+ ✅
- [ ] White on dark: 3:1+ ✅

### Interactive Elements
- [ ] Link text: 4.5:1+ ✅
- [ ] Button text: 4.5:1+ ✅
- [ ] Focus indicator: 3:1+ ✅

### Error States
- [ ] Error text: 4.5:1+ ✅
- [ Error background: 3:1+ ✅

### Disabled States
- [ ] Disabled text: 3:1+ ✅
- [ ] Disabled background: 3:1+ ✅

## Performance Testing

### Rendering Performance
- [ ] Formatted values render within 16ms (60fps)
- [ ] No layout shifts after formatting
- [ ] No reflows during formatting

### Large Dataset Performance
- [ ] 1000+ formatted values render efficiently
- [ ] Virtual scrolling with formatted values
- [ ] Pagination with formatted values

### Memory Performance
- [ ] No memory leaks with formatter utilities
- [ ] Intl formatter instances cached appropriately
- [ ] No unnecessary re-renders

## Automated Testing

### Unit Tests
- [ ] All formatter utilities have unit tests
- [ ] Edge cases covered in unit tests
- [ ] Test coverage ≥ 95%

### Integration Tests
- [ ] Formatters work with React components
- [ ] Formatters work with locale context
- [ ] Formatters work with RTL layout

### Visual Regression Tests
- [ ] Screenshots for all locales
- [ ] Screenshots for all breakpoints
- [ ] Screenshots for all states

### Accessibility Tests
- [ ] axe DevTools scans pass
- [ ] No accessibility violations
- [ ] ARIA attributes correct

## Test Execution Checklist

### Pre-Release
- [ ] Run all unit tests
- [ ] Run all integration tests
- [ ] Run visual regression tests
- [ ] Run accessibility tests
- [ ] Manual testing on all breakpoints
- [ ] Manual testing with screen readers
- [ ] Manual testing with keyboard navigation
- [ ] Manual color contrast verification

### Continuous Integration
- [ ] Unit tests on every commit
- [ ] Linting on every commit
- [ ] Accessibility scans on PR
- [ ] Visual regression on PR

### Post-Release
- [ ] Monitor for accessibility issues
- [ ] Monitor for RTL layout issues
- [ ] Monitor for performance issues
- [ ] Gather user feedback on formatting

## Known Issues and Limitations

### Browser Limitations
- IE11 not supported (requires Intl polyfill)
- Safari 9+ required for full Intl support
- Some locale-specific nuances not covered

### Performance Limitations
- Large datasets may require virtualization
- Complex formatting may impact render performance

### Accessibility Limitations
- Some screen readers may announce numbers differently
- RTL layout may have edge cases with mixed content

## Recommendations

### For Developers
1. Test formatted values at 320px breakpoint
2. Test with screen readers during development
3. Verify RTL layout for Arabic locale
4. Use CSS ellipsis for long formatted values
5. Include edge cases in unit tests

### For QA
1. Include accessibility testing in test plans
2. Test at all breakpoints
3. Test with multiple screen readers
4. Test keyboard navigation
5. Verify color contrast

### For Designers
1. Design for longest formatted values
2. Consider RTL layout implications
3. Ensure adequate touch targets
4. Design for all breakpoints
5. Consider loading and error states

## References

- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN: Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
