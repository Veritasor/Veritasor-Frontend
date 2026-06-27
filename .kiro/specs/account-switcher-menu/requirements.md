# Requirements Document

## Introduction

This document specifies requirements for the **Account Switcher Menu** — a workspace-context control embedded in the Veritasor top app bar. The component allows authenticated users who belong to multiple workspaces to identify their active workspace at a glance and switch between workspaces with minimal friction. It replaces the existing plain-text workspace listbox in `TopAppBar.tsx` with a richer, fully accessible menu that includes workspace metadata, an inline search filter for long lists, a keyboard shortcut, responsive mobile layout, and WCAG 2.1 AA compliance.

The component is a **pure controlled component** built with vanilla CSS and React 18. It reuses existing design system tokens and primitives (menu disclosure pattern, avatar/initials, search input, typography scale) from `src/index.css` and `src/components/TopAppBar.tsx`. No new third-party UI dependencies are introduced.

---

## Glossary

- **Switcher**: The `AccountSwitcherMenu` component — the trigger button plus the dropdown panel.
- **Trigger**: The `<button>` in the top app bar that opens the Switcher panel.
- **Panel**: The dropdown overlay rendered below the Trigger when the Switcher is open.
- **Workspace_Row**: A single selectable item inside the Panel representing one workspace.
- **Active_Workspace**: The workspace currently in use, identified by `activeWorkspaceId` prop.
- **Search_Input**: The text field inside the Panel used to filter Workspace_Rows.
- **Search_Threshold**: The configurable minimum number of workspaces that causes the Search_Input to appear (default: 5).
- **Bottom_Sheet**: The mobile-optimised full-width drawer that replaces the Panel at viewport widths ≤ 768 px.
- **Workspace**: A typed object `{ id: string; name: string; avatarUrl?: string; plan: string; role: string; memberCount: number }` describing a workspace.
- **Initials_Fallback**: Two-character uppercase initials derived from the workspace name, shown when `avatarUrl` is absent or fails to load.
- **Live_Region**: An `aria-live="polite"` container used to announce dynamic state changes to screen readers.
- **Focus_Trap**: Keyboard focus confined to the open Panel or Bottom_Sheet until it is dismissed.

---

## Requirements

### Requirement 1: Trigger Rendering and Active Workspace Identity

**User Story:** As an authenticated user, I want the top app bar to always show which workspace I am currently in, so that I never mistake my active context before performing an action.

#### Acceptance Criteria

1. THE Trigger SHALL display the Active_Workspace's avatar image (or Initials_Fallback when `avatarUrl` is absent or fails to load), workspace name, and a chevron indicator in a single inline control.
2. THE Trigger SHALL truncate workspace names longer than 160 px with CSS `text-overflow: ellipsis` and expose the full name via `aria-label`.
3. WHEN the Panel is closed, THE Trigger SHALL show a downward-pointing chevron (▼) indicating that the control can be expanded.
4. WHEN the Panel is open, THE Trigger SHALL show an upward-pointing chevron (▲) indicating that the control is expanded.
5. THE Trigger SHALL have `aria-haspopup="menu"`, `aria-expanded` reflecting the current open/closed state, and `aria-label` of the form `"Current workspace: {name}. Switch workspace"`.
6. THE Trigger SHALL meet a minimum touch target size of 44 × 44 px on all viewports.
7. WHERE exactly one Workspace exists in the supplied list, THE Trigger SHALL render without a chevron and SHALL NOT be interactive (no `onClick`, `tabIndex={0}`, or keyboard handlers active), preventing users from opening an empty Panel.

---

### Requirement 2: Panel Content and Workspace Selection

**User Story:** As an authenticated user, I want to see all my workspaces with enough context to distinguish them, so that I can switch to the correct one confidently.

#### Acceptance Criteria

