# Attestation Certificate Print Stylesheet — Design System

**Component:** `src/pages/AttestationDetail.tsx`
**Stylesheet:** `src/pages/AttestationCertificate.print.css`
**Standard:** WCAG 2.1 AA · Grayscale-safe · Responsive (A4 + Letter)
**Added:** 2026-07-28

---

## Overview

The attestation certificate is the formal, on-paper rendition of a single
Stellar attestation proof. It is generated from the same source data as the
on-screen `AttestationDetail` view (`/attestations/:id`) by activating a
dedicated `@media print` stylesheet. The print experience:

- Hides interactive screen chrome (sidebar, app bar, breadcrumb, copy buttons,
  retry button, screen status pill) via a `.no-print` utility.
- Reveals a formal header, double-rule divider, certificate title, issuer
  statement, grayscale-safe status pill, on-paper seal, and signature footer
  via `.print-only` blocks and dedicated print rules.
- Renders with serif body type, sans-serif metadata, and an ink-friendly
  palette so that the document remains informative when printed on
  black-and-white printers.
- Uses named `@page` sizes (A4 primary, Letter secondary) with conservative
  margins and `page-break-*` rules so the certificate never splinters across
  pages.

The certificate is initiated by a **Print Certificate** button in the
on-screen header. Activating the button calls `window.print()`, and the
browser renders the same DOM through the print stylesheet.

---

## Visual layout (printed page)

```
┌────────────────────────────────────────────────────────────────┐  ← @page margin
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ [V·] VERITASOR           Revenue Attestation   Document ID │ │  ← certificate-header (double rule below)
│ │     PROTOCOL             Protocol              att-001     │ │
│ ├════════════════════════════════════════════════════════════┤ │
│ │                                                            │ │
│ │              ON-CHAIN REVENUE ATTESTATION                  │ │
│ │         Certificate of Revenue Attestation                 │ │
│ │     Formally attested on the Stellar public network.       │ │
│ │                                                            │ │
│ │ ┃ The 142 revenue entries … totalling 84,320.00 USD,       │ │  ← certificate-statement (bordered)
│ │ ┃ were committed to Stellar under 0x3a7b…117c9f4e… at …    │ │
│ │                                                            │ │
│ │ ├ MERKLE ROOT      0x3a7bd3…0 ⋯ ⋯ ⋯ 6b7c8                  │ │
│ │ ├ STELLAR TX       a1b2c3d4…b4c5d ⋯ ⋯ ⋯ e9f0a1b2          │ │
│ │ ├ TIMESTAMP        May 28, 2026, 2:32 PM                   │ │   data-label (sans, muted, uppercase)
│ │ ├ RECORDS          142 included revenue entries            │ │   data-value (serif, full hash in print)
│ │ ├ TOTAL REVENUE    84,320.00 USD                            │ │
│ │ ├ ATTESTATION ID   att-001                                 │ │
│ │ ├ VERIFICATION     ┌─[ ✓ VERIFIED ]─────────────────┐     │ │  ← grayscale-safe pill (double border + hatch)
│ │                  │  ╔═══════════════════════════╗  │           │
│ │                  │  ║   ⌬ STELLAR ON-CHAIN     ║  │           │  ← certificate-seal
│ │                  │  ║        PROOF SEAL         ║  │           │
│ │                  │  ╚═══════════════════════════╝  │           │
│ │                  └─────────────────────────────────┘     │ │
│ │                                                            │ │
│ ├════════════════════════════════════════════════════════════┤ │
│ │ Signed on behalf of the issuing authority:                │ │  ← certificate-footer
│ │                                Printed May 28, 2026, …    │ │
│ │     Veritasor Protocol                veritasor.app/      │ │
│ │     Issuing Authority                  attestations/att-001│ │
│ │                                                            │ │
│ │  Authenticated against Stellar transaction hash a1b2c3d…  │ │  ← certificate-authenticity
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## ARIA structure

```html
<article
  class="certificate"
  aria-label="Certificate of revenue attestation: att-001"
  data-cert-id="att-001"
