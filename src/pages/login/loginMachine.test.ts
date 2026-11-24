import { describe, expect, it } from "vitest";
import {
  createInitialLoginState,
  isForcedRecoveryParam,
  loginReducer,
  type LoginMachineState,
} from "./loginMachine";

describe("loginMachine", () => {
  describe("isForcedRecoveryParam & createInitialLoginState", () => {
    it("defaults to credentials state when no forced state param is provided", () => {
      expect(isForcedRecoveryParam(null)).toBe(false);
      expect(isForcedRecoveryParam("other")).toBe(false);
      expect(createInitialLoginState(null)).toEqual({
        step: "credentials",
        recoveryStep: "choose-path",
        recoveryPath: null,
      });
    });

    it("starts in mfa-recovery for mfa-recover and mfa-recovery query params", () => {
      expect(isForcedRecoveryParam("mfa-recover")).toBe(true);
      expect(isForcedRecoveryParam("mfa-recovery")).toBe(true);
      expect(createInitialLoginState("mfa-recover")).toEqual({
        step: "mfa-recovery",
        recoveryStep: "choose-path",
        recoveryPath: null,
      });
      expect(createInitialLoginState("mfa-recovery")).toEqual({
        step: "mfa-recovery",
        recoveryStep: "choose-path",
        recoveryPath: null,
      });
    });
  });

  describe("top-level transitions", () => {
    it("transitions from credentials to mfa-challenge on CREDENTIALS_SUBMITTED", () => {
      const initial = createInitialLoginState();
      const next = loginReducer(initial, { type: "CREDENTIALS_SUBMITTED" });
      expect(next.step).toBe("mfa-challenge");
    });

    it("ignores CREDENTIALS_SUBMITTED when not in credentials step", () => {
      const mfaState: LoginMachineState = {
        step: "mfa-challenge",
        recoveryStep: "choose-path",
        recoveryPath: null,
      };
      expect(loginReducer(mfaState, { type: "CREDENTIALS_SUBMITTED" })).toBe(
        mfaState,
      );
    });

    it("transitions to mfa-recovery on START_RECOVERY and resets recovery sub-state", () => {
      const mfaState: LoginMachineState = {
        step: "mfa-challenge",
        recoveryStep: "complete",
        recoveryPath: "support",
      };
      expect(loginReducer(mfaState, { type: "START_RECOVERY" })).toEqual({
        step: "mfa-recovery",
        recoveryStep: "choose-path",
        recoveryPath: null,
      });
    });

    it("preserves current recovery progress if START_RECOVERY is dispatched while already in mfa-recovery", () => {
      const midRecovery: LoginMachineState = {
        step: "mfa-recovery",
        recoveryStep: "recovery-code-entry",
        recoveryPath: "recovery-code",
      };
      expect(loginReducer(midRecovery, { type: "START_RECOVERY" })).toBe(
        midRecovery,
      );
    });

    it("resets back to credentials on RETURN_TO_CREDENTIALS from any step", () => {
      const mfaState: LoginMachineState = {
        step: "mfa-challenge",
        recoveryStep: "choose-path",
        recoveryPath: null,
      };
      expect(loginReducer(mfaState, { type: "RETURN_TO_CREDENTIALS" })).toEqual(
        {
          step: "credentials",
          recoveryStep: "choose-path",
          recoveryPath: null,
        },
      );

      const recoveryState: LoginMachineState = {
        step: "mfa-recovery",
        recoveryStep: "reenroll-method",
        recoveryPath: "support",
      };
      expect(
        loginReducer(recoveryState, { type: "RETURN_TO_CREDENTIALS" }),
      ).toEqual({
        step: "credentials",
        recoveryStep: "choose-path",
        recoveryPath: null,
      });
    });
  });

  describe("recovery flow transitions", () => {
    it("walks the recovery-code path from choose-path through complete", () => {
      let state = createInitialLoginState("mfa-recover");

      // Cannot continue before selecting a path
      expect(
        loginReducer(state, { type: "CONTINUE_FROM_CHOOSE_PATH" }),
      ).toBe(state);

      state = loginReducer(state, {
        type: "SELECT_RECOVERY_PATH",
        path: "recovery-code",
      });
      expect(state.recoveryPath).toBe("recovery-code");

      state = loginReducer(state, { type: "CONTINUE_FROM_CHOOSE_PATH" });
      expect(state.recoveryStep).toBe("recovery-code-entry");

      state = loginReducer(state, { type: "RECOVERY_CODE_ACCEPTED" });
      expect(state.recoveryStep).toBe("recovery-code-success");

      state = loginReducer(state, { type: "RECOVERY_CODE_AUTO_ADVANCE" });
      expect(state.recoveryStep).toBe("reenroll-method");

      state = loginReducer(state, { type: "REENROLL_COMPLETED" });
      expect(state.recoveryStep).toBe("complete");
    });

    it("walks the support path from choose-path through complete", () => {
      let state = createInitialLoginState("mfa-recovery");

      state = loginReducer(state, {
        type: "SELECT_RECOVERY_PATH",
        path: "support",
      });
      expect(state.recoveryPath).toBe("support");

      state = loginReducer(state, { type: "CONTINUE_FROM_CHOOSE_PATH" });
      expect(state.recoveryStep).toBe("support-verify");

      state = loginReducer(state, { type: "SUPPORT_REQUEST_SUBMITTED" });
      expect(state.recoveryStep).toBe("reenroll-method");

      state = loginReducer(state, { type: "REENROLL_COMPLETED" });
      expect(state.recoveryStep).toBe("complete");
    });

    it("supports back navigation from recovery-code-entry and support-verify to choose-path", () => {
      const codeEntryState: LoginMachineState = {
        step: "mfa-recovery",
        recoveryStep: "recovery-code-entry",
        recoveryPath: "recovery-code",
      };
      expect(loginReducer(codeEntryState, { type: "RECOVERY_BACK" })).toEqual({
        step: "mfa-recovery",
        recoveryStep: "choose-path",
        recoveryPath: "recovery-code",
      });

      const supportState: LoginMachineState = {
        step: "mfa-recovery",
        recoveryStep: "support-verify",
        recoveryPath: "support",
      };
      expect(loginReducer(supportState, { type: "RECOVERY_BACK" })).toEqual({
        step: "mfa-recovery",
        recoveryStep: "choose-path",
        recoveryPath: "support",
      });
    });

    it("returns to credentials when RECOVERY_BACK is dispatched from choose-path", () => {
      const choosePathState: LoginMachineState = {
        step: "mfa-recovery",
        recoveryStep: "choose-path",
        recoveryPath: "recovery-code",
      };
      expect(loginReducer(choosePathState, { type: "RECOVERY_BACK" })).toEqual({
        step: "credentials",
        recoveryStep: "choose-path",
        recoveryPath: null,
      });
    });

    it("ignores RECOVERY_BACK from non-backtrackable steps or outside recovery", () => {
      const nonBacktrackable: LoginMachineState[] = [
        {
          step: "credentials",
          recoveryStep: "choose-path",
          recoveryPath: null,
        },
        {
          step: "mfa-recovery",
          recoveryStep: "recovery-code-success",
          recoveryPath: "recovery-code",
        },
        {
          step: "mfa-recovery",
          recoveryStep: "reenroll-method",
          recoveryPath: "recovery-code",
        },
        {
          step: "mfa-recovery",
          recoveryStep: "complete",
          recoveryPath: "recovery-code",
        },
      ];

      for (const s of nonBacktrackable) {
        expect(loginReducer(s, { type: "RECOVERY_BACK" })).toBe(s);
      }
    });

    it("ignores out-of-order recovery actions", () => {
      const choosePath = createInitialLoginState("mfa-recover");
      expect(
        loginReducer(choosePath, { type: "RECOVERY_CODE_ACCEPTED" }),
      ).toBe(choosePath);
      expect(
        loginReducer(choosePath, { type: "RECOVERY_CODE_AUTO_ADVANCE" }),
      ).toBe(choosePath);
      expect(
        loginReducer(choosePath, { type: "SUPPORT_REQUEST_SUBMITTED" }),
      ).toBe(choosePath);
      expect(loginReducer(choosePath, { type: "REENROLL_COMPLETED" })).toBe(
        choosePath,
      );

      const codeEntry: LoginMachineState = {
        step: "mfa-recovery",
        recoveryStep: "recovery-code-entry",
        recoveryPath: "recovery-code",
      };
      expect(
        loginReducer(codeEntry, {
          type: "SELECT_RECOVERY_PATH",
          path: "support",
        }),
      ).toBe(codeEntry);
    });
  });
});
