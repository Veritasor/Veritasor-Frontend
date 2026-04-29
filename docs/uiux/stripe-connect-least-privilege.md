# Stripe Connect Integration: Least Privilege Framing

## 1. Overview and Core Philosophy

This document outlines the UX and UI design requirements for the Veritasor Stripe Connect integration. Given Veritasor's trust-heavy domain (attestations, integrations, revenue signals), our overarching philosophy is **Least Privilege & Maximum Transparency**.

Users must explicitly understand:
*   **What Veritasor CAN do:** Read specific revenue signals, verify attestations, and sync relevant metadata.
*   **What Veritasor CANNOT do:** Mutate Stripe data, initiate payouts, view full customer PII beyond what is strictly necessary for attestation, or access unrelated financial products.

Our goal is to build a consent-driven flow that establishes immediate trust without overwhelming the user with technical jargon.

## 2. Research & Validation Findings

### 2.1 Mental Models: Developer vs. Operator
*   **Developers:** View Stripe integrations as API key exchanges or OAuth handshakes. They care about scope granularity (e.g., `read_only` vs `write`), webhook configurations, and error handling.
*   **Operators (Finance/Ops):** View Stripe integrations as a business agreement. They care about *risk* ("Can this app accidentally refund a customer?"). They need clear, plain-English translations of permissions.
*   **UX Implication:** The connection flow must bridge this gap. We should present high-level, human-readable permission summaries for operators, with an expandable "Technical Details/Scopes" section for developers.

### 2.2 Consent Checkpoints
Instead of a single "Connect to Stripe" button, the flow should incorporate explicit consent checkpoints:
1.  **Pre-connection Education:** A dedicated view explaining *why* Veritasor needs Stripe access before sending the user to Stripe's OAuth flow.
2.  **Scope Confirmation (Post-OAuth):** Upon returning from Stripe, a final confirmation screen summarizing the exact access granted, reinforcing the "read-only" nature of the connection.

### 2.3 Reconnect Flows
Tokens expire, scopes change, and connections break. The reconnect flow must be as seamless as the initial connection.
*   **Proactive Notification:** In-app banners and email alerts when a connection is nearing expiration or requires re-authentication due to scope upgrades.
*   **Contextual Reconnection:** If an attestation fails due to a broken Stripe connection, the error state should provide a direct path to the reconnect flow, rather than making the user hunt for settings.

## 3. Component-Agnostic Specifications

The following guidelines apply to all components built for this integration, regardless of the underlying framework (React, etc.).

### 3.1 Edge States
*   **Empty State:** When Stripe is not connected, the empty state must sell the *value* of the connection (e.g., "Automate revenue attestations by connecting Stripe") rather than just showing a generic "No data" message.
*   **Loading State:** Provide optimistic UI or skeleton loaders during the OAuth handshake and initial data sync. Use reassuring microcopy (e.g., "Securely establishing connection...").
*   **Permission Denied:** If the user rejects the OAuth prompt, gracefully return them to Veritasor with a non-punitive message explaining what functionality is limited without the connection and offering a way to retry.
*   **Partial Data:** If Veritasor can only sync a portion of the data (e.g., due to Stripe API limits or missing scopes), surface a persistent warning indicator on affected dashboards, detailing what is missing and how to resolve it.

### 3.2 Guidelines & Accessibility
*   **WCAG 2.2 AA Baseline:** All interfaces must meet WCAG 2.2 AA standards.
*   **Contrast:** Ensure sufficient contrast ratios for all text, especially secondary informational text explaining permissions.
*   **Focus Order:** The OAuth flow and consent checkboxes must have a logical, keyboard-navigable focus order.
*   **Motion:** Use subtle motion for loading states, but respect `prefers-reduced-motion` queries. Avoid flashy animations that detract from the serious nature of the consent process.

## 4. Success Metrics

To validate the effectiveness of this design, we will track the following UX outcomes:

*   **Task Completion Rate:** Percentage of users who successfully complete the Stripe connection flow after initiating it (Target: >85%).
*   **Time-on-Task:** Average time spent on the pre-connection education screen (to ensure it's being read, not blindly skipped) and the overall connection flow.
*   **Error Recovery Rate:** Percentage of users who successfully reconnect Stripe after encountering a "broken connection" state.
*   **Support Ticket Deflection:** Monitor support channels for questions related to "What does Veritasor do with my Stripe data?" A decrease indicates successful in-app messaging.
