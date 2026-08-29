import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Demo in-flight delay for local auth screens that have no register/login API. */
export const SUBMIT_DEMO_MS = 400;

type SubmitButtonProps = {
  busy?: boolean;
  idleLabel: ReactNode;
  busyLabel: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-busy">;

export default function SubmitButton({
  busy = false,
  disabled = false,
  idleLabel,
  busyLabel,
  className = "",
  type = "submit",
  ...rest
}: SubmitButtonProps) {
  const isDisabled = Boolean(disabled) || busy;
  const classes = ["auth-button", "auth-button-primary", "auth-submit", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      {...rest}
      disabled={isDisabled}
      aria-busy={busy || undefined}
    >
      {busy ? (
        <svg
          className="auth-submit-spinner"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.25"
          />
          <path
            d="M22 12a10 10 0 0 0-10-10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
      <span className="auth-submit-label" aria-live="polite">
        {busy ? busyLabel : idleLabel}
      </span>
    </button>
  );
}
