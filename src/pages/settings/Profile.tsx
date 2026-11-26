import { useEffect } from 'react'
import LocalePickerField from '../../components/LocalePicker/LocalePickerField'
import DirtyStateBanner from '../../components/DirtyStateBanner'
import { useDirtyForm } from '../../hooks/useDirtyForm'
import { useDirtyRegistry } from './dirtyRegistry'

function ProfilePanel() {
  const { register, unregister } = useDirtyRegistry();

  const form = useDirtyForm({
    storageKey: "veritasor_settings_profile_draft",
    initialValues: {
      displayName: "Joel Agboola",
      email: "joel@example.com",
    },
    autoSave: true,
    autoSaveIntervalMs: 3000,
  });

  useEffect(() => {
    register("profile", {
      isDirty: form.isDirty,
      saveStatus: form.saveStatus,
      lastSavedAt: form.lastSavedAt,
      save: form.save,
      reset: form.reset,
    });
    return () => unregister("profile");
  }, [
    register,
    unregister,
    form.isDirty,
    form.saveStatus,
    form.lastSavedAt,
    form.save,
    form.reset,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await form.save();
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <DirtyStateBanner
        isDirty={form.isDirty}
        saveStatus={form.saveStatus}
        lastSavedAt={form.lastSavedAt}
        onSave={form.save}
        onDiscard={form.reset}
        formLabel="Profile"
      />
      <div>
        <h2>Profile</h2>
        <p style={{ color: "var(--muted)" }}>
          Manage your personal information and display name.
        </p>
        <form
          style={{ display: "grid", gap: "1rem", maxWidth: 480 }}
          onSubmit={handleSubmit}
          aria-describedby="profile-sr-status"
        >
          <span id="profile-sr-status" className="sr-only" aria-live="polite" />
          <LocalePickerField />
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label
              htmlFor="settings-display-name"
              style={{ fontSize: "0.9rem", fontWeight: 600 }}
            >
              Display name
            </label>
            <input
              id="settings-display-name"
              type="text"
              value={form.values.displayName}
              onChange={(e) => form.setField("displayName", e.target.value)}
              aria-invalid={false}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: `1px solid ${form.isDirty ? "var(--border-strong)" : "var(--border)"}`,
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
          </div>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label
              htmlFor="settings-email"
              style={{ fontSize: "0.9rem", fontWeight: 600 }}
            >
              Email
            </label>
            <input
              id="settings-email"
              type="email"
              value={form.values.email}
              onChange={(e) => form.setField("email", e.target.value)}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: `1px solid ${form.isDirty ? "var(--border-strong)" : "var(--border)"}`,
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={!form.isDirty || form.saveStatus === "saving"}
              aria-busy={form.saveStatus === "saving"}
              style={{
                alignSelf: "start",
                padding: "0.6rem 1.25rem",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "#04111f",
                fontWeight: 700,
                cursor:
                  !form.isDirty || form.saveStatus === "saving"
                    ? "default"
                    : "pointer",
                fontSize: "0.95rem",
                opacity:
                  !form.isDirty || form.saveStatus === "saving" ? 0.6 : 1,
                minHeight: "2.75rem",
              }}
            >
              {form.saveStatus === "saving" ? "Saving…" : "Save changes"}
            </button>
            {form.isDirty && (
              <button
                type="button"
                onClick={form.reset}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  minHeight: "2.75rem",
                }}
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfilePanel
