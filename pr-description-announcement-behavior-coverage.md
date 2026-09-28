# Summary

Adds focused behavior coverage for `Announcement` and `AnnouncementBanner`, and fixes the dismissal storage key so dismissal state is scoped to the intended user.

## Coverage

- Renders announcement title, message, accessible status, and a secure learn-more link.
- Omits the optional link when no URL is supplied.
- Dismisses announcements and persists the dismissal across remounts.
- Keeps dismissal state isolated by user.
- Returns no markup for an empty announcement list.
- Recovers deterministically from malformed stored JSON.
- Continues rendering and dismissing when localStorage reads or writes throw.

## Validation

| Check | Result |
|---|---|
| AnnouncementBanner test suite and surrounding tests | Not run, as requested |
| Focused ESLint on changed files | Passed |
| Repository-wide lint | Blocked by 66 existing errors and 22 warnings in other files |
| `npm run build` | Blocked by a TypeScript parse error in `src/i18n/messages/en.json` at line 40 |
| Editor diagnostics | No errors reported in the changed TypeScript files |
