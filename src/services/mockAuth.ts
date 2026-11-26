/**
 * mockAuth — demo-only authentication helpers.
 *
 * Recovery codes are pre-defined for the demo account so that the recovery
 * flow is reachable and testable without a real backend.  Each code is
 * single-use: calling `verifyRecoveryCode` with a valid code consumes it so
 * subsequent calls with the same code return `false`.
 *
 * New codes generated after re-enrollment use `crypto.getRandomValues` rather
 * than `Math.random`; the latter is not suitable for security material.
 *
 * SECURITY NOTE: This module is intentionally demo-only and ships with
 * well-known codes in plain source.  A production implementation must never
 * embed recovery codes in frontend source.
 */

// ─── Character set ───────────────────────────────────────────────────────────
// Omits visually ambiguous characters: 0/O, 1/I/L.
const RECOVERY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// ─── Demo account codes ──────────────────────────────────────────────────────
// These are the codes that were "shown at enrollment" for the demo account.
// They are intentionally documented so testers can use them.
const DEMO_RECOVERY_CODES: string[] = [
  "ABCD-EFGH-2345",
  "JKLM-NPQR-6789",
  "STUV-WXYZ-2346",
  "ABCE-FGHJ-3456",
  "KLMN-PQRS-4567",
  "TUVW-XYZ2-5678",
  "BCDE-FGHK-6789",
  "LMNP-QRST-7890",
  "UVWX-YZ23-8901",
  "CDEF-GHJK-9012",
];

// ─── Mutable state ───────────────────────────────────────────────────────────
// A Set gives O(1) membership checks and cheap deletion (consume on use).
// Kept module-private so consumers cannot bypass verifyRecoveryCode's consume-once contract.
let _remainingCodes: Set<string> = new Set(DEMO_RECOVERY_CODES);

/** Reset the in-memory code store to the original demo set.  Call this in
 *  `beforeEach` / `afterEach` in tests that mutate the store. */
export function resetMockAuthCodes(): void {
  _remainingCodes = new Set(DEMO_RECOVERY_CODES);
}

// ─── Normalisation ───────────────────────────────────────────────────────────
/** Strip dashes and non-alphanumeric, upper-case.  Allows users to paste with
 *  or without dashes, and forgives mixed case. */
function normalise(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Verify a recovery code entered by the user.
 *
 * Returns `true` and consumes (removes) the code if it matches any remaining
 * code.  Returns `false` if there is no match or the code was already used.
 *
 * Matching is case-insensitive and dash-tolerant.
 */
export function verifyRecoveryCode(input: string): boolean {
  const normalised = normalise(input);
  for (const stored of _remainingCodes) {
    if (normalise(stored) === normalised) {
      _remainingCodes.delete(stored);
      return true;
    }
  }
  return false;
}

/** How many recovery codes are still available for the demo account. */
export function remainingCodeCount(): number {
  return _remainingCodes.size;
}

/** Replace the in-memory recovery code store with a freshly generated set. */
export function replaceRecoveryCodes(codes: string[]): void {
  _remainingCodes = new Set(codes);
}

/** Return a snapshot of the currently remaining recovery codes. */
export function getRemainingCodes(): string[] {
  return Array.from(_remainingCodes);
}

/** The list of demo codes originally shown at enrollment.
 *  Read-only; used to seed UI hints in development. */
export const DEMO_CODES_READONLY: readonly string[] = Object.freeze([
  ...DEMO_RECOVERY_CODES,
]);

// ─── Code generation (post re-enrollment) ────────────────────────────────────
/**
 * Pick a single unbiased random character from RECOVERY_CODE_CHARS using
 * rejection sampling.  Because RECOVERY_CODE_CHARS.length (32) divides 2^8
 * evenly, bias would only arise if the alphabet size were not a power of two;
 * the rejection loop is included for correctness in the general case and to
 * make the intent explicit.
 */
function randomChar(): string {
  const ALPHABET_LEN = RECOVERY_CODE_CHARS.length;
  // The largest multiple of ALPHABET_LEN that fits in a byte (0–255).
  const limit = 256 - (256 % ALPHABET_LEN);
  const buf = new Uint8Array(1);
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limit);
  return RECOVERY_CODE_CHARS[n % ALPHABET_LEN];
}

/**
 * Generate a fresh set of 10 recovery codes using `crypto.getRandomValues`
 * with rejection sampling to avoid modulo bias.
 *
 * Format: XXXX-XXXX-XXXX (three groups of 4 chars from RECOVERY_CODE_CHARS).
 *
 * This is the single source of truth for recovery-code generation; the
 * `Math.random`-based copy that was previously inlined in Settings.tsx has
 * been removed and callers import this function instead.
 */
export function generateRecoveryCodes(): string[] {
  const seg = (): string =>
    Array.from({ length: 4 }, () => randomChar()).join("");
  return Array.from({ length: 10 }, () => `${seg()}-${seg()}-${seg()}`);
}
