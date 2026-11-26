import { useCallback, useEffect, useId, useState } from 'react'
import MfaManagementPanel from '../../components/MfaManagementPanel'
import DirtyStateBanner from '../../components/DirtyStateBanner'
import { useDirtyForm } from '../../hooks/useDirtyForm'
import { validatePassword } from '../../utils/passwordPolicy'
import { useDirtyRegistry } from './dirtyRegistry'

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

const MOCK_SESSIONS: ActiveSession[] = [
  {
    id: "s1",
    device: 'MacBook Pro 14"',
    browser: "Chrome 125",
    ip: "203.0.113.42",
    location: "Lagos, NG",
    lastActive: "Now",
    isCurrent: true,
  },
  {
    id: "s2",
    device: "iPhone 15 Pro",
    browser: "Safari 18",
    ip: "203.0.113.42",
    location: "Lagos, NG",
    lastActive: "2 hours ago",
    isCurrent: false,
  },
  {
    id: "s3",
    device: "Windows PC",
    browser: "Firefox 128",
    ip: "198.51.100.77",
    location: "Accra, GH",
    lastActive: "3 days ago",
    isCurrent: false,
  },
  {
    id: "s4",
    device: "Android Tablet",
    browser: "Chrome 124",
    ip: "192.0.2.150",
    location: "Nairobi, KE",
    lastActive: "2 weeks ago",
    isCurrent: false,
  },
];

function SessionRow({
  session,
  onRevoke,
}: {
  session: ActiveSession;
  onRevoke: (id: string) => void;
}) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = () => {
    setRevoking(true);
    setTimeout(() => {
      onRevoke(session.id);
      setRevoking(false);
    }, 400);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        borderRadius: 10,
        border: `1px solid ${session.isCurrent ? "var(--border-strong)" : "var(--border)"}`,
        background: session.isCurrent
          ? "rgba(94, 234, 212, 0.06)"
          : "transparent",
      }}
    >
      <div style={{ display: "grid", gap: "0.2rem", minWidth: 0 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          {session.device}
          {session.isCurrent ? (
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--accent)",
                border: "1px solid var(--border-strong)",
                borderRadius: 4,
                padding: "0.1rem 0.4rem",
              }}
            >
              Current
            </span>
          ) : null}
        </span>
        <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
          {session.browser} · {session.ip} · {session.location}
        </span>
        <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
          Active {session.lastActive}
        </span>
      </div>
      {!session.isCurrent ? (
        <button
          type="button"
          onClick={handleRevoke}
          disabled={revoking}
          style={{
            padding: "0.35rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: revoking ? "var(--danger)" : "transparent",
            color: revoking ? "#fff" : "var(--danger)",
            fontWeight: 600,
            fontSize: "0.8rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {revoking ? "Revoking…" : "Revoke"}
        </button>
      ) : (
        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          This device
        </span>
      )}
    </div>
  );
}

function SignOutAllButton() {
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (confirming) {
    return (
      <div
        style={{
          padding: "1rem",
          borderRadius: 12,
          border: "1px solid rgba(248, 113, 113, 0.3)",
          background: "rgba(248, 113, 113, 0.06)",
          display: "grid",
          gap: "0.75rem",
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, color: "var(--danger)" }}>
          Sign out of all other sessions?
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          This will revoke all active sessions except your current device. You
          will need to sign back in on those devices.
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => {
              setSigningOut(true);
              setTimeout(() => setConfirming(false), 800);
            }}
            disabled={signingOut}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "none",
              background: signingOut ? "var(--muted)" : "var(--danger)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {signingOut ? "Signing out…" : "Yes, sign out"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={signingOut}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      style={{
        padding: "0.5rem 1rem",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--danger)",
        fontWeight: 700,
        fontSize: "0.85rem",
        cursor: "pointer",
      }}
    >
      Sign out of all other sessions
    </button>
  );
}