>

  <!-- Screen chrome, hidden in print (.no-print) -->
  <nav aria-label="Breadcrumb" class="no-print">…</nav>
  <header class="screen-only">
    <h1>Attestation Proof</h1>
    <span role="status" aria-label="Verification status: Verified" class="no-print">Verified</span>
    <button class="no-print" aria-label="Print certificate">Print Certificate</button>
  </header>

  <!-- Print-only formal header -->
  <header class="certificate-header print-only" aria-label="Issuing authority header">
    <div class="certificate-brand">…logo + name…</div>
    <div class="certificate-header-meta">
      <strong>Document ID</strong> att-001
      <strong>Issued</strong> …
    </div>
  </header>

  <!-- Print-only title block -->
  <section class="certificate-title-block print-only" aria-label="Title">
    <p class="certificate-eyebrow">On-Chain Revenue Attestation</p>
    <h2 class="certificate-title">Certificate of Revenue Attestation</h2>
    <p class="certificate-subtitle">Formally attested on the Stellar public network.</p>
  </section>

  <!-- Print-only issuer statement -->
  <section class="certificate-statement print-only" aria-label="Issuance statement">
    The 142 revenue entries … were cryptographically committed …
  </section>

  <!-- Visible in both: DATA card with .certificate-data-row & .certificate-data-label -->
  <section aria-label="Attestation metadata">
    <dl>
      <div class="certificate-data-row">
        <dt class="certificate-data-label">Merkle Root</dt>
        <dd class="certificate-data-value">…</dd>
      </div>
      …
    </dl>
  </section>

  <!-- Print-only seal -->
  <aside class="certificate-seal print-only" aria-label="Issuance seal: Attested On-Chain">
    <svg role="img" aria-label="…">…circular text + monogram + glyph…</svg>
    <span class="certificate-seal-caption">Stellar On-Chain Proof Seal</span>
  </aside>

  <!-- Print-only failure notice (failed status only) -->
  <section class="certificate-failure-notice print-only" aria-label="Validation failure notice">…</section>

  <!-- Print-only footer -->
  <footer class="certificate-footer print-only" role="contentinfo" aria-label="Certificate footer">
    <div class="certificate-signature">…</div>
    <div class="certificate-meta-stack">…document, printed-on URL…</div>
  </footer>

  <!-- Print-only authenticity line -->
  <p class="certificate-authenticity print-only" aria-label="Authentication reference">…</p>

  <!-- Screen-only back link -->
  <div class="screen-only"><a aria-label="Back to attestations list" href="/attestations">…</a></div>
