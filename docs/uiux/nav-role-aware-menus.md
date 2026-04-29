# Role-Aware Navigation Models

## Overview
This document defines the navigation models for Veritasor's product experience, specifically addressing privilege confusion for mixed-role organizations by establishing clear boundaries between Operator and Business User personas.

## Navigation Models

To reduce privilege confusion and ensure users only access tools relevant to their roles, we propose a **Contextual Segmentation Model**:

1. **Role-Based Primary Navigation:**
   - **Business Users:** The primary navigation highlights high-level dashboards, reporting, integrations, and revenue signals.
   - **Operators:** The primary navigation surfaces operational tools, technical settings, attestations, and system logs.
2. **Strict Context Switching (for Mixed Roles):**
   - For users holding both roles (e.g., Organization Admins), provide an explicit "Workspace Switcher" in the global header, rather than blending operator and business menus. This creates clear mental boundaries between "analyzing business metrics" and "configuring system operations."
3. **Progressive Disclosure:**
   - Hide complex operator settings from business users to reduce cognitive load and prevent accidental configuration changes.

## Success Metrics
To validate the effectiveness of these navigation models, we will measure:
- **Task Completion Rate:** Percentage of users successfully navigating to their intended destination without accessing incorrect tabs.
- **Time-on-Task:** Reduction in time spent locating specific settings or reports compared to the previous unified menu.
- **Error Recovery:** Frequency of "permission denied" encounters and the success rate of navigating back to safe paths.

## Edge States

Handling edge states is critical for maintaining trust in the Veritasor platform:

- **Empty States:** When a user lacks data for a specific module (e.g., no attestations generated), provide clear, actionable empty states with links to documentation or "Getting Started" guides relevant to their role.
- **Loading States:** Use skeleton screens that match the expected layout of the user's role-specific dashboard to maintain spatial awareness during data retrieval.
- **Permission Denied:** Instead of a generic 403 page, explain *why* access is restricted (e.g., "This area requires Operator privileges") and provide a clear "Return to Dashboard" action. Avoid showing navigation items in the menu that the user will inevitably be denied access to.
- **Partial Data:** When a business user has limited visibility into an operator-owned integration, clearly indicate the data constraints with inline badges (e.g., "View-Only" or "Partial Access").

## Research & Validation Findings

A short heuristic evaluation was conducted to identify existing friction points:

1. **Hidden Admin Surfaces:** Admin and operator settings were previously buried under generic "Settings" tabs, making them hard to discover for operators, yet confusingly visible to business users who lacked context.
2. **Discoverability:** The lack of clear visual distinction between business reporting and system attestations led to high cognitive load during cross-functional tasks.
3. **Mobile Nav Constraints:** The deep hierarchy of operator tools does not translate well to mobile viewports. **Recommendation:** Collapse operator tools into a single "Operations Hub" menu item on mobile, prioritizing business dashboards for on-the-go access.

## Accessibility Guidelines
All proposed patterns must adhere to WCAG 2.2 AA baseline standards:
- **Contrast:** Ensure all navigation links and active states meet a minimum contrast ratio of 4.5:1.
- **Focus Order:** Maintain logical keyboard focus flow (left-to-right, top-to-bottom). Implement a "Skip to Content" link bypassing the global navigation.
- **Motion:** Ensure any dropdown or accordion animations respect the `prefers-reduced-motion` media query.
