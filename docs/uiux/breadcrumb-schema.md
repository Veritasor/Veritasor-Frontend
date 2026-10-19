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

- Ensure that any `href` provided to the component resolves to a fully qualified absolute URL when the JSON-LD is generated (the component uses `window.location.origin` as a base).
- The final current-page item intentionally omits the `item` URL property in the JSON-LD, per schema.org best practices for the current page.
