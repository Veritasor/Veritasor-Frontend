# Density Preference Persistence — API Contract

## Overview

The density preference (Comfortable / Compact) should persist per user across sessions and devices. This document describes the frontend contract for the server-side API endpoint that stores and retrieves the user's density preference.

## Current Implementation

- **Hook:** `src/hooks/useDensityMode.ts`
- **Component:** `src/components/DensityToggle.tsx`
- **Storage:** `localStorage` keyed by `veritasor_density_{workspace}`
- **Settings panel:** `Appearance` tab in `src/pages/Settings.tsx`

## Proposed API Endpoint

### `GET /v1/preferences/density`

Returns the user's density preference for a given workspace.

**Query Parameters:**

| Parameter   | Type   | Required | Description                      |
|-------------|--------|----------|----------------------------------|
| `workspace` | string | Yes      | The workspace slug / identifier  |

**Response `200 OK`:**

```json
{
  "density": "comfortable" | "compact"
}
```

**Response `401 Unauthorized`:** Returned when the request lacks valid authentication.

**Response `404 Not Found`:** Returned when the workspace does not exist or the user is not a member.

---

### `PUT /v1/preferences/density`

Updates the user's density preference for a given workspace.

**Request Body:**

```json
{
  "workspace": "string",
  "density": "comfortable" | "compact"
}
```

**Response `200 OK`:**

```json
{
  "density": "comfortable" | "compact",
  "updatedAt": "2026-07-28T12:00:00Z"
}
```

**Response `400 Bad Request`:** Returned when `density` is not one of the valid values.

**Response `401 Unauthorized`:** Returned when the request lacks valid authentication.

**Response `404 Not Found`:** Returned when the workspace does not exist or the user is not a member.

## Frontend Integration Strategy

### Optimistic Update

The frontend should update the UI **immediately** before the API call completes:

1. User selects a density mode
2. Frontend immediately:
   - Updates `localStorage`
   - Updates React state
   - Applies `data-density` attribute to `<html>`
3. Frontend fires `PUT /v1/preferences/density`
4. **On success:** No additional UI change needed (already applied optimistically)
5. **On failure:**
   - Revert the density to the previous value
   - Show a warning toast: "Could not save density preference. Changes reverted."

### Toast Integration

For rollback on failure, use the existing toast system in `src/components/ToastContext.tsx`:

```tsx
import { useToast } from '../components/ToastContext'

const { addToast } = useToast()

function handleSaveError() {
  addToast(
    'Could not save density preference. Changes reverted.',
    'warning',
    6000, // duration
    undefined, // no undo
    undefined,
    undefined, // no group
  )
}
```

## TypeScript Types

```typescript
export type DensityMode = 'comfortable' | 'compact'

export interface DensityPreferenceResponse {
  density: DensityMode
}

export interface DensityPreferenceUpdateRequest {
  workspace: string
  density: DensityMode
}

export interface DensityPreferenceUpdateResponse {
  density: DensityMode
  updatedAt: string
}
```

## Implementation Checklist

- [ ] Add API client functions in `src/utils/api.ts` (or similar)
- [ ] Update `useDensityMode` hook to accept an optional API client
- [ ] Implement optimistic update with rollback
- [ ] Add toast notification on failure
- [ ] Wire up the Settings > Appearance panel toggle
- [ ] Add unit tests for optimistic update logic
- [ ] Add integration tests for the API contract
