import { useCallback, useEffect, useRef, useState } from 'react'
import DirtyStateBanner from '../../components/DirtyStateBanner'
import { type SaveStatus } from '../../hooks/useDirtyForm'
import { NOTIFICATION_CATEGORIES, CHANNEL_META, useNotifications, type NotificationChannel } from '../../store/notificationsStore'
import { useDirtyRegistry } from './dirtyRegistry'

const NOTIFICATION_CHANNELS: NotificationChannel[] = ["email", "inapp", "webhook"];

function NotificationsPanel() {
  const { register, unregister } = useDirtyRegistry();
  const { preferences, setPreference, setPreferences, resetPreferences } =
    useNotifications();
  const initialSnapshotRef = useRef(preferences);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const save = useCallback(async () => {
    setSaveStatus("saving");
    initialSnapshotRef.current = preferences;
    setIsDirty(false);
    setSaveStatus("saved");
    setLastSavedAt(new Date());
  }, [preferences]);

  const reset = useCallback(() => {
    setPreferences(initialSnapshotRef.current);
    setIsDirty(false);
    setSaveStatus("idle");
  }, [setPreferences]);

  useEffect(() => {
    register("notifications", {
      isDirty,
      saveStatus,
      lastSavedAt,
      save,
      reset,
    });
    return () => unregister("notifications");
  }, [
    register,
    unregister,
    isDirty,
    saveStatus,
    lastSavedAt,
    save,
    reset,
  ]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <DirtyStateBanner
        isDirty={isDirty}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onSave={save}
        onDiscard={reset}
        formLabel="Notifications"
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2>Notifications</h2>
          <p style={{ color: "var(--muted)" }}>
            Choose which events trigger email, in-app bell, and webhook notifications.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetPreferences();
            setIsDirty(true);
            setSaveStatus("dirty");
          }}
          style={{
            padding: "0.45rem 0.85rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          Reset to defaults
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 480,
          }}
        >
          <thead>
            <tr>
              <th
                scope="col"
                style={{
                  textAlign: "left",
                  padding: "0.65rem 0.75rem",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--muted)",
                }}
              >
                Event
              </th>
              {NOTIFICATION_CHANNELS.map((ch) => (
                <th
                  key={ch}
                  scope="col"
                  title={CHANNEL_META[ch].help}
                  style={{
                    textAlign: "center",
                    padding: "0.65rem 0.75rem",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "0.78rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span aria-hidden="true" style={{ marginRight: "0.3rem" }}>
                    {CHANNEL_META[ch].icon}
                  </span>
                  {CHANNEL_META[ch].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_CATEGORIES.map((cat) => (
              <tr
                key={cat.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td style={{ padding: "0.75rem" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                    {cat.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--muted)",
                      marginTop: "0.15rem",
                    }}
                  >
                    {cat.description}
                  </div>
                </td>
                {NOTIFICATION_CHANNELS.map((ch) => {
                  const checked = preferences[cat.id]?.[ch] ?? cat.defaults[ch];
                  return (
                    <td
                      key={ch}
                      style={{
                        textAlign: "center",
                        padding: "0.75rem",
                        verticalAlign: "middle",
                      }}
                    >
                      <input
                        id={`notif-${cat.id}-${ch}`}
                        type="checkbox"
                        checked={checked}
                        aria-label={`${cat.title} — ${CHANNEL_META[ch].label}`}
                        onChange={(e) => {
                          setPreference(cat.id, ch, e.target.checked);
                          setIsDirty(true);
                          setSaveStatus("dirty");
                        }}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default NotificationsPanel
