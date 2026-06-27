# Translator guide

## 1. File format and key conventions
- Use flat message keys in the shape `namespace.component.element`.
- Never translate the key names themselves; only translate the values.
- To find untranslated entries, look for values ending in `_TODO` or values that exactly match the English text in a non-English file.

## 2. ICU message format reference
- Variables use the shape `{name}`. Keep the variable name inside the braces unchanged.
- Plurals use ICU syntax such as `{count, plural, one {# item} other {# items}}`.
- Select messages use syntax such as `{gender, select, male {He} female {She} other {They}}`.
- Number and date formatting skeletons such as `{amount, number, ::currency/USD}` control formatting and should not be translated.
- Arabic has six plural categories: `zero`, `one`, `two`, `few`, `many`, and `other`.

## 3. What not to translate
- Content inside `{}` such as variable names, plural keywords, and format skeletons.
- HTML tags if they appear in the message string.
- Brand names, product names, and proper nouns such as Veritasor, Stellar, and API.
- Units and currency codes such as USD, km, and MB.

## 4. RTL notes
- RTL languages such as Arabic read right-to-left. The app mirrors layout through `document.dir`; translators do not need to insert RTL formatting characters.
- Use mirrored punctuation where appropriate.
- Arabic numeric style in this app uses Arabic-Indic digits for locale formatting when the locale is set to Arabic.

## 5. Adding a new language
1. Add the locale to `SUPPORTED_LOCALES` in `src/i18n/config.ts`.
2. Copy `src/i18n/messages/en.json` to `src/i18n/messages/<code>.json`.
3. Translate each value, leaving `_TODO` on any untranslated key.
4. Run `npm run i18n:check` to verify every key from English is present in the new locale file.
5. Submit a PR; CI will block merge if any locale file is missing a key.

## 6. Testing translations
- Switch to a locale in development by using the locale picker or by running `localStorage.setItem('preferred-locale', 'es')` in the browser console and reloading.
- Watch for overflowing text, clipped labels, or broken RTL layout.