function SecurityPanel() {
  const { register, unregister } = useDirtyRegistry();
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const passwordPolicyId = useId();
  const confirmPasswordId = useId();

  const pwForm = useDirtyForm({
    storageKey: "veritasor_settings_security_draft",
    initialValues: {
      currentPassword: "",
      newPassword: "",
    },
    autoSave: false,
    onSave: async (v) => {
      await new Promise((r) => setTimeout(r, 500));
      void v;
    },
  });
  const passwordPolicy = validatePassword(pwForm.values.newPassword);
  const passwordsMatch = pwForm.values.newPassword === confirmPassword;
  const showConfirmError = confirmTouched && !passwordsMatch;
  const canSubmitPassword =
    pwForm.isDirty &&
    passwordPolicy.valid &&
    passwordsMatch &&
    pwForm.saveStatus !== "saving";

  useEffect(() => {
    register("security", {
      isDirty: pwForm.isDirty,
      saveStatus: pwForm.saveStatus,
      lastSavedAt: pwForm.lastSavedAt,
      save: pwForm.save,
      reset: pwForm.reset,
    });
    return () => unregister("security");
  }, [
    register,
    unregister,
    pwForm.isDirty,
    pwForm.saveStatus,
    pwForm.lastSavedAt,
    pwForm.save,
    pwForm.reset,
  ]);

  const handleRevoke = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  async function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConfirmTouched(true);
    if (!passwordPolicy.valid || !passwordsMatch) return;
    await pwForm.save();
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <DirtyStateBanner
        isDirty={pwForm.isDirty}
        saveStatus={pwForm.saveStatus}
        lastSavedAt={pwForm.lastSavedAt}
        onSave={pwForm.save}
        onDiscard={pwForm.reset}
        formLabel="Security"
      />
      <div>
        <h2>Security</h2>
        <p style={{ color: "var(--muted)" }}>
          Update your password and manage two-factor authentication.
        </p>
        <form
          style={{ display: "grid", gap: "1rem", maxWidth: 480 }}
          onSubmit={handlePwSubmit}
        >
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label htmlFor="current-password" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={pwForm.values.currentPassword}
              onChange={(e) => pwForm.setField("currentPassword", e.target.value)}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
          </div>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label htmlFor="new-password" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={pwForm.values.newPassword}
              onChange={(e) => pwForm.setField("newPassword", e.target.value)}
              aria-describedby={passwordPolicyId}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
          </div>
          <ul
            id={passwordPolicyId}
            style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--muted)", fontSize: "0.85rem" }}
            aria-label="Password requirements"
          >
            {passwordPolicy.failures.length > 0 ? (
              passwordPolicy.failures.map((failure) => (
                <li key={failure}>{failure}</li>
              ))
            ) : (
              <li>Password meets all requirements.</li>
            )}
          </ul>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label htmlFor="confirm-new-password" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Confirm new password
            </label>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmTouched(true);
              }}
              aria-describedby={confirmPasswordId}
              aria-invalid={showConfirmError ? "true" : undefined}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
            {showConfirmError ? (
              <span id={confirmPasswordId} role="alert" style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
                Passwords do not match.
              </span>
            ) : (
              <span id={confirmPasswordId} style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                Confirm your new password.
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!canSubmitPassword}
            aria-busy={pwForm.saveStatus === "saving"}
            style={{
              alignSelf: "start",
              padding: "0.6rem 1.25rem",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "#04111f",
              fontWeight: 700,
              cursor: canSubmitPassword ? "pointer" : "default",
              fontSize: "0.95rem",
              opacity: canSubmitPassword ? 1 : 0.6,
              minHeight: "2.75rem",
            }}
          >
            {pwForm.saveStatus === "saving" ? "Saving…" : "Update password"}
          </button>
        </form>

      <hr style={{ margin: 0, borderColor: "var(--border)", opacity: 0.5 }} />

      <MfaManagementPanel />

      {/* Active sessions */}
      <hr style={{ margin: 0, borderColor: "var(--border)", opacity: 0.5 }} />
      <section aria-labelledby="active-sessions-title">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3
              id="active-sessions-title"
              style={{ margin: 0, fontSize: "1.05rem" }}
            >
              Active sessions
            </h3>
            <p
              style={{
                margin: "0.15rem 0 0",
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              {sessions.length} active session{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
          {sessions.filter((s) => !s.isCurrent).length > 0 ? (
            <SignOutAllButton />
          ) : null}
        </div>
        <div style={{ display: "grid", gap: "0.5rem", maxWidth: 600 }}>
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onRevoke={handleRevoke}
            />
          ))}
        </div>
        {sessions.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            No active sessions found.
          </p>
        ) : null}
      </section>
    </div>
    </div>
  );
}

export default SecurityPanel
