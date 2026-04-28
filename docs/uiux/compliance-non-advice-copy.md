# UI/UX Design & Research: Veritasor Compliance & Non-Advice Copy

## Scope
This document outlines the UX research, content guidelines, success metrics, and accessibility baselines for revenue and bond-adjacent user interfaces within the Veritasor product experience. The core objective is to present financial data (revenue signals, integrations, bonds) in a highly trusted manner while strictly **avoiding regulated financial advice phrasing**.

---

## 1. Content Guidelines: Avoiding Financial Advice

In Veritasor’s trust-heavy domain, language must be precise, objective, and factual. Content should strictly describe what the platform does or what the data indicates, without telling the user what they *should* do with their capital.

### Do's and Don'ts
| **Do (Factual / Informational)** | **Don't (Advice / Directive)** |
|:---|:---|
| "View available bond offerings" | "Invest in these top bond offerings" |
| "Your current revenue run rate is $X" | "You should optimize your revenue run rate" |
| "Based on your historical data..." | "We recommend that you..." |
| "Select an integration to sync data" | "Choose this integration for the best results" |
| "Historical bond performance" | "Expected profitable returns" |

### Call-to-Action (CTA) Tone
*   **Action-oriented, not advisory:** Use verbs that describe the mechanical action of the system (e.g., `Review`, `View`, `Continue`, `Confirm`, `Connect`).
*   **Neutral progression:** Avoid suggestive verbs like `Capitalize`, `Profit`, or `Maximize`.
*   **Example CTAs:**
    *   *Instead of* `Invest Now` -> *Use* `Review Bond Details`
    *   *Instead of* `Grow Your Revenue` -> *Use* `Connect Revenue Sources`

---

## 2. Research & Validation Findings

### Jurisdictional Nuance
Veritasor serves a multi-jurisdictional audience. General rules:
1.  **US/SEC vs. UK/FCA vs. EU/ESMA:** Each jurisdiction has varying definitions of what constitutes "solicitation" or "financial advice." 
2.  **Mitigation Strategy:** Default to the most restrictive interpretation globally. Keep all platform copy strictly informational. Eliminate all forward-looking financial guarantees.

### Disclaimers Placement
1.  **Proximity:** Disclaimers must be logically grouped with the data they modify. For example, risk disclosures regarding bond historical performance must appear directly beneath the chart or data table.
2.  **Affirmative Consent:** In flows where capital may be allocated or legally binding attestations are signed, utilize explicit, un-prechecked checkboxes acknowledging risk.
3.  **Global Footer vs. Contextual Alerts:** Sitewide disclaimers belong in the footer, but context-specific warnings (e.g., "Yields are historically derived and do not guarantee future returns") must use localized Alert/Banner components.

---

## 3. Success Metrics

To ensure the UX effectively manages user expectations and minimizes friction while remaining compliant:

*   **Task Completion Rate:** > 90% for core flows (e.g., connecting a revenue integration, viewing a bond attestation), ensuring the neutral tone does not confuse users about the required system actions.
*   **Time-on-Task:** Ensure the time spent is within expected bounds. Unusual delays on disclaimer screens may indicate cognitive overload or poor readability.
*   **Error Recovery Rate:** > 95% recovery from edge states (e.g., permission denied on integrations), ensuring clear pathways forward without defaulting to advisory language.
*   **Comprehension (Qualitative):** Measured via periodic usability testing or unmoderated feedback to ensure users understand Veritasor is a platform, not an advisor.

---

## 4. Edge States & Error Handling

Even in failure states, language must remain objective and non-advisory.

### Empty State
*   **Scenario:** A user visits the bond portfolio or revenue dashboard without any connected data.
*   **Copy:** "No revenue data connected. Connect a data source to view your attestations."
*   **Visual:** Neutral illustration (no aggressive "missing out" patterns). Primary CTA to `Connect Data Source`.

### Loading State
*   **Scenario:** Fetching third-party integration data or attestation statuses.
*   **Copy:** "Retrieving attestation status..." or "Syncing revenue data..."
*   **Visual:** Skeleton loaders mapping the structural layout, minimizing layout shift.

### Permission Denied (Auth/Integration Error)
*   **Scenario:** OAuth token expired or inadequate permissions to view a specific revenue bond.
*   **Copy:** "Access restricted. You do not have the required permissions to view this attestation. Please contact your administrator."
*   **Actionable next step:** `Return to Dashboard` or `Request Access`.

### Partial Data State
*   **Scenario:** 1 of 3 integrated revenue sources failed to sync.
*   **Copy:** "Showing partial data. [Integration Name] failed to sync. Data last updated on [Date/Time]."
*   **Visual:** Inline warning banner near the timestamp/header, not blocking the user from viewing the available successful data.

---

## 5. Accessibility Baseline (WCAG 2.2 AA)

Proposed patterns adhere to WCAG 2.2 AA standards to ensure a highly accessible, trust-inspiring experience.

*   **Contrast Ratios:** All text, including disclaimers and secondary informational copy, must meet a minimum contrast ratio of `4.5:1` against their backgrounds.
*   **Focus Order & Visible Focus:**
    *   Strict logical DOM order matching visual flow.
    *   All interactive elements (CTAs, disclaimer toggles, integration list items) must possess a clear, minimum `2px` visible focus indicator.
*   **Motion & Animation:**
    *   Respect the user's `@media (prefers-reduced-motion)` operating system setting.
    *   Keep transitions (e.g., skeleton loaders, modal openings) brief and purposeful; do not use motion to draw undue attention to revenue fluctuations.
*   **Screen Readers (Semantic HTML):**
    *   Use appropriate `aria-live` regions for dynamic updates (e.g., when partial data finishes loading).
    *   Ensure disclaimers have descriptive `aria-labels` or `aria-describedby` links to the data they relate to.

---

## 6. Implementation Notes for Engineering
*   **Component Agnostic:** The guidelines above describe states, content rules, and interaction expectations. Engineering should map these to the existing Design System (e.g., `Alert`, `EmptyState`, `Button` components).
*   **Follow-ups:** Once UX acceptance criteria are reviewed by Product and Legal, a follow-up implementation issue will be created with specific Jira/GitHub tickets linking back to this document.
