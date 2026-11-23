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
