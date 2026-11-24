export type LoginState = "credentials" | "mfa-challenge" | "mfa-recovery";

export type RecoveryStep =
  | "choose-path"
  | "recovery-code-entry"
  | "recovery-code-success"
  | "support-verify"
  | "reenroll-method"
  | "complete";

export type RecoveryPath = "recovery-code" | "support";

export interface LoginMachineState {
  step: LoginState;
  recoveryStep: RecoveryStep;
  recoveryPath: RecoveryPath | null;
}

export type LoginMachineAction =
  | { type: "CREDENTIALS_SUBMITTED" }
  | { type: "START_RECOVERY" }
  | { type: "RETURN_TO_CREDENTIALS" }
  | { type: "SELECT_RECOVERY_PATH"; path: RecoveryPath }
  | { type: "CONTINUE_FROM_CHOOSE_PATH" }
  | { type: "RECOVERY_CODE_ACCEPTED" }
  | { type: "RECOVERY_CODE_AUTO_ADVANCE" }
  | { type: "SUPPORT_REQUEST_SUBMITTED" }
  | { type: "REENROLL_COMPLETED" }
  | { type: "RECOVERY_BACK" };

export function isForcedRecoveryParam(forcedState: string | null): boolean {
  return forcedState === "mfa-recover" || forcedState === "mfa-recovery";
}

export function createInitialLoginState(
  forcedState: string | null = null,
): LoginMachineState {
  return {
    step: isForcedRecoveryParam(forcedState) ? "mfa-recovery" : "credentials",
    recoveryStep: "choose-path",
    recoveryPath: null,
  };
}

export function loginReducer(
  state: LoginMachineState,
  action: LoginMachineAction,
): LoginMachineState {
  switch (action.type) {
    case "CREDENTIALS_SUBMITTED":
      if (state.step !== "credentials") return state;
      return {
        ...state,
        step: "mfa-challenge",
      };

    case "START_RECOVERY":
      if (state.step === "mfa-recovery") return state;
      return {
        step: "mfa-recovery",
        recoveryStep: "choose-path",
        recoveryPath: null,
      };

    case "RETURN_TO_CREDENTIALS":
      return {
        step: "credentials",
        recoveryStep: "choose-path",
        recoveryPath: null,
      };

    case "SELECT_RECOVERY_PATH":
      if (
        state.step !== "mfa-recovery" ||
        state.recoveryStep !== "choose-path"
      ) {
        return state;
      }
      return {
        ...state,
        recoveryPath: action.path,
      };

    case "CONTINUE_FROM_CHOOSE_PATH":
      if (
        state.step !== "mfa-recovery" ||
        state.recoveryStep !== "choose-path" ||
        !state.recoveryPath
      ) {
        return state;
      }
      return {
        ...state,
        recoveryStep:
          state.recoveryPath === "recovery-code"
            ? "recovery-code-entry"
            : "support-verify",
      };

    case "RECOVERY_CODE_ACCEPTED":
      if (
        state.step !== "mfa-recovery" ||
        state.recoveryStep !== "recovery-code-entry"
      ) {
        return state;
      }
      return {
        ...state,
        recoveryStep: "recovery-code-success",
      };

    case "RECOVERY_CODE_AUTO_ADVANCE":
      if (
        state.step !== "mfa-recovery" ||
        state.recoveryStep !== "recovery-code-success"
      ) {
        return state;
      }
      return {
        ...state,
        recoveryStep: "reenroll-method",
      };

    case "SUPPORT_REQUEST_SUBMITTED":
      if (
        state.step !== "mfa-recovery" ||
        state.recoveryStep !== "support-verify"
      ) {
        return state;
      }
      return {
        ...state,
        recoveryStep: "reenroll-method",
      };

    case "REENROLL_COMPLETED":
      if (
        state.step !== "mfa-recovery" ||
        state.recoveryStep !== "reenroll-method"
      ) {
        return state;
      }
      return {
        ...state,
        recoveryStep: "complete",
      };

    case "RECOVERY_BACK":
      if (state.step !== "mfa-recovery") return state;
      if (
        state.recoveryStep === "recovery-code-entry" ||
        state.recoveryStep === "support-verify"
      ) {
        return {
          ...state,
          recoveryStep: "choose-path",
        };
      }
      if (state.recoveryStep === "choose-path") {
        return {
          step: "credentials",
          recoveryStep: "choose-path",
          recoveryPath: null,
        };
      }
      return state;
  }
}