</article>
```

The status pill carries both `role="status"` and an `aria-label` that
encodes the status word (`verified|pending|failed`) so assistive tech reads
the same status both on-screen and on print.

---

## CSS architecture

### 1. `@page` rules

Two named sizes are defined so the certificate prints idiomatically whether
the user is on A4 (primary) or Letter paper (secondary). Margins are tuned
to leave room for printer hardware margins without crowding content:

```css
@page        { size: A4 portrait;       margin: 20mm 18mm 22mm 18mm; }
@page letter { size: letter portrait;   margin: 0.75in 0.75in 0.9in 0.75in; }
@page landscape { size: A4 landscape;   margin: 18mm; }
```

> **Running headers caveat.** `@top-left`, `@top-right`, and `@bottom-center`
> running content (the `Document att-001` line and page counter) is honoured
> by Firefox. Chromium-based browsers (Chrome, Edge, Brave) silently ignore
> these rules, so the running header may not appear at the very top of every
> printed page on those engines. Margins and page sizes are honoured by all
> engines and are the canonical guarantees of this stylesheet; the running
> header text is best-effort.
>
> Browser support for the named `@page letter` size varies. A4 is the
> de-facto primary; the unauthenticated `size: letter` literal in `@page letter`
> subtracts about 0.4 in of width on engines that don't recognise the named
> size, falling back to A4 portrait.

### 2. Print-only utilities

Two utility classes control print/screen exclusivity:

| Class        | Screen | Print |
|--------------|--------|-------|
| `.no-print`  | shown  | hidden |
| `.print-only`| hidden | shown |

`.no-print` is applied to the breadcrumb, screen status badge, header
controls, copy buttons, retry button, failure banner, and the Print
Certificate button itself. `.print-only` wraps the formal header, title
block, statement, seal, formal failure notice, signature footer, and
authenticity line.

### 3. Grayscale-safe status treatment

The on-screen status badge relies on color (green / amber / red). Print
cannot rely on color, so each status carries **three** distinguishing
channels:

| Channel   | Verified       | Pending               | Failed                       |
|-----------|----------------|-----------------------|------------------------------|
| Glyph     | `✓` checkmark  | `◷` hourglass         | `✕` cross                    |
| Label     | `VERIFIED`     | `PENDING ON-CHAIN CONFIRMATION` | `NOT ATTESTED — VALIDATION FAILED` |
| Border    | `3pt double`   | `1.5pt dashed`        | `2pt solid`                  |
| Backing   | 45° hatch 6%   | 0° hatch 5%           | -45° hatch 12%               |

The status `aria-label` always carries the status word, so the document is
equally informative to a screen reader.

### 4. Hash presentation

The Stellar transaction hash is truncated on screen (`a1b2c3d4…e9f0a1b2`)
to keep the row compact. The full hash is rendered alongside the truncated
form in a parallel `<span class="hash-full">`; print CSS hides the truncated
span, leaving the full hash readable on paper.

### 5. Page-break rules

| Selector | Rule | Reason |
|----------|------|--------|
| `.certificate-header`           | `page-break-after: avoid` | Keep header with title |
| `.certificate-title-block`      | `page-break-after: avoid` | Title with header |
| `.certificate-statement`        | `page-break-inside: avoid` | Statement stays whole |
| `.certificate-status`           | `page-break-after: avoid` | Pill with metadata |
| `.certificate-data-row`         | `page-break-inside: avoid` | Each row whole |
| `.certificate-footer`           | `page-break-before: avoid` | Footer with body |
| `.certificate-authenticity`     | `page-break-before: avoid` | Footer with authenticity |

### 6. Typography for paper

| Element | Family | Size |
|---------|--------|------|
| Body    | `"Times New Roman", "Times", "Liberation Serif", serif` | 11pt |
| Eyebrow / metadata / signature | `"Helvetica Neue", "Segoe UI", Arial, sans-serif` | 8–10pt |
| Title   | serif | 26pt |
| Hashes  | `"Courier New", "Courier", monospace` | 10pt |

A `@media print and (prefers-reduced-motion: reduce)` block disables any
residual transitions or animations during the print snapshot.

---

## Accessibility (WCAG 2.1 AA)

| Concern | Implementation |
|---|---|
| Semantic structure | `<article>` wraps the certificate; `<header>`/`<footer>`/`<section>` follow ARIA landmarks |
| Status semantics | Status pill carries `role="status"` and `aria-label="Status: verified|pending|failed"` |
| Hash semantics | `<code>` elements expose `aria-label="Merkle root hash"` and `aria-label="Stellar transaction hash"` |
| Screen-reader-only content | `.print-only` blocks are present in the DOM and announced by SR (most engines ignore `@media print`, so users with screen readers benefit from the same content) |
| Hyperlink context | `a[href]::after` prints the URL beside the label; internal/decorative links override `content: ""` |
| Reduced motion | Print + prefers-reduced-motion disables transitions/animations |
| Contrast (print) | All ink stays at `#000` on `#fff` — measured contrast ≥ 21:1 |
| Color independence | Status conveyed via glyph + label + border + hatching pattern (no color reliance) |
| Keyboard | Print Certificate button is focusable via Tab, activatable via Enter/Space, aria-labeled |
| Live announcements | Existing `aria-live="polite"` regions unchanged for copy-button feedback |

