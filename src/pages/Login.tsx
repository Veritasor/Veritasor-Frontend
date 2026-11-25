import { useEffect, useReducer } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CredentialsState from "./login/CredentialsState";
import MfaChallengeState from "./login/MfaChallengeState";
import MfaRecoveryFlowState from "./login/MfaRecoveryFlowState";
import {
  createInitialLoginState,
  isForcedRecoveryParam,
  loginReducer,
} from "./login/loginMachine";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forcedState = searchParams.get("state");

  const [machine, dispatch] = useReducer(
    loginReducer,
    forcedState,
    createInitialLoginState,
  );
import { Link } from "react-router-dom";

import AuthShell from "../components/AuthShell";

const highlights = [
  "Enterprise-grade verification for revenue attestations",
  "Keyboard-first forms with visible focus and inline guidance",
  "Reusable error, loading, and disabled states across every auth entry point",
];

export default function Login() {
  return (

    <AuthShell
      eyebrow="Authentication"
      title="Welcome back"
      description="Sign in to monitor attestation runs, review evidence, and continue onboarding securely."
      footerPrompt="Need an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/signup"
      sideTitle="Trusted access for finance teams"
      sideDescription="The authentication system now uses a shared visual language that stays readable on phones, tablets, and large desktop workspaces."
      sideHighlights={highlights}
    >
      <form className="auth-form">
        <div className="auth-input-group">
          <label className="auth-label" htmlFor="login-email">
            Work email
          </label>
          <input
            id="login-email"
            className="auth-input"
            type="email"
            placeholder="team@veritasor.com"
            autoComplete="email"
            defaultValue="ops@veritasor.com"
          />
        </div>

  useEffect(() => {
    if (isForcedRecoveryParam(forcedState)) {
      dispatch({ type: "START_RECOVERY" });
    }
  }, [forcedState]);

  const returnToCredentials = () => {
    dispatch({ type: "RETURN_TO_CREDENTIALS" });
    navigate("/login", { replace: true });
  };

  if (machine.step === "mfa-recovery") {
    return (
      <MfaRecoveryFlowState
        step={machine.recoveryStep}
        path={machine.recoveryPath}
        dispatch={dispatch}
        onBack={returnToCredentials}
        onSuccess={() => navigate("/dashboard")}
      />
    );
  }

  if (machine.step === "mfa-challenge") {
    return (
      <MfaChallengeState
        onBack={returnToCredentials}
        onSuccess={() => navigate("/dashboard")}
      />
    );
  }

  return (
    <CredentialsState
      onContinue={() => dispatch({ type: "CREDENTIALS_SUBMITTED" })}
    />
  );
}
