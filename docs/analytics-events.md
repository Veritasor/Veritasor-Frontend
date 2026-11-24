# Analytics Events Documentation

## Overview

This document describes the analytics events tracked in the Veritasor frontend. All analytics events are gated behind user consent (analytics category) and strip personally identifiable information (PII) before transmission.

## Event Types

### Page View
- **Event Name**: `page_view`
- **Description**: Tracked when users navigate to different pages within the application
- **Properties**:
  - `path` (string): The pathname of the current route
  - `search` (string): The query string of the current route
- **Triggered By**: `useTrackPageViews` hook in Layout component
- **Location**: Automatically tracked on all authenticated routes

### Attestation Created
- **Event Name**: `attestation_created`
- **Description**: Tracked when a user successfully creates a revenue attestation
- **Properties**:
  - `source` (string): The revenue source used (e.g., 'stripe', 'shopify', 'razorpay')
  - `period` (string): The reporting period (e.g., '2026-01')
  - `recordCount` (number): Number of records included in the attestation
- **Triggered By**: Successful completion of attestation confirmation modal
- **Locations**: 
  - Dashboard page (`src/pages/Dashboard.tsx`)
  - Attestations page (`src/pages/Attestations.tsx`)

### Source Connected
- **Event Name**: `source_connected`
- **Description**: Tracked when a user successfully connects a revenue source through the wizard
- **Properties**:
  - `provider` (string): The provider ID (e.g., 'stripe', 'shopify', 'razorpay')
  - `syncWindow` (string): The selected sync window (e.g., 'trailing-12-months', 'current-fiscal-year', 'all-history')
  - `optionalScopesCount` (number): Number of optional scopes selected
- **Triggered By**: Successful completion of ConnectSourceWizard
- **Location**: `src/pages/connect-source/ConnectSourceWizard.tsx`

### API Key Created
- **Event Name**: `api_key_created`
- **Description**: Tracked when a user successfully creates a new API key
- **Properties**:
  - `keyId` (string): The unique identifier of the created key
  - `scopes` (array): Array of permission scopes assigned to the key
- **Triggered By**: Successful completion of CreateApiKeyModal
- **Location**: `src/pages/ApiKeys.tsx`

## Consent Gating

All analytics events are gated behind the user's consent preferences:

- **Analytics Category**: Events are only sent when the user has granted analytics consent
- **Re-evaluation**: Consent status is re-evaluated on every event, so changes to preferences take effect immediately
- **No Consent**: If analytics consent is not granted, no network requests are made

## PII Protection

The analytics module automatically strips personally identifiable information (PII) from event properties:

### Stripped Fields
The following fields are automatically removed from all event properties:
- `email`
- `name`
- `firstName`
- `lastName`
- `fullName`
- `username`
- `password`
- `secret`
- `token`
- `apiKey`
- `privateKey`
- `address`
- `phone`
- `phoneNumber`
- `ssn`
- `socialSecurityNumber`
- `creditCard`
- `cardNumber`

### Nested Objects
PII filtering is applied recursively to nested objects, ensuring no PII leaks through nested property structures.

## Implementation

### Analytics Module
- **Location**: `src/analytics/index.ts`
- **Key Functions**:
  - `configureAnalytics(transport)`: Configure the analytics transport (e.g., Segment, Mixpanel)
  - `setConsentEnabled(enabled)`: Enable/disable analytics based on user consent
  - `track(eventName, properties)`: Send an analytics event
  - `useTrackPageViews()`: React hook for automatic page view tracking

### Default Transport
By default, a no-op transport is used, meaning no network requests are made until a real transport is configured.

### Integration with Cookie Consent
The analytics module integrates with the CookieConsentContext:
- Consent status is read from the context
- Events are only sent when `consent.analytics` is `true`
- Consent changes are re-evaluated on each event

## Testing

### Unit Tests
Comprehensive tests are available in `src/analytics/index.test.ts` covering:
- PII filtering for all sensitive fields
- Nested object PII removal
- Consent gating behavior
- Event type validation
- Custom transport configuration

### Running Tests
```bash
npm test -- src/analytics
```

## Future Enhancements

### Transport Providers
The pluggable transport architecture allows easy integration with:
- Segment
- Mixpanel
- Amplitude
- Google Analytics
- Custom analytics backends

### Additional Events
Potential future events to track:
- User authentication events
- Feature usage patterns
- Error tracking
- Performance metrics
- A/B test participation
