# Content Security Policy & Security Headers

Veritasor handles sensitive API keys, OAuth tokens, and revenue attestation data (see [Stripe Connect Least Privilege](./uiux/stripe-connect-least-privilege.md)). To reduce XSS and data-exfiltration risk, the application ships without inline `<script>` tags in `index.html` (theme initialization is externalised to `public/theme-init.js`) and is designed to run under a strict Content Security Policy (CSP).

## Local Preview Headers

`vite.config.ts` configures `preview.headers` so `npm run build && npm run preview` serves the production bundle with:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Recommended Production Headers

Configure your CDN, reverse proxy, or hosting platform (e.g., Nginx, Cloudflare, Vercel, Netlify) to emit the following headers on all HTML responses:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.veritasor.app; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Directive Notes

| Directive | Value | Rationale |
| --- | --- | --- |
| `default-src` | `'self'` | Deny all unspecified resource types from third-party origins by default. |
| `script-src` | `'self'` | Disallows inline scripts (`'unsafe-inline'`) and `eval` (`'unsafe-eval'`). All scripts, including `/theme-init.js` and Vite bundles, load from `'self'`. |
| `style-src` | `'self' 'unsafe-inline'` | Allows bundled stylesheets and React inline `style` attributes. |
| `img-src` | `'self' data: blob:` | Allows local assets, inline data URIs, and `blob:` previews (e.g., logo uploads). |
| `font-src` | `'self' data:` | Restricts fonts to same-origin and embedded data URIs. |
| `connect-src` | `'self' <API_ORIGIN>` | Restricts `fetch`/XHR/WebSocket calls to same-origin and the configured Veritasor API origin. |
| `object-src` | `'none'` | Blocks `<object>`, `<embed>`, and `<applet>` plugins. |
| `base-uri` | `'self'` | Prevents `<base>` tag injection attacks. |
| `frame-ancestors` | `'none'` | Prevents clickjacking by disallowing embedding in iframes. |
| `form-action` | `'self'` | Restricts form submissions to same-origin endpoints. |
| `upgrade-insecure-requests` | *(production only)* | Automatically upgrades HTTP subresource requests to HTTPS in production. Omitted from `vite preview` so local `http://localhost` testing works. |

## Dependency Auditing

Run `npm run audit` (`npm audit --omit=dev`) to audit production runtime dependencies for known vulnerabilities.