---

## Responsive behaviour

| Paper / Viewport | Behaviour |
|---|---|
| A4 portrait (210 × 297 mm) | Default; 20mm / 18mm / 22mm / 18mm margins |
| Letter portrait (8.5 × 11 in) | Applied via `@page letter`; 0.75in / 0.9in margins |
| A4 landscape | `@page landscape`; 18mm margins (footer spans two columns) |
| On-screen (any viewport) | `.print-only` is `display: none`; on-screen layout unaffected |

The data card's responsive layout (flex-wrap, 10rem dt label) is preserved
in the on-screen view via inline `display: flex`. In print, `.certificate-data-row`
switches to `display: grid` with `1.4in` label / `1fr` value columns and
`word-break: break-all` for long hashes.

---

## Props & behaviour

```ts
// AttestationDetail.tsx — pages remain stateless on print
useEffect(() => setPrintedOn(null), [id])     // reset on navigation
const handlePrint = () => {
  setPrintedOn(new Date().toISOString())     // capture current ISO timestamp
  requestAnimationFrame(() => window.print())
}
```

The `printedOn` ISO string is rendered in `<footer>` as a `<time dateTime="…">`
element; until the user activates Print, the footer shows a `(preview)`
suffix so on-screen reviewers do not mistake the certificate for a freshly
printed original.

| Variant | Visual cue | `aria-label` |
|---|---|---|
| Preview (not yet printed) | `(preview)` after the timestamp | — |
| Freshly printed | Real ISO timestamp | `datetime` attribute set |

---

## Visual reference

### Status glyphs (grayscale view)

```
  ╔════════════════════════╗        ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐        ╔════════════════════════╗
  ║      ✓ VERIFIED       ║        │ ◷ PENDING ON-CHAIN │        ║   ✕ NOT ATTESTED —   ║
  ║      (double border,  ║        │  CONFIRMATION      │        ║   VALIDATION FAILED  ║
  ║       45° hatch)      ║        │  (dashed border,   │        ║   (solid border,     ║
  ╚════════════════════════╝        │   0° hatch)        │        ║    -45° hatch)       ║
                                   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘        ╚════════════════════════╝
```

### Seal (printed SVG)

```
        ┌───────────────────────┐
       ╱   VERITASOR PROTOCOL   ╲
      │      ╭─────────╮         │
      │     │     V     │         │
      │     │  ✓ / ◷ / ✕ │         │
      │      ╰─────────╯         │
       ╲   ATTESTED ON-CHAIN     ╱
        └───────────────────────┘
```

---

## Files

| File | Purpose |
|---|---|
| `src/pages/AttestationDetail.tsx`                   | Adds `<article class="certificate">` wrapper, formal print-only blocks, Print Certificate button, and `.no-print`/`.print-only` markers |
| `src/pages/AttestationCertificate.print.css`        | Print-only stylesheet: `@page` rules, formal header/footer, seal, grayscale-safe status, page-break rules |
| `src/test/attestation-detail.test.tsx`              | Adds new `describe` blocks: structure/ARIA, status pill colors, no-print markers, hash reveal, Print button behaviour, navigation safety |
| `docs/uiux/certificate-print.md`                    | This document |

---

## axe audit checklist (print view)

- [ ] `article.certificate` has descriptive `aria-label`
- [ ] All anchors print URLs beside their labels (info-and-relationships)
- [ ] Status pill exposes status via `aria-label`, not color alone
- [ ] `prefers-reduced-motion: reduce` honoured during print
- [ ] No content has been pushed below 11pt font-size in print
- [ ] Seal SVG carries a meaningful `aria-label`
- [ ] Footer `time` element uses the `datetime` attribute
- [ ] Hyperlink URL is visible to sighted and screen-reader users after print
- [ ] Background is forced to white; no decorative gradients leak into print

---

## Revision notes

- `2026-07-28`: Initial certificate print stylesheet, seal, status pill,
  and design-system documentation.