1. WHEN the Panel is open, THE Panel SHALL render one Workspace_Row per workspace in the supplied list.
2. THE Workspace_Row SHALL display the workspace avatar image (or Initials_Fallback), workspace name, plan tier, role, and member count on a single row.
3. THE Active_Workspace row SHALL be visually marked with the `--accent` colour token and SHALL carry `aria-checked="true"`; all other rows SHALL carry `aria-checked="false"`.
4. THE Panel SHALL use `role="menu"` and each Workspace_Row SHALL use `role="menuitemradio"` and belong to a single `aria-label`-ed group so that screen readers announce the radio-group semantic.
5. WHEN a user activates a Workspace_Row (via click, Enter, or Space), THE Switcher SHALL invoke the `onWorkspaceChange(id: string)` callback with the selected workspace's `id`, close the Panel, and return keyboard focus to the Trigger.
6. WHEN a workspace name is longer than the available row width, THE Workspace_Row SHALL truncate the name with `text-overflow: ellipsis` and provide the full name via `aria-label` on the row element.
7. IF an `avatarUrl` is provided but fails to load, THEN THE Workspace_Row SHALL display the Initials_Fallback without layout shift.

---

### Requirement 3: Panel Open / Close and Focus Management

**User Story:** As a keyboard and screen reader user, I want the switcher to open, navigate, and close predictably, so that I can switch workspaces without reaching for a mouse.

#### Acceptance Criteria

1. WHEN the Trigger is clicked or receives `Enter` or `Space` while the Panel is closed, THE Switcher SHALL open the Panel and move keyboard focus to the first Workspace_Row (or to the Search_Input when the Search_Input is visible).
2. WHEN the `Escape` key is pressed while the Panel is open, THE Switcher SHALL close the Panel and return keyboard focus to the Trigger.
3. WHEN a pointer-down event occurs on any element outside the Panel and the Trigger while the Panel is open, THE Switcher SHALL close the Panel.
4. WHILE the Panel is open, THE Switcher SHALL confine keyboard focus (Focus_Trap) so that `Tab` and `Shift+Tab` cycle only between the Search_Input (when visible) and the Workspace_Rows, preventing focus from escaping to background content.
5. THE Live_Region SHALL announce `"Switched to {name}"` via `aria-live="polite"` immediately after a workspace switch completes.
6. THE Live_Region element SHALL exist in the DOM at all times (not conditionally rendered), containing an empty string when no announcement is pending.

---

### Requirement 4: Keyboard Navigation Within the Panel

**User Story:** As a keyboard user, I want to navigate the workspace list with arrow keys and jump to the first or last item instantly, so that large lists are efficient to traverse.

#### Acceptance Criteria

1. WHEN the Panel is open and focus is on a Workspace_Row, THE Switcher SHALL move focus to the next Workspace_Row on `ArrowDown`, wrapping from the last row to the first.
2. WHEN the Panel is open and focus is on a Workspace_Row, THE Switcher SHALL move focus to the previous Workspace_Row on `ArrowUp`, wrapping from the first row to the last.
3. WHEN the Panel is open and focus is on any element within the Panel, THE Switcher SHALL move focus to the first Workspace_Row on `Home`.
4. WHEN the Panel is open and focus is on any element within the Panel, THE Switcher SHALL move focus to the last Workspace_Row on `End`.
5. WHEN the Search_Input is visible and focus is on the Search_Input, THE Switcher SHALL move focus to the first visible (non-filtered-out) Workspace_Row on `ArrowDown`.
6. WHEN the Search_Input is visible and focus is on the first Workspace_Row, THE Switcher SHALL move focus back to the Search_Input on `ArrowUp`.

---

### Requirement 5: Inline Search Filter

**User Story:** As a user belonging to many workspaces, I want to type a few characters to narrow the list, so that I can find and switch to the right workspace without scrolling through dozens of rows.

#### Acceptance Criteria

1. WHERE the workspace list contains more items than the `searchThreshold` prop (default: 5), THE Panel SHALL render the Search_Input above the workspace list.
2. WHEN the user types in the Search_Input, THE Panel SHALL filter Workspace_Rows in real time to show only rows whose workspace name contains the query string (case-insensitive).
3. IF the search query matches no workspace names, THEN THE Panel SHALL display an empty-state message reading `"No workspaces match "{query}""` and hide all Workspace_Rows.
4. THE empty-state message element SHALL carry `aria-live="polite"` so screen readers announce when results appear or disappear.
5. WHEN the Panel opens and the Search_Input is visible, THE Search_Input SHALL receive keyboard focus automatically.
6. WHEN the Panel closes (by any mechanism), THE Search_Input SHALL be reset to an empty string so the next opening shows the full list.
7. THE Search_Input SHALL have `aria-label="Search workspaces"` and `aria-controls` pointing to the `id` of the workspace list container.

---

