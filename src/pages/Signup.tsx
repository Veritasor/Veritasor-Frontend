import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import TermsOfServiceChangelogModal from "../components/TermsOfServiceChangelogModal";
import SubmitButton, { SUBMIT_DEMO_MS } from "../components/SubmitButton";
import { validatePassword, scorePassword } from "../utils/passwordPolicy";

const highlights = [
  "Set up your business account in a minute",
  "Password requirements are shown up front",
  "Works on phones, tablets, and desktops",
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STRENGTH_COPY: Record<number, string> = {
  0: "Enter a password to see its strength",
  1: "Password requirements not met",
  2: "Some password requirements met",
  3: "Most password requirements met",
  4: "Strong enough for a production workspace",
};

function computeStrength(password: string): number {
  if (!password) return 0;
  return Math.max(1, Math.ceil((scorePassword(password) / 5) * 4));
}

export default function Signup() {
  const navigate = useNavigate();
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [acknowledgedVersion, setAcknowledgedVersion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [nameBlurred, setNameBlurred] = useState(false);
  const [companyBlurred, setCompanyBlurred] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submitTimerRef = useRef<number | null>(null);

  const nameErrorId = useId();
  const companyErrorId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();

  const trimmedName = name.trim();
  let nameErrorMessage = "";
  if (!trimmedName) {
    nameErrorMessage = "Full name is required.";
  }

  const trimmedCompany = company.trim();
  let companyErrorMessage = "";
  if (!trimmedCompany) {
    companyErrorMessage = "Company is required.";
  }

  const trimmedEmail = email.trim();
  let emailErrorMessage = "";
  if (!trimmedEmail) {
    emailErrorMessage = "Email is required.";
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    emailErrorMessage = "Please enter a valid email address.";
  }

  const passwordPolicy = validatePassword(password);
  let passwordErrorMessage = "";
  if (!password) {
    passwordErrorMessage = "Password is required.";
  } else if (!passwordPolicy.valid) {
    passwordErrorMessage = passwordPolicy.failures[0] || "Password does not meet the security policy.";
  }

  const showNameError = (hasSubmitted || nameBlurred) && Boolean(nameErrorMessage);
  const showCompanyError = (hasSubmitted || companyBlurred) && Boolean(companyErrorMessage);
  const showEmailError = (hasSubmitted || emailBlurred) && Boolean(emailErrorMessage);
  const showPasswordError = (hasSubmitted || passwordBlurred) && Boolean(passwordErrorMessage);

  const strength = computeStrength(password);
  const hasAcknowledgedCurrentTerms = acknowledgedVersion === CURRENT_TOS_VERSION;

  useEffect(() => {
    return () => {
      if (submitTimerRef.current !== null) {
        window.clearTimeout(submitTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);

    if (nameErrorMessage) {
      nameInputRef.current?.focus();
      return;
    }

    if (companyErrorMessage) {
      companyInputRef.current?.focus();
      return;
    }

    if (emailErrorMessage) {
      emailInputRef.current?.focus();
      return;
    }

    if (passwordErrorMessage) {
      passwordInputRef.current?.focus();
      return;
    }

    if (!hasAcknowledgedCurrentTerms || isSubmitting) return;

    setIsSubmitting(true);
    submitTimerRef.current = window.setTimeout(() => {
      submitTimerRef.current = null;
      setIsSubmitting(false);
      try {
        const rawDraft = localStorage.getItem("veritasor_onboarding_draft");
        const parsed = rawDraft ? JSON.parse(rawDraft) : {};
        const updated = {
          ...parsed,
          business: {
            ...(parsed.business || {}),
            legalName: parsed.business?.legalName || trimmedCompany,
          },
        };
        localStorage.setItem("veritasor_onboarding_draft", JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      navigate("/onboarding");
    }, SUBMIT_DEMO_MS);
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Set up your workspace"
      description="Create a secure Veritasor account for your finance or compliance team in just a few guided steps."
      footerPrompt="Already have access?"
      footerLinkLabel="Sign in"
      footerLinkHref="/login"
      sideTitle="Get started in minutes"
      sideDescription="Create a business account, connect your revenue sources, and start sharing verifiable proof. Demo build: no real accounts are created."
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
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-grid">
          <div className="auth-input-group">
            <label className="auth-label" htmlFor="signup-name">
              Full name
            </label>
            <input
              ref={nameInputRef}
              id="signup-name"
              name="name"
              className={"auth-input" + (showNameError ? " auth-input-error" : "")}
              type="text"
              placeholder="Amina Adeyemi"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameBlurred(true)}
              aria-invalid={showNameError ? "true" : undefined}
              aria-describedby={showNameError ? nameErrorId : undefined}
            />
            {showNameError && (
              <p
                id={nameErrorId}
                className="auth-message auth-message-error"
                role="alert"
              >
                <span aria-hidden="true" className="auth-message-icon">
                  !
                </span>
                {nameErrorMessage}
              </p>
            )}
          </div>

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="signup-company">
              Company
            </label>
            <input
              ref={companyInputRef}
              id="signup-company"
              name="company"
              className={"auth-input" + (showCompanyError ? " auth-input-error" : "")}
              type="text"
              placeholder="Veritasor Labs"
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={() => setCompanyBlurred(true)}
              aria-invalid={showCompanyError ? "true" : undefined}
              aria-describedby={showCompanyError ? companyErrorId : undefined}
            />
            {showCompanyError && (
              <p
                id={companyErrorId}
                className="auth-message auth-message-error"
                role="alert"
              >
                <span aria-hidden="true" className="auth-message-icon">
                  !
                </span>
                {companyErrorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="signup-email">
            Work email
          </label>
          <input
            ref={emailInputRef}
            id="signup-email"
            name="email"
            className={"auth-input" + (showEmailError ? " auth-input-error" : "")}
            type="email"
            placeholder="founder@veritasor.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailBlurred(true)}
            aria-invalid={showEmailError ? "true" : undefined}
            aria-describedby={showEmailError ? emailErrorId : undefined}
          />
          {showEmailError && (
            <p
              id={emailErrorId}
              className="auth-message auth-message-error"
              role="alert"
            >
              <span aria-hidden="true" className="auth-message-icon">
                !
              </span>
              {emailErrorMessage}
            </p>
          )}
        </div>

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="signup-password">
            Password
          </label>
          <input
            ref={passwordInputRef}
            id="signup-password"
            name="password"
            className={"auth-input" + (showPasswordError ? " auth-input-error" : "")}
            type="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordBlurred(true)}
            aria-invalid={showPasswordError ? "true" : undefined}
            aria-describedby={
              showPasswordError
                ? `${passwordErrorId} signup-password-help`
                : "signup-password-help"
            }
          />
          {showPasswordError && (
            <p
              id={passwordErrorId}
              className="auth-message auth-message-error"
              role="alert"
            >
              <span aria-hidden="true" className="auth-message-icon">
                !
              </span>
              {passwordErrorMessage}
            </p>
          )}
          <p id="signup-password-help" className="auth-message auth-message-help">
            Use 12+ characters with uppercase, lowercase, number, and symbol.
          </p>
        </div>

        {password.length > 0 && (
          <div
            className="auth-strength"
            aria-label="Password strength preview"
            aria-live="polite"
          >
            {[1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className={
                  "auth-strength-bar" +
                  (strength >= bar ? " auth-strength-bar-active" : "")
                }
              />
            ))}
            <p className="auth-strength-copy">{STRENGTH_COPY[strength]}</p>
          </div>
        )}

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
          <SubmitButton
            idleLabel="Create account"
            busyLabel="Creating account…"
            busy={isSubmitting}
            disabled={!hasAcknowledgedCurrentTerms}
          />
        </div>
      </form>
    </AuthShell>
  );
}
