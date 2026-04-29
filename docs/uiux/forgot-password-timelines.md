# Forgot Password Recovery Timelines and UX Guidelines

## Overview

This document outlines UX guidelines for the forgot password recovery flow in the Veritasor Frontend, focusing on email delay expectations, resend limits, and support paths. Critically, all interactions must avoid revealing account existence to prevent enumeration attacks, maintaining security in the trust-heavy attestation domain.

The design prioritizes user anxiety reduction, accessibility (WCAG 2.2 AA), and clear communication of timelines without compromising trust.

## Research and Validation

### Email Delay Expectations
- **User Expectations**: Users anticipate near-instant email delivery but are aware of delays (spam filters, network issues).
- **Guidance**: Provide clear messaging about potential delays (e.g., "Check your spam folder if not received in 5 minutes").
- **Validation**: Test with simulated delays; monitor user feedback on perceived wait times.

### Resend Limits
- **Limits**: Allow 3-5 resend attempts per session to prevent abuse, with a 1-2 minute cooldown between attempts.
- **Brute-Force Anxiety Reduction**: Use progressive delays (e.g., 30s, 1m, 2m) and clear countdown timers to reduce user frustration.
- **Validation**: Ensure limits align with security policies; test for accessibility of timers.

### Support Paths
- **Contact Options**: Provide links to support chat/email without requiring account details.
- **Anonymity**: Support paths should not reveal account status; use generic help resources.
- **Guidance**: Include FAQs on common issues (spam, delays) to reduce support load.

### Account Existence Concealment
- **Security Principle**: Always display a success message ("If an account exists, a reset link has been sent") regardless of email validity.
- **UX Balance**: Avoid confusion by pairing with clear next steps (e.g., "Check your email and follow the link").

## General UX Guidelines

- **Messaging Tone**: Reassuring and informative; emphasize security and trust.
- **Accessibility**: Use ARIA live regions for dynamic updates (e.g., timer countdowns); ensure high contrast for timers and buttons.
- **Component-Agnostic Specs**: Define states, content, and interactions independently of implementation.

## Component-Specific Rules

### Forgot Password Form
- **States**:
  - **Initial**: Email input field with clear label; submit button.
  - **Submitting**: Loading spinner; disable form to prevent multiple submissions.
  - **Success**: Generic success message; hide form; show resend option after cooldown.
  - **Error**: Network errors only (e.g., "Unable to send email. Try again."); never indicate invalid email.
- **Content**: Placeholder text like "Enter your email address"; avoid hints about validity.
- **Interactions**: Submit on Enter; focus management for screen readers.

### Resend Functionality
- **Button States**:
  - **Enabled**: "Resend Reset Link" after initial send.
  - **Disabled**: During cooldown with countdown timer (e.g., "Resend in 2:00").
  - **Limit Reached**: Hide button; show "Contact Support" link.
- **Timer Accessibility**: Announce countdown via screen reader; use `aria-live` for updates.
- **Visual Design**: Countdown in large, readable font; progress bar optional for visual users.

### Support Integration
- **Placement**: Below success message or on error states.
- **Links**: "Need Help?" linking to support portal or FAQ.
- **Content**: Generic resources; avoid account-specific queries.

## Timelines and Expectations

- **Email Delivery**: Inform users of expected 1-5 minute delivery; suggest spam checks.
- **Reset Link Validity**: 24 hours; communicate expiration clearly.
- **Session Limits**: Reset resend count after 24 hours or successful reset.

## Validation Criteria

- **Usability Testing**: Simulate delays and limits; measure anxiety via user feedback.
- **Accessibility Audit**: Ensure timers are perceivable and operable for all users.
- **Security Review**: Confirm no information leakage about account existence.

## Success Metrics

- **Task Completion**: 90%+ users receive and use reset links within 24 hours.
- **Error Recovery**: <5% abandon rate due to delays or limits.
- **Time-on-Task**: Average recovery time <10 minutes; reduce brute-force attempts by 50%.
- **User Satisfaction**: High scores on clarity of timelines and support access.

## Edge States Handling

- **Empty/Invalid Input**: Show validation error ("Please enter a valid email"); do not check existence.
- **Loading**: Spinner with "Sending reset link..." message.
- **Permission Denied**: N/A (no auth required).
- **Partial Data**: N/A.
- **Network Errors**: Retry button; suggest checking connection.
- **Email Failures**: Generic "Unable to send. Contact support." without specifics.

## Implementation Notes

- **Engineering Coordination**: Discuss timer implementation (client-side vs. server-side) for accuracy.
- **Future Updates**: Monitor metrics post-implementation; adjust limits based on abuse patterns.
- **Localization**: Ensure messages support growth without layout breaks (per localization constraints doc).

This document provides a foundation for secure, accessible forgot password UX. Coordinate with security and engineering teams for feasibility.