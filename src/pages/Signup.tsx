import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import TermsOfServiceChangelogModal from "../components/TermsOfServiceChangelogModal";
import SubmitButton, { SUBMIT_DEMO_MS } from "../components/SubmitButton";
import { validatePassword, scorePassword } from "../utils/passwordPolicy";
import { compose, email as emailValidator, required } from "../utils/validation";
import { useForm } from "../hooks/useForm";
import { validatePassword, strengthLevel } from "../utils/passwordPolicy";

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

interface SignupValues {
  name: string;
  company: string;
  email: string;
  password: string;
}

const SIGNUP_VALIDATORS = {
  name: required("Full name is required."),
  company: required("Company is required."),
  email: compose(
    required("Email is required."),
    emailValidator("Please enter a valid email address."),
  ),
  password: compose(
    required("Password is required.", { trim: false }),
    (value: string) => {
      const policy = validatePassword(value);
      return policy.valid ? undefined : policy.failures[0];
    },
  ),
};

export default function Signup() {
  const navigate = useNavigate();
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [acknowledgedVersion, setAcknowledgedVersion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupValues>({
    initialValues: {
      name: "",
      company: "",
      email: "",
      password: "",
    },
    validators: SIGNUP_VALIDATORS,
    validateOnBlur: true,
    revalidateOnChangeAfterSubmit: true,
  });

  const nameInputRef = useRef<HTMLInputElement>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submitTimerRef = useRef<number | null>(null);

  const nameErrorId = useId();
  const companyErrorId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();

  const { name, company, email, password } = form.values;
  const nameErrorMessage = form.errors.name ?? "";
  const companyErrorMessage = form.errors.company ?? "";
  const emailErrorMessage = form.errors.email ?? "";
  const passwordErrorMessage = form.errors.password ?? "";

  const showNameError = (form.hasSubmitted || Boolean(form.touched.name)) && Boolean(nameErrorMessage);
  const showCompanyError = (form.hasSubmitted || Boolean(form.touched.company)) && Boolean(companyErrorMessage);
  const showEmailError = (form.hasSubmitted || Boolean(form.touched.email)) && Boolean(emailErrorMessage);
  const showPasswordError = (form.hasSubmitted || Boolean(form.touched.password)) && Boolean(passwordErrorMessage);

  const strength = strengthLevel(password);
  const hasAcknowledgedCurrentTerms = acknowledgedVersion === CURRENT_TOS_VERSION;

  useEffect(() => {
    return () => {
      if (submitTimerRef.current !== null) {
        window.clearTimeout(submitTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = form.handleSubmit(
    (values) => {
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
              legalName: parsed.business?.legalName || values.company.trim(),
            },
          };
          localStorage.setItem("veritasor_onboarding_draft", JSON.stringify(updated));
        } catch {
          // ignore storage errors
        }
        navigate("/onboarding");
      }, SUBMIT_DEMO_MS);
    },
    (errs) => {
      if (errs.name) {
        nameInputRef.current?.focus();
      } else if (errs.company) {
        companyInputRef.current?.focus();
      } else if (errs.email) {
        emailInputRef.current?.focus();
      } else if (errs.password) {
        passwordInputRef.current?.focus();
      }
    },
  );

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
              onChange={(e) => form.setFieldValue("name", e.target.value)}
              onBlur={() => form.handleBlur("name")}
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
              onChange={(e) => form.setFieldValue("company", e.target.value)}
              onBlur={() => form.handleBlur("company")}
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
            onChange={(e) => form.setFieldValue("email", e.target.value)}
            onBlur={() => form.handleBlur("email")}
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
            onChange={(e) => form.setFieldValue("password", e.target.value)}
            onBlur={() => form.handleBlur("password")}
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
