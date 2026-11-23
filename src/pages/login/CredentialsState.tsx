import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/AuthShell";
import SubmitButton, { SUBMIT_DEMO_MS } from "../../components/SubmitButton";
import { useTimeout } from "./useTimeout";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginHighlights = [
  "Verifiable revenue attestations anchored on-chain",
  "Fully keyboard accessible, with inline guidance",
  "Clear feedback on every step of sign-in",
];

export default function CredentialsState({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submitTimer = useTimeout();

  const emailId = useId();
  const emailErrorId = useId();
  const passwordId = useId();
  const passwordErrorId = useId();

  const trimmedEmail = email.trim();
  let emailErrorMessage = "";
  if (!trimmedEmail) {
    emailErrorMessage = "Email is required.";
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    emailErrorMessage = "Please enter a valid email address.";
  }

  let passwordErrorMessage = "";
  if (!password) {
    passwordErrorMessage = "Password is required.";
  }

  const showEmailError =
    (hasSubmitted || emailBlurred) && Boolean(emailErrorMessage);
  const showPasswordError =
    (hasSubmitted || passwordBlurred) && Boolean(passwordErrorMessage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);

    if (emailErrorMessage) {
      emailInputRef.current?.focus();
      return;
    }

    if (passwordErrorMessage) {
      passwordInputRef.current?.focus();
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    submitTimer.schedule(() => {
      setIsSubmitting(false);
      onContinue();
    }, SUBMIT_DEMO_MS);
  };

  return (
    <AuthShell
      eyebrow="Authentication"
      title="Welcome back"
      description="Sign in to monitor attestation runs, review evidence, and continue onboarding securely."
      footerPrompt="Need an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/signup"
      sideTitle="Trusted access for finance teams"
      sideDescription="Sign in to review attestation runs and share verifiable revenue proof. This is a demo build: no real credentials are checked."
      sideHighlights={loginHighlights}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-input-group">
          <label className="auth-label" htmlFor={emailId}>
            Work email
          </label>
          <input
            ref={emailInputRef}
            id={emailId}
            className={
              "auth-input" + (showEmailError ? " auth-input-error" : "")
            }
            type="email"
            placeholder="team@veritasor.com"
            autoComplete="email"
            aria-describedby={showEmailError ? emailErrorId : undefined}
            aria-invalid={showEmailError ? "true" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailBlurred(true)}
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
          <div className="auth-label-row">
            <label className="auth-label" htmlFor={passwordId}>
              Password
            </label>
            <Link to="/forgot-password" className="auth-inline-link">
              Forgot password?
            </Link>
          </div>
          <input
            ref={passwordInputRef}
            id={passwordId}
            className={
              "auth-input" + (showPasswordError ? " auth-input-error" : "")
            }
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-describedby={showPasswordError ? passwordErrorId : undefined}
            aria-invalid={showPasswordError ? "true" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordBlurred(true)}
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
        </div>

        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
          />
          <span>Keep this device trusted for 30 days</span>
        </label>

        <div className="auth-actions">
          <SubmitButton
            idleLabel="Sign in"
            busyLabel="Signing in…"
            busy={isSubmitting}
          />
        </div>
      </form>
    </AuthShell>
  );
}
