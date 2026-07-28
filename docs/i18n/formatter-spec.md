# Locale Formatting Specification

## Overview

This document specifies the app-wide formatting rules for dates, times, currencies, and numbers per locale. All formatting utilities are centralized in `src/i18n/formatters.ts` and use the native JavaScript `Intl` API for consistent, locale-aware formatting.

## Supported Locales

- **en** - English (LTR)
- **es** - Spanish (LTR)
- **fr** - French (LTR)
- **ar** - Arabic (RTL)
- **zh** - Chinese Simplified (LTR)
- **de** - German (LTR)
- **fi** - Finnish (LTR)

## Accessibility Requirements (WCAG 2.1 AA)

### Text Alternatives
- All formatted values must be programmatically determinable
- Use semantic HTML elements for formatted content
- Provide `aria-label` or `aria-labelledby` for complex formatted values

### Color and Contrast
- Formatted text must meet minimum contrast ratio of 4.5:1 for normal text
- Formatted text must meet minimum contrast ratio of 3:1 for large text (18pt+)

### Keyboard Navigation
- All interactive formatted elements must be keyboard accessible
- Focus indicators must be visible on all formatted controls

### Screen Reader Support
- Formatted numbers include locale-appropriate separators for screen readers
- Currency symbols are announced correctly by screen readers
- Date and time formats are announced in locale-appropriate order

### Responsive Design
- Formatted values must not overflow their containers
- Use CSS `text-overflow: ellipsis` for long formatted values in constrained spaces
- Test formatted values at breakpoints: 320px, 768px, 1024px, 1440px

## Formatter Utilities

### Date Formatting

**Function:** `formatDate(date, locale, format)`

**Parameters:**
- `date`: Date | string | number - The date to format
- `locale`: string - Locale code (default: 'en')
- `format`: 'short' | 'medium' | 'long' | 'full' - Format style (default: 'medium')

**Format Styles:**
- **short**: Numeric month/day, 2-digit year (e.g., 1/15/24)
- **medium**: Abbreviated month, numeric day, 4-digit year (e.g., Jan 15, 2024)
- **long**: Full weekday, full month, numeric day, 4-digit year (e.g., Monday, January 15, 2024)
- **full**: Full date with time (e.g., Monday, January 15, 2024, 2:30 PM)

### Time Formatting

**Function:** `formatTime(date, locale, format)`

**Parameters:**
- `date`: Date | string | number - The date containing the time to format
- `locale`: string - Locale code (default: 'en')
- `format**: 'short' | 'medium' | 'long' - Format style (default: 'short')

**Format Styles:**
- **short**: Hour and minute (e.g., 2:30 PM)
- **medium**: Hour, minute, and second (e.g., 2:30:45 PM)
- **long**: Hour, minute, second, and timezone (e.g., 2:30:45 PM EST)

### Number Formatting

**Function:** `formatNumber(value, locale)`

**Parameters:**
- `value`: number - The number to format
- `locale`: string - Locale code (default: 'en')

**Behavior:**
- Uses locale-appropriate thousand separators
- Maximum 2 decimal places by default
- Arabic locale uses Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩)

### Currency Formatting

**Function:** `formatCurrency(value, locale)`

**Parameters:**
- `value`: number - The currency amount to format
- `locale`: string - Locale code (default: 'en')

**Currency Codes by Locale:**
- en, es, fr, ar, zh: USD (US Dollar)
- de, fi: EUR (Euro)

**Behavior:**
- Uses locale-appropriate currency symbol placement
- Always shows 2 decimal places
- Arabic locale uses Arabic-Indic digits

### Percentage Formatting

**Function:** `formatPercent(value, locale)`

**Parameters:**
- `value`: number - Decimal value (e.g., 0.5 for 50%)
- `locale`: string - Locale code (default: 'en')

**Behavior:**
- Converts decimal to percentage
- 0-2 decimal places based on value
- Arabic locale uses Arabic-Indic digits

### Precision Number Formatting

**Function:** `formatNumberWithPrecision(value, locale, minimumFractionDigits, maximumFractionDigits)`

**Parameters:**
- `value`: number - The number to format
- `locale`: string - Locale code (default: 'en')
- `minimumFractionDigits`: number - Minimum decimal places (default: 0)
- `maximumFractionDigits`: number - Maximum decimal places (default: 2)

**Use Case:**
- Custom precision for specific UI requirements
- Fixed decimal places for financial data

## Locale-Specific Examples

### Date Format Examples

| Locale | Short | Medium | Long | Full |
|--------|-------|--------|------|------|
| en | 1/15/24 | Jan 15, 2024 | Monday, January 15, 2024 | Monday, January 15, 2024, 2:30 PM |
| es | 15/1/24 | 15 ene 2024 | lunes, 15 de enero de 2024 | lunes, 15 de enero de 2024, 14:30 |
| fr | 15/01/24 | 15 janv. 2024 | lundi 15 janvier 2024 | lundi 15 janvier 2024 à 14:30 |
| ar | ١٥/١/٢٤ | ١٥ يناير ٢٠٢٤ | الاثنين، ١٥ يناير ٢٠٢٤ | الاثنين، ١٥ يناير ٢٠٢٤، ٢:٣٠ م |
| zh | 2024/1/15 | 2024年1月15日 | 2024年1月15日星期一 | 2024年1月15日星期一 下午2:30 |
| de | 15.1.24 | 15. Jan. 2024 | Montag, 15. Januar 2024 | Montag, 15. Januar 2024, 14:30 |
| fi | 15.1.24 | 15. tammik. 2024 | maanantai 15. tammikuuta 2024 | maanantai 15. tammikuuta 2024 klo 14.30 |

### Time Format Examples

| Locale | Short | Medium | Long |
|--------|-------|--------|------|
| en | 2:30 PM | 2:30:45 PM | 2:30:45 PM EST |
| es | 14:30 | 14:30:45 | 14:30:45 EST |
| fr | 14:30 | 14:30:45 | 14:30:45 EST |
| ar | ٢:٣٠ م | ٢:٣٠:٤٥ م | ٢:٣٠:٤٥ م EST |
| zh | 下午2:30 | 下午2:30:45 | 下午2:30:45 EST |
| de | 14:30 | 14:30:45 | 14:30:45 EST |
| fi | 14.30 | 14.30.45 | 14.30.45 EST |

### Number Format Examples

| Locale | 1,234.567 | 0 | -1,234.56 |
|--------|-----------|---|-----------|
| en | 1,234.57 | 0 | -1,234.56 |
| es | 1.234,57 | 0 | -1.234,56 |
| fr | 1 234,57 | 0 | -1 234,56 |
| ar | ١٬٢٣٤٫٥٧ | ٠ | -١٬٢٣٤٫٥٦ |
| zh | 1,234.57 | 0 | -1,234.56 |
| de | 1.234,57 | 0 | -1.234,56 |
| fi | 1 234,57 | 0 | -1 234,56 |

### Currency Format Examples

| Locale | 1,234.50 USD | 0 USD | -1,234.50 USD |
|--------|--------------|-------|---------------|
| en | $1,234.50 | $0.00 | -$1,234.50 |
| es | 1.234,50 $ | 0,00 $ | -1.234,50 $ |
| fr | 1 234,50 $US | 0,00 $US | -1 234,50 $US |
| ar | ١٬٢٣٤٫٥٠ US$ | ٠٫٠٠ US$ | -١٬٢٣٤٫٥٠ US$ |
| zh | US$1,234.50 | US$0.00 | -US$1,234.50 |
| de | 1.234,50 € | 0,00 € | -1.234,50 € |
| fi | 1 234,50 € | 0,00 € | -1 234,50 € |

### Percentage Format Examples

| Locale | 0.5 (50%) | 0.1234 (12.34%) | 1.0 (100%) |
|--------|-----------|-----------------|------------|
| en | 50% | 12.34% | 100% |
| es | 50% | 12,34% | 100% |
| fr | 50 % | 12,34 % | 100 % |
| ar | ٥٠٪ | ١٢٫٣٤٪ | ١٠٠٪ |
| zh | 50% | 12.34% | 100% |
| de | 50% | 12,34% | 100% |
| fi | 50 % | 12,34 % | 100 % |

## RTL Considerations

### Arabic (ar)
- Uses Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) for all numeric formatting
- Text direction is RTL (right-to-left)
- Numbers within RTL text follow Arabic numeral rules
- Currency symbols may appear before or after the amount based on locale conventions
- Date and time formats follow Arabic calendar conventions

### Implementation Notes
- The app automatically sets `document.dir` based on locale
- Formatters handle RTL automatically through the Intl API
- No manual RTL markup is required in formatted strings

## Usage Examples

### In React Components

```tsx
import { formatDate, formatCurrency, formatNumber } from '@/i18n/formatters'
import { useLocale } from '@/i18n/useLocale'