### Requirement 6: Keyboard Shortcut to Open Switcher in Search Mode

**User Story:** As a power user, I want a keyboard shortcut that jumps straight into the switcher's search field, so that I can switch workspaces without any mouse or tab navigation.

#### Acceptance Criteria

1. WHEN the user presses `Ctrl+Shift+W` (Windows / Linux) or `Cmd+Shift+W` (macOS) and the Panel is closed, THE Switcher SHALL open the Panel and focus the Search_Input (creating the Search_Input if the workspace count is below the Search_Threshold for this activation mode).
2. THE Trigger SHALL display the shortcut hint `Ctrl+Shift+W` (or `⌘⇧W` on macOS) as a `<kbd>` element visible on hover and focus.
3. THE shortcut `Ctrl+Shift+W` SHALL NOT conflict with any default browser or OS shortcut in the supported environments (Chrome, Firefox, Safari on Windows, macOS, Linux).
4. IF the Panel is already open when the shortcut is pressed, THEN THE Switcher SHALL move focus directly to the Search_Input without closing and reopening the Panel.

---

### Requirement 7: Responsive Layout — Desktop Dropdown and Mobile Bottom Sheet

**User Story:** As a user on any device, I want the switcher to feel native to my screen size, so that I can switch workspaces comfortably whether I am on a desktop or a mobile phone.

#### Acceptance Criteria

1. WHILE the viewport width is greater than 768 px, THE Panel SHALL render as a positioned dropdown anchored below the Trigger with `min-width: 18rem`.
2. WHILE the viewport width is 768 px or less, THE Panel SHALL render as a Bottom_Sheet: a full-width drawer that slides up from the bottom of the viewport with a drag handle and a semi-transparent backdrop.
3. THE Bottom_Sheet SHALL have a maximum height of 85 vh and SHALL be internally scrollable when the workspace list overflows.
4. THE Bottom_Sheet backdrop SHALL close the Bottom_Sheet on pointer-down, identical to the desktop close-on-outside-click behaviour.
5. WHILE the Bottom_Sheet is open, THE Switcher SHALL trap focus within the Bottom_Sheet.
6. THE Workspace_Row touch targets SHALL meet a minimum size of 44 × 44 px on all viewports.
7. WHILE the layout direction is right-to-left (`dir="rtl"` on `<html>`), THE Panel SHALL mirror its alignment (open to the left of the Trigger, chevron on the left, avatar on the right of the row) using logical CSS properties.

---

### Requirement 8: Virtualized Rendering for Large Workspace Lists

**User Story:** As an administrator who belongs to dozens of workspaces, I want the menu to remain fast and responsive regardless of list size, so that my browser does not slow down when I open the switcher.

#### Acceptance Criteria

1. WHEN the workspace list contains more than 50 items, THE Panel SHALL render Workspace_Rows using a virtual window that mounts only the rows visible within the Panel's scroll area, plus a configurable overscan buffer (default: 3 rows above and below the visible range).
2. WHEN the workspace list contains 50 or fewer items, THE Panel SHALL render all rows directly without virtualization overhead.
3. WHEN the user scrolls within the Panel or the search filter changes the result set, THE Panel SHALL update the rendered rows within one animation frame (≤ 16 ms).
4. THE Active_Workspace row SHALL always be scrolled into view when the Panel opens, regardless of its position in the list.

---

### Requirement 9: Accessibility — WCAG 2.1 AA Compliance

**User Story:** As a user who relies on assistive technology, I want the account switcher to be fully operable with a screen reader and keyboard alone, so that I can switch workspaces with the same efficiency as a mouse user.

#### Acceptance Criteria

1. THE Switcher SHALL pass an automated axe-core audit with zero violations.
2. THE Panel SHALL use `role="menu"` and each Workspace_Row SHALL use `role="menuitemradio"`.
3. THE Active_Workspace Workspace_Row SHALL have `aria-checked="true"`; all other Workspace_Rows SHALL have `aria-checked="false"`.
4. THE Trigger SHALL have `aria-haspopup="menu"` and `aria-expanded` set to `"true"` when the Panel is open and `"false"` when it is closed.
5. THE Switcher SHALL implement the complete keyboard navigation pattern defined in Requirement 4.
6. THE Switcher SHALL implement the Focus_Trap defined in Requirement 3, Criterion 4.
7. WHEN the Panel opens or closes, THE change in `aria-expanded` state SHALL be detectable by screen readers via the live DOM attribute (no delay or debounce that could suppress the announcement).
8. THE Search_Input, Workspace_Row, and empty-state message SHALL each have accessible names (via `aria-label` or associated `<label>`) that do not rely on visual position alone.
9. THE Switcher SHALL support the `prefers-reduced-motion` media query: WHEN `prefers-reduced-motion: reduce` is set, THE Switcher SHALL disable all CSS transitions and animations on the Panel and Bottom_Sheet.

