import { useState } from "react";
import AuthShell from "../components/AuthShell";
import TermsOfServiceChangelogModal from "../components/TermsOfServiceChangelogModal";

const highlights = [
  "Clear field grouping keeps legal, team, and security details easy to scan",
  "Password requirements are visible before submission to reduce recovery loops",
  "Responsive spacing keeps the full flow usable without horizontal scrolling",
];

const CURRENT_TOS_VERSION = "v2.4.0";
const PREVIOUS_TOS_VERSION = "v2.3.0";
const TOS_EFFECTIVE_DATE = "2026-07-29";
const TOS_SUMMARY =
  "We updated the Terms of Service to make version history explicit, surface the most relevant policy diffs, and make it easier to review the full agreement before continuing.";

const TOS_CHANGES = [
  {
    kind: "Added" as const,
    title: "Versioned changelog and comparison view",
    detail:
      "Every update now includes a release label plus a human-readable diff summary so legal and compliance reviewers can spot policy changes faster.",
  },
  {
    kind: "Updated" as const,
    title: "Data retention and export language",
    detail:
      "Retention timing now states how long profile, audit, and support records are kept before deletion or anonymization.",
  },
  {
    kind: "Removed" as const,
    title: "Ambiguous third-party sharing wording",
    detail:
      "The policy no longer uses broad phrasing around sharing and instead names the operational disclosures that actually apply.",
  },
];

export default function Signup() {
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [acknowledgedVersion, setAcknowledgedVersion] = useState<string | null>(null);

  const hasAcknowledgedCurrentTerms = acknowledgedVersion === CURRENT_TOS_VERSION;

  return (
    <AuthShell
      eyebrow="Create account"
      title="Set up your workspace"
      description="Create a secure Veritasor account for your finance or compliance team in just a few guided steps."
      footerPrompt="Already have access?"
      footerLinkLabel="Sign in"
      footerLinkHref="/login"
      sideTitle="Fast onboarding without visual guesswork"
      sideDescription="Typography, spacing, and button hierarchy are shared across all authentication screens so engineers can extend the flow without inventing new patterns."
      sideHighlights={highlights}
    >
      <TermsOfServiceChangelogModal
        open={tosModalOpen}
        currentVersion={CURRENT_TOS_VERSION}
        previousVersion={PREVIOUS_TOS_VERSION}
        effectiveDate={TOS_EFFECTIVE_DATE}
        summary={TOS_SUMMARY}
        changes={TOS_CHANGES}
        fullTextHref="/legal/terms-of-service-v2-4-0.txt"
        pdfHref="/legal/terms-of-service-v2-4-0.pdf"
        onAcknowledge={(version) => {
          setAcknowledgedVersion(version);
          setTosModalOpen(false);
        }}
        onClose={() => setTosModalOpen(false)}
      />
      <form className="auth-form">
        <div className="auth-grid">
          <div className="auth-input-group">
            <label className="auth-label" htmlFor="signup-name">
              Full name
            </label>
            <input
              id="signup-name"
              className="auth-input"
              type="text"
              placeholder="Amina Adeyemi"
              autoComplete="name"
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="signup-company">
              Company
            </label>
            <input
              id="signup-company"
              className="auth-input"
              type="text"
              placeholder="Veritasor Labs"
              autoComplete="organization"
            />
          </div>
        </div>

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="signup-email">
            Work email
          </label>
          <input
            id="signup-email"
            className="auth-input"
            type="email"
            placeholder="founder@veritasor.com"
            autoComplete="email"
          />
        </div>

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            className="auth-input"
            type="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            aria-describedby="signup-password-help"
          />
          <p id="signup-password-help" className="auth-message auth-message-help">
            Use 12+ characters with uppercase, lowercase, number, and symbol.
          </p>
        </div>

        <div className="auth-strength" aria-label="Password strength preview">
          <span className="auth-strength-bar auth-strength-bar-active" />
          <span className="auth-strength-bar auth-strength-bar-active" />
          <span className="auth-strength-bar auth-strength-bar-active" />
          <span className="auth-strength-bar" />
          <p className="auth-strength-copy">Strong enough for a production workspace</p>
        </div>

        <div className="auth-message auth-message-warning tos-acknowledgement" role="note">
          <div className="tos-acknowledgement-copy">
            <strong>Updated terms need review</strong>
            <span>
              Version {CURRENT_TOS_VERSION} replaces {PREVIOUS_TOS_VERSION}. Acknowledge the changelog before creating your account.
            </span>
          </div>
          <button type="button" className="auth-button auth-button-secondary tos-review-button" onClick={() => setTosModalOpen(true)}>
            Review changes
          </button>
        </div>

        {hasAcknowledgedCurrentTerms && (
          <div className="auth-message auth-message-success" role="status" aria-live="polite">
            Terms {CURRENT_TOS_VERSION} acknowledged.
          </div>
        )}

        <div className="auth-actions">
          <button type="submit" className="auth-button auth-button-primary" disabled={!hasAcknowledgedCurrentTerms}>
            Create account
          </button>
          <button type="button" className="auth-button auth-button-secondary">
            Book onboarding call
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