function TransactionItem({ transaction }) {
  const { locale } = useLocale()

  return (
    <div>
      <span>{formatDate(transaction.date, locale, 'medium')}</span>
      <span>{formatCurrency(transaction.amount, locale)}</span>
      <span>{formatNumber(transaction.quantity, locale)}</span>
    </div>
  )
}
```

### In Utility Functions

```ts
import { formatDate, formatTime, formatPercent } from '@/i18n/formatters'

export function formatEvent(event: Event, locale: string) {
  return {
    date: formatDate(event.startTime, locale, 'long'),
    time: formatTime(event.startTime, locale, 'short'),
    capacity: formatPercent(event.attendees / event.capacity, locale),
  }
}
```

## Testing

### Unit Tests
- All formatter utilities have comprehensive unit tests in `src/i18n/formatters.test.ts`
- Test coverage includes all supported locales
- Edge cases covered: zero, negative numbers, invalid dates, unsupported locales

### Visual Testing
- Test formatted values at all breakpoints
- Verify text does not overflow containers
- Check contrast ratios for formatted text
- Validate RTL layout for Arabic locale

### Accessibility Testing
- Use axe DevTools to verify WCAG 2.1 AA compliance
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Verify keyboard navigation for interactive formatted elements
- Check focus indicators on formatted controls

## Best Practices

1. **Always use formatter utilities** - Never manually format dates, times, or numbers
2. **Pass locale explicitly** - Use the locale from `useLocale()` hook or context
3. **Choose appropriate format style** - Use 'short' for space-constrained UI, 'long' for detailed views
4. **Test with real data** - Verify formatting with edge cases (zero, negative, large numbers)
5. **Consider context** - Use format styles appropriate to the UI context (e.g., 'short' in tables)
6. **Handle errors gracefully** - Formatters fall back to English for unsupported locales
7. **Document custom formats** - If you need custom formatting, document the rationale

## Adding a New Locale

1. Add locale to `SUPPORTED_LOCALES` in `src/i18n/config.ts`
2. Add format configurations to `DATE_FORMATS`, `TIME_FORMATS`, `NUMBER_FORMATS`, `CURRENCY_FORMATS`, and `PERCENT_FORMATS` in `src/i18n/formatters.ts`
3. Add examples to this specification document
4. Add unit tests for the new locale in `src/i18n/formatters.test.ts`
5. Test formatting with real data in the UI
6. Verify accessibility compliance for the new locale
7. Update this document with locale-specific considerations

## References

- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Unicode CLDR Locale Data](http://cldr.unicode.org/)
