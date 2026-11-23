# Breadcrumb Structured Data (JSON-LD)

To ensure search engines and assistive technologies can parse the navigation path correctly, our Breadcrumb component automatically emits `BreadcrumbList` schema.org structured data in JSON-LD format. 

## Implementation

The component takes the `items` array and constructs a `BreadcrumbList` object, appending a `<script type="application/ld+json">` tag alongside the `<nav>` structure.

### Example Output

Here is a copy-ready JSON-LD sample of what the component outputs for a nested page (e.g., Dashboard › Onboarding › Business details):

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Dashboard",
      "item": "https://veritasor.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Onboarding",
      "item": "https://veritasor.com/onboarding"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Business details"
    }
  ]
}
```

## Accessibility & SEO Benefits

- **Search Engines**: Search engines display breadcrumbs in search results, giving users a clear view of the page's position in the site hierarchy.
- **Assistive Technologies**: While the `<nav aria-label="Breadcrumb">` landmark handles in-page screen reader navigation, the schema metadata offers standard machine-readable context for indexing tools and advanced reader modes.

## Validation

- Ensure that any `href` provided to the component resolves to a fully qualified `http:` or `https:` URL when the JSON-LD is generated (the component uses `window.location.origin` as a base). Malformed URLs and unsafe schemes (`javascript:`, `data:`, `vbscript:`) are neither linked in the DOM nor emitted in JSON-LD.
- The final current-page item intentionally omits the `item` URL property in the JSON-LD, per schema.org best practices for the current page.

## Dynamic & Unknown Segments

Untrusted route parameters (such as `attestations/:id`) and unrecognized path segments appear directly in navigation chrome and must be normalized safely:

- **Dynamic segments (`attestations/:id`)**:
  - Decoded with a non-throwing percent-decoder (`sanitizeDynamicSegment`).
  - Stripped of ASCII control characters (`\u0000`–`\u001F`, `\u007F`) and Unicode BiDi override/isolate characters (`\u202A`–`\u202E`, `\u2066`–`\u2069`).
  - Escaped automatically in the DOM by React and in inline JSON-LD via `serializeJsonLd` (`<`, `>`, `&`, `\u2028`, `\u2029`).
  - Truncated to `maxLabelLength` (default `24` characters, with trailing `…`) while keeping the full label on the `title` attribute.
  - Falls back to `"Unknown"` if no printable characters remain after sanitization.
- **Unknown static segments**:
  - Segments not present in `KNOWN_SEGMENT_LABELS` fall back to a humanised label via `humanizeSegment` (percent-decoded, control/BiDi characters stripped, hyphens/underscores converted to spaces, title-cased; e.g. `my_custom-page` → `My Custom Page`), or `"Unknown"` if empty.
