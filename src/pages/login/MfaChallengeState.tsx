import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "../../components/AuthShell";
import { useToast } from "../../components/ToastContext";
import { type MfaMethod } from "../../components/MfaMethodChooser";
import SubmitButton from "../../components/SubmitButton";
import { useTimeout } from "./useTimeout";

export type MfaFallbackMethod = MfaMethod | "recovery";

export interface MfaMethodFallbackDefinition {
  id: MfaFallbackMethod;
  title: string;
  icon: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputAriaLabel: string;
  recommended?: boolean;
}

const PRIMARY_METHOD: MfaMethodFallbackDefinition = {
  id: "security-key",
  title: "Security key (FIDO2 / WebAuthn)",
  icon: "🔐",
  description:
    "Use your registered hardware key or platform authenticator (Touch ID, Face ID, Windows Hello).",
  inputLabel: "Security key",
  inputPlaceholder: "Waiting for key…",
  inputAriaLabel: "Security key challenge status",
  recommended: true,
};

const FALLBACK_METHODS: MfaMethodFallbackDefinition[] = [
  {
    id: "totp",
    title: "Authenticator app (TOTP)",
    icon: "📱",
    description:
      "Enter a 6-digit code from Google Authenticator, 1Password, Authy, etc.",
    inputLabel: "One-time code",
    inputPlaceholder: "6-digit code",
    inputAriaLabel: "6-digit authenticator one-time code",
  },
  {
    id: "sms",
    title: "SMS text message",
    icon: "💬",
    description:
      "We will text a one-time code to the phone number ending in •••• 4242.",
    inputLabel: "SMS code",
    inputPlaceholder: "6-digit code",
    inputAriaLabel: "6-digit SMS one-time code",
  },
  {
    id: "recovery",
    title: "Recovery code",
    icon: "🛡",
    description:
      "Use one of your saved recovery codes if you cannot access any other method.",
    inputLabel: "Recovery code",
    inputPlaceholder: "XXXX-XXXX-XXXX",
    inputAriaLabel: "Recovery code",
  },
];

function getMethodDefinition(
  id: MfaFallbackMethod,
): MfaMethodFallbackDefinition {
  if (id === PRIMARY_METHOD.id) return PRIMARY_METHOD;
  return FALLBACK_METHODS.find((m) => m.id === id) ?? FALLBACK_METHODS[0];
}

