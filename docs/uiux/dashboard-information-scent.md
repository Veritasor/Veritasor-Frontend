# UI/UX Design & Research: Dashboard Information Scent (Revenue vs. Attestations)

## Scope
This document outlines the UX research, information architecture, and accessibility baselines for the Veritasor Dashboard home. The goal is to define a dashboard hierarchy that establishes clear "information scent"—helping businesses instantly understand "what needs action now" regarding both their revenue signals and active attestations.

---

## 1. Information Architecture & Hierarchy

To establish a strong information scent, the dashboard is structurally divided into three priority tiers, evaluated continuously.

### Tier 1: "Action Required" (High Priority)
*   **Purpose**: Immediate blockers, urgent attestations, or broken integrations.
*   **Location**: Visually prominent, above the fold, persistent until resolved.
*   **Content Examples**: 
    *   "Action Required: Renew your Q3 attestation by [Date]."
    *   "Sync Error: Your Stripe integration requires re-authentication."
*   **UI Treatment**: Alert banners or high-contrast notification cards.

### Tier 2: "Executive Summary" (Revenue & Attestations Overview)
*   **Purpose**: The glanceable "health check" of the business based on connected data.
*   **Location**: Immediately below any actionable alerts.
*   **Content Examples**:
    *   Total Verified Revenue (YTD)
    *   Active vs. Pending Attestations
    *   Recent Bond Eligibility Status
*   **UI Treatment**: KPI summary cards with logical grouping. No complex charts here; prioritize clear typography and status indicators.

### Tier 3: "Recent Activity & Deep Dives" (Exploratory Data)
*   **Purpose**: Detailed logs, historical data, and secondary actions.
*   **Location**: Below the fold or via tabbed navigation.
*   **Content Examples**: 
    *   Chronological feed of sync events.
    *   Historical attestation log.
*   **UI Treatment**: Data tables or list views.

---

## 2. Research & Validation Findings

### Empty States (Day 0 Experience)
*   **Finding**: Users facing a blank dashboard without integrations experience a "cold start" problem resulting in high drop-off.
*   **Mitigation**: The empty state must serve as an onboarding checklist. Instead of "No data," use progressive disclosure:
    1. Connect Revenue Source -> 2. Generate First Attestation -> 3. View Eligibility.

### Partial Integrations
*   **Finding**: Businesses often connect one revenue source (e.g., Stripe) but delay connecting others (e.g., Plaid/Bank). This causes skewed data visibility.
*   **Mitigation**: The UI must clearly articulate that the Executive Summary is *incomplete*. Use inline messaging adjacent to KPI cards (e.g., "Showing partial revenue based on 1 of 3 integrated sources"). 

### High-Volume Periods
*   **Finding**: During reporting periods (e.g., EOFY), the volume of required attestations can overwhelm the user, degrading the information scent.
*   **Mitigation**: Implement batching UI components. Group similar attestations into a single actionable card (e.g., "3 Attestations require review") rather than cluttering Tier 1 with individual alerts.

---

## 3. Success Metrics

To validate the proposed dashboard information scent:

*   **Task Completion Rate:** > 90% accuracy in correctly identifying the most urgent action required upon first page load.
*   **Time-to-Action:** Reduce the time it takes an actively engaged user to click on an "Action Required" item from the dashboard (Target: < 5 seconds).
*   **Error Recovery Rate:** High completion rate for re-authenticating broken integrations via Tier 1 alerts.
*   **Information Retrieval Time:** The user can locate their "Total Verified Revenue" within < 3 seconds of page load.

---

## 4. Edge States & Error Handling

### Empty State (Full System)
*   **Copy:** "Your dashboard is ready. Connect a data source to begin evaluating revenue and attestations."
*   **Visual:** Prominent CTA to "Connect Integration." Remove Tier 2 and Tier 3 placeholders to avoid visual noise.

### Loading State
*   **Copy:** "Aggregating revenue and attestation data..."
*   **Visual:** Use staggered skeleton loaders. Load Tier 1 (Alerts) first, followed by Tier 2 (KPIs), then Tier 3 (Tables) to establish progressive rendering.

### Permission Denied (Auth/Integration Error)
*   **Copy:** "Access restricted. You do not have permissions to view certain dashboard modules."
*   **Visual:** Display a locked state on the specific KPI or table. Maintain visibility of the modules the user *does* have access to.

### Partial Data State (Syncing/Failing)
*   **Copy:** "Some data may be outdated. 1 integration failed to sync [Time ago]."
*   **Visual:** Amber warning icon on the specific KPI card, alongside a subtle "Retry Sync" tertiary action.

---

## 5. Accessibility Baseline (WCAG 2.2 AA)

*   **Contrast Ratios:** Tier 1 "Action Required" banners must maintain a 4.5:1 ratio, even when utilizing semantic color codes (e.g., red for errors, amber for warnings).
*   **Focus Order & Visible Focus:** Focus must land logically: Header -> Tier 1 Alerts -> Tier 2 KPIs -> Tier 3 Tables. Visible focus indicators (minimum 2px) are required for all interactive elements.
*   **Motion & Animation:** Ensure skeleton loaders utilize a slow, subtle pulse rather than rapid flashing. Provide a visual pause button if animations cannot be disabled via OS settings.
*   **Screen Readers (Semantic HTML):** 
    *   Tier 1 Alerts must be wrapped in `role="alert"` or `aria-live="assertive"`.
    *   KPI cards must utilize clear Heading (`<h2>` / `<h3>`) structures to allow easy skipping.

---

## 6. Implementation Notes for Engineering
*   **Component Agnostic:** Utilize existing Design System containers (`Card`, `Banner/Alert`, `Table`). Focus on layout hierarchy and spacing variables.
*   **Data Fetching:** The dashboard should prioritize fetching Tier 1 alerts instantly. Heavy Tier 3 data tables should be lazily loaded or paginated.
*   **Follow-ups:** Once approved, engineering tasks will be segmented by Dashboard Tiers (e.g., "Implement Tier 1 Action Banner Component").