---

### Requirement 10: TypeScript Types and Prop API

**User Story:** As a frontend developer integrating the account switcher, I want a well-typed, documented prop API, so that I can configure the component without reading its internals.

#### Acceptance Criteria

1. THE Switcher SHALL export a `Workspace` type: `{ id: string; name: string; avatarUrl?: string; plan: string; role: string; memberCount: number }`.
2. THE Switcher SHALL accept the following props with the specified types and defaults:

   | Prop | Type | Default | Description |
   |---|---|---|---|
   | `workspaces` | `Workspace[]` | required | Ordered list of workspaces to display |
   | `activeWorkspaceId` | `string` | required | `id` of the currently active workspace |
   | `onWorkspaceChange` | `(id: string) => void` | required | Called when the user selects a workspace |
   | `searchThreshold` | `number` | `5` | Min workspace count to show Search_Input |
   | `className` | `string` | `""` | Extra CSS class on the root wrapper |
   | `aria-label` | `string` | `"Switch workspace"` | Accessible label override for the Trigger |

3. THE Switcher SHALL compile without errors under TypeScript strict mode (`"strict": true`).
4. THE Switcher SHALL be a pure controlled component: it SHALL NOT maintain `activeWorkspaceId` in internal state; all state is driven by props and callbacks.

---

### Requirement 11: Test Coverage

**User Story:** As a developer maintaining the account switcher, I want comprehensive automated tests, so that I can refactor or extend the component with confidence.

#### Acceptance Criteria

1. THE test suite SHALL achieve at least 95% branch coverage on the `AccountSwitcherMenu` component as measured by Vitest's V8 coverage reporter.
2. THE test suite SHALL include tests for all Panel states: closed, open with full list, open with filtered list, open with no search results (empty state), and open with a single workspace.
3. THE test suite SHALL include tests for every keyboard interaction defined in Requirements 3 and 4: `ArrowDown`, `ArrowUp`, `Home`, `End`, `Enter`, `Space`, `Escape`, `Tab` (focus trap), and the `Ctrl+Shift+W` shortcut.
4. THE test suite SHALL include tests verifying `aria-expanded`, `aria-checked`, `aria-label`, `aria-live` announcements, and Focus_Trap behaviour using `@testing-library/react` with `jest-dom` matchers.
5. THE test suite SHALL include a test that renders the component with a right-to-left `dir="rtl"` attribute and asserts that the Panel aligns to the correct side.
6. THE test suite SHALL include a test that renders the component at a 375 px viewport width and asserts that the Bottom_Sheet is used instead of the dropdown.
7. THE test suite SHALL include tests for edge cases: a list of exactly one workspace (non-interactive trigger), a list of exactly 50 workspaces (no virtualization), a list of 51 workspaces (virtualization active), a workspace with no `avatarUrl` (Initials_Fallback rendered), and a workspace name exceeding 160 px (truncation applied).

---

### Requirement 12: Documentation

**User Story:** As a developer onboarding to the project, I want complete usage documentation for the account switcher, so that I can integrate and extend the component correctly on my first read.

#### Acceptance Criteria

1. THE component source file SHALL contain inline JSDoc comments on the exported `Workspace` type, the `AccountSwitcherMenuProps` interface, and every non-trivial internal function.
2. THE component source file SHALL include a file-level comment block listing: component purpose, keyboard shortcut table, accessibility notes (ARIA pattern used), and a minimal usage example.
3. THE project SHALL include a documentation file at `docs/uiux/account-switcher-menu.md` containing: a full prop API table, keyboard shortcut documentation, a code usage example, and an accessibility audit checklist specific to this component.
4. THE keyboard shortcut documentation SHALL specify the exact key combination, the triggering condition, and the expected outcome in plain language accessible to non-developer stakeholders.