export default function MfaChallengeState({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeMethodId, setActiveMethodId] = useState<MfaFallbackMethod>(
    PRIMARY_METHOD.id,
  );
  const [code, setCode] = useState("");
  const [showFallbackSelector, setShowFallbackSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [codeError, setCodeError] = useState<string | null>(null);

  const codeId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const verifyTimer = useTimeout();
  const keyTimer = useTimeout();
  const focusTimer = useTimeout();

  const activeMethod = getMethodDefinition(activeMethodId);
  const isKeyMethod = activeMethodId === "security-key";
  const codeLengthExpected = activeMethodId === "recovery" ? 14 : 6;
  const sanitizedCode = code.replace(/\s/g, "");

  const isRecoveryMethod = activeMethodId === "recovery";
  const RECOVERY_CODE_PATTERN = /^[A-Z0-9]{4}-?[A-Z0-9]{4}-?[A-Z0-9]{4}$/;
  const codeValidLength = isRecoveryMethod
    ? RECOVERY_CODE_PATTERN.test(sanitizedCode.toUpperCase())
    : /^\d{6}$/.test(sanitizedCode);
  const submitDisabled =
    isSubmitting || (isKeyMethod ? false : !codeValidLength);

  // Focus the input on mount / method change (non-key methods)
  useEffect(() => {
    if (!isKeyMethod) {
      focusTimer.schedule(() => inputRef.current?.focus(), 50);
      return () => focusTimer.clear();
    }
  }, [isKeyMethod, activeMethodId, focusTimer]);

  // Resend countdown for SMS
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = window.setInterval(
      () => setResendCountdown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [resendCountdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled) return;

    setIsSubmitting(true);
    setCodeError(null);
    verifyTimer.schedule(() => {
      setIsSubmitting(false);
      addToast("Second factor verified. Redirecting…", "success");
      onSuccess();
    }, 900);
  };

  const handleResend = () => {
    setResendCountdown(30);
    setCode("");
    addToast("A fresh code has been sent to your registered phone.", "info");
  };

  const handleSelectFallback = (id: MfaFallbackMethod) => {
    setActiveMethodId(id);
    setShowFallbackSelector(false);
    setCode("");
    setCodeError(null);
  };

  const maskEmail = (e: string) => {
    const [local, domain] = e.split("@");
    const l = local.length;
    return `${local[0]}${"•".repeat(Math.max(0, l - 2))}${
      l > 1 ? local[l - 1] : ""
    }@${domain ?? "veritasor.com"}`;
  };

  return (
    <AuthShell
      eyebrow="Two-factor authentication"
      title="Verify your sign-in"
      description={`A second factor is required to access this workspace. A sign-in notification was also sent to ${maskEmail(
        "ops@veritasor.com",
      )}.`}
      footerPrompt="Using a different account?"
      footerLinkLabel="Go back to sign in"
      footerLinkHref="/login"
      sideTitle="Phishing-resistant sign-in"
      sideDescription="Security keys and platform authenticators verify the site origin so even a phishing page cannot reuse your credentials."
      sideHighlights={[
        "Primary method + fallback selector prevent lockouts",
        'Code inputs use autocomplete="one-time-code" for SMS/TOTP autofill',
        "Recovery codes and support paths are reachable without signing in",
      ]}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {/* Current method hero */}
        <div
          role="region"
          aria-labelledby="mfa-method-title"
          style={{
            display: "grid",
            gap: "0.75rem",
            padding: "1rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-strong)",
            background:
              "linear-gradient(180deg, rgba(94, 234, 212, 0.06), rgba(96, 165, 250, 0.04))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "2.75rem",
                height: "2.75rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-strong)",
                border: "1px solid var(--border)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.35rem",
                flexShrink: 0,
              }}
            >
              {activeMethod.icon}
            </span>
            <div style={{ display: "grid", gap: "0.2rem", minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  id="mfa-method-title"
                  style={{ fontWeight: 700, fontSize: "1rem" }}
                >
                  {activeMethod.title}
                </span>
                {activeMethod.recommended && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      padding: "0.12rem 0.5rem",
                      borderRadius: 999,
                      background: "rgba(94, 234, 212, 0.14)",
                      border: "1px solid rgba(94, 234, 212, 0.35)",
                      color: "var(--accent)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Recommended
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  color: "var(--muted)",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                }}
              >
                {activeMethod.description}
              </p>
            </div>
          </div>
        </div>

        {/* Input area: security-key is a status, other methods are code inputs */}
        {isKeyMethod ? (
          <div
            className="auth-input-group"
            role="group"
            aria-labelledby="mfa-key-status-title"
          >
            <div id="mfa-key-status-title" className="sr-only">
              Security key challenge
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSubmitting(true);
                keyTimer.schedule(() => {
                  setIsSubmitting(false);
                  addToast("Security key verified.", "success");
                  onSuccess();
                }, 1200);
              }}
              disabled={isSubmitting}
              className="auth-button auth-button-secondary"
              aria-label="Tap security key or use platform authenticator"
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "0.875rem",
                alignItems: "center",
                textAlign: "left",
                padding: "1rem 1.1rem",
                minHeight: "5rem",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "2.75rem",
                  height: "2.75rem",
                  borderRadius: 999,
                  background: isSubmitting
                    ? "var(--accent)"
                    : "rgba(94, 234, 212, 0.12)",
                  color: isSubmitting ? "#04111f" : "var(--accent)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                }}
              >
                {isSubmitting ? "✓" : "🔑"}
              </span>
              <span style={{ display: "grid", gap: "0.1rem" }}>
                <span
                  style={{
                    fontWeight: 700,
                    color: "var(--text)",
                    fontSize: "1rem",
                  }}
                >
                  {isSubmitting ? "Verifying key…" : "Tap security key"}
                </span>
                <span
                  style={{
                    fontSize: "0.88rem",
                    color: "var(--muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {isSubmitting
                    ? "Validating signature with WebAuthn…"
                    : "Insert your key, then tap its button or touch the sensor. Or use Touch ID / Windows Hello."}
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div className="auth-input-group">
            <label className="auth-label" htmlFor={codeId}>
              {activeMethod.inputLabel}
            </label>
            <input
              ref={inputRef}
              id={codeId}
              className={
                "auth-input" + (codeError ? " auth-input-error" : "")
              }
              type="text"
              inputMode={isRecoveryMethod ? "text" : "numeric"}
              autoCapitalize={
                isRecoveryMethod ? "characters" : undefined
              }
              autoCorrect={isRecoveryMethod ? "off" : undefined}
              spellCheck={isRecoveryMethod ? false : undefined}
              autoComplete="one-time-code"
              placeholder={activeMethod.inputPlaceholder}
              aria-label={activeMethod.inputAriaLabel}
              aria-invalid={codeError ? "true" : undefined}
              aria-describedby={
                [
                  codeError ? errorId : null,
                  activeMethodId === "sms" && resendCountdown > 0
                    ? "mfa-resend-status"
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (codeError) setCodeError(null);
              }}
              style={{
                fontFamily:
                  activeMethodId === "recovery"
                    ? "ui-monospace, SFMono-Regular, Menlo, monospace"
                    : "inherit",
                letterSpacing:
                  activeMethodId === "recovery" ? "0.1em" : "0.25em",
                textAlign: "center" as const,
                fontSize: "1.15rem",
              }}
              maxLength={
                activeMethodId === "recovery" ? 16 : codeLengthExpected
              }
              disabled={isSubmitting}
            />

            {codeError && (
              <p
                id={errorId}
                className="auth-message auth-message-error"
                role="alert"
              >
                <span aria-hidden="true" className="auth-message-icon">
                  !
                </span>
                {codeError}
              </p>
            )}

            {activeMethodId === "sms" && resendCountdown > 0 && (
              <p
                id="mfa-resend-status"
                className="auth-message auth-message-help"
                role="status"
                aria-live="polite"
              >
                You can request a new code in {resendCountdown}s.
              </p>
            )}

            {activeMethodId === "sms" && resendCountdown === 0 && (
              <button
                type="button"
                onClick={handleResend}
                className="auth-inline-link"
                style={{
                  justifySelf: "start",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Didn&apos;t receive the text? Resend code
              </button>
            )}

            {activeMethodId === "recovery" && (
              <p className="auth-message auth-message-warning" role="note">
                <span aria-hidden="true" className="auth-message-icon">
                  ⚠
                </span>
                Each recovery code can only be used once. After sign-in, you
                will be prompted to regenerate a fresh set.
              </p>
            )}
          </div>
        )}

        {/* Fallback selector */}
        <button
          type="button"
          className="auth-button auth-button-ghost"
          aria-expanded={showFallbackSelector}
          aria-controls="mfa-fallback-panel"
          onClick={() => setShowFallbackSelector((v) => !v)}
          style={{ minHeight: "2.75rem" }}
        >
          {showFallbackSelector ? "Hide other methods" : "Use another method"}
        </button>

        {showFallbackSelector && (
          <div
            id="mfa-fallback-panel"
            role="region"
            aria-label="Alternative second-factor methods"
            style={{
              display: "grid",
              gap: "0.65rem",
              padding: "0.875rem",
              borderRadius: "var(--radius-sm)",
              border: "1px dashed var(--border)",
              background: "var(--surface-soft)",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
                padding: "0.125rem 0.25rem",
              }}
            >
              Other methods
            </div>
            {FALLBACK_METHODS.map((method) => {
              const isActive = method.id === activeMethodId;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => handleSelectFallback(method.id)}
                  aria-current={isActive ? "true" : undefined}
                  aria-pressed={isActive}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "0.75rem",
                    alignItems: "center",
                    textAlign: "left",
                    padding: "0.75rem 0.875rem",
                    borderRadius: "calc(var(--radius-sm) - 0.1rem)",
                    border: isActive
                      ? "1px solid var(--border-strong)"
                      : "1px solid var(--border)",
                    background: isActive
                      ? "rgba(94, 234, 212, 0.06)"
                      : "var(--surface)",
                    cursor: "pointer",
                    color: "var(--text)",
                    transition:
                      "border-color 120ms ease, background-color 120ms ease",
                    minHeight: "3.25rem",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "calc(var(--radius-sm) - 0.25rem)",
                      background: "var(--surface-strong)",
                      border: "1px solid var(--border)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                      flexShrink: 0,
                    }}
                  >
                    {method.icon}
                  </span>
                  <span style={{ display: "grid", gap: "0.1rem", minWidth: 0 }}>
                    <span
                      style={{
                        fontWeight: isActive ? 700 : 600,
                        fontSize: "0.92rem",
                        color: "var(--text)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {method.title}
                      {isActive && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--accent)",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          Active
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--muted)",
                        lineHeight: 1.45,
                      }}
                    >
                      {method.description}
                    </span>
                  </span>
                </button>
              );
            })}

            <div
              role="separator"
              style={{
                height: 1,
                background: "var(--border)",
                margin: "0.25rem 0",
              }}
            />

            <button
              type="button"
              onClick={() => navigate("/login?state=mfa-recover")}
              className="auth-inline-link"
              style={{
                justifySelf: "start",
                padding: "0.35rem 0.25rem",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              Lost your device? Use recovery codes or contact support
            </button>
          </div>
        )}

        <div className="auth-actions">
          <button
            type="button"
            className="auth-button auth-button-secondary"
            onClick={onBack}
            disabled={isSubmitting}
          >
            ← Back
          </button>
          {!isKeyMethod && (
            <SubmitButton
              idleLabel="Verify code"
              busyLabel="Verifying…"
              busy={isSubmitting}
              disabled={submitDisabled}
            />
          )}
        </div>
      </form>
    </AuthShell>
  );
}
