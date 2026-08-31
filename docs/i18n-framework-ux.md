# Internationalization Framework UX

Design contract for the framework-level internationalization (i18n) UX in `Veritasor-Frontend`.
The implementation lives in `src/components/LocalePicker/LocaleAccountMenu.tsx` and is mounted
once at the app root in `src/App.tsx`. It wraps the existing accessible `LocalePicker`.

## Goals

- Make adding a language a config-only change (no component rework).
- Show each language in its own script alongside its English label.
- Date, number, and currency formatting follows the active locale automatically.
- Accessible (WCAG 2.1 AA), responsive, and RTL-safe.

## Locale picker (account menu)

`LocaleAccountMenu` renders a single, always-available entry in the app shell:

- Trigger button shows the current language as `nativeLabel` (e.g. `العربية`, `中文`,
  `Español`) plus the English `label` and the ISO code badge.
- It opens a labelled `role="dialog"` panel that contains the `LocalePicker` and a collapsible
  "Translator copy guidance" section.
- `aria-haspopup="dialog"` / `aria-expanded` / `aria-controls` expose state to assistive tech.
- Focus returns to the trigger on `Escape` or outside click.
- `ArrowDown` / `Enter` / `Space` opens the menu from the trigger; `Escape` and outside click close it.

## Adding a language

1. Add an entry to `SUPPORTED_LOCALES` in `src/i18n/config.ts`:

   ```ts
   { code: 'ja', label: 'Japanese', nativeLabel: '日本語', dir: 'ltr', translationCompletion: 0 }
   ```

2. Add `src/i18n/messages/ja.json` with the message keys (copy from `en.json` as a baseline).
3. Update `translationCompletion` as translations land. No component changes required.

## Fallback rules

Defined in `src/i18n/config.ts` and applied by `LocaleProvider` (`src/i18n/provider.tsx`):

1. **Saved preference** from `localStorage["preferred-locale"]`, normalized via `normalizeLocale`.
2. **Browser language** (`navigator.language`), matched by exact code then language-only prefix.
3. **Final fallback** to `FALLBACK_LOCALE = 'en'`.

`normalizeLocale` maps unknown/invalid input (including garbage like `xx-unsupported`) to the
default locale, so the UI never renders an unsupported state. Missing message keys fall back to
English (`defaultLocale`), so partial translations stay usable. Date/number/currency formatters
(`src/i18n/formatters.ts`) fall back to the `en` locale per field when a locale has no rule.

## Copy guidance for translators (ICU patterns)

Use **ICU MessageFormat** for every user-facing string:

- Never concatenate translated fragments (`"Hello " + name`). Use `{name}`.
- Respect plural/gender/select rules:

  ```
  {count, plural, =0 {No items} one {# item} other {# items}}
  ```

- Do not interpolate inside a word; word boundaries differ across languages.
- Keep labels short and let the layout wrap — do not hard-code widths.
- Numbers, dates, and currencies are formatted by the active locale automatically via
  `useLocale().formatNumber / formatDate / formatCurrency`; do not format them by hand.

## Accessibility & responsive notes

- Native labels use `dir="auto"` and `lang={code}` so screen readers announce correctly.
- Translation-completion chips carry an `aria-label` (`"NN% translated"`).
- On `max-width: 640px` the panel becomes a bottom sheet (`position: fixed` bottom, full width).
- RTL locales (e.g. `ar`) flip `dir` on `<html>` and the menu via the locale context.

## Verification

- Unit/integration: `src/components/LocalePicker/LocaleAccountMenu.test.tsx` (open/close, keyboard,
  outside click, locale selection, RTL, mobile bottom sheet, invalid-preference fallback).
- Lint/type/build: `npm run lint`, `npm run build`, `npm test`.
- Visual/axe checks recommended in CI for contrast, focus order, and RTL.
