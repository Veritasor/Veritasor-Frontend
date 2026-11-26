import DensityToggle from '../../components/DensityToggle'
import { useOptionalWorkspace } from '../../state/workspace'

function AppearancePanel() {
  const workspaceCtx = useOptionalWorkspace()
  const workspace = workspaceCtx?.activeWorkspaceId ?? 'default-workspace'

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h2>Appearance</h2>
        <p style={{ color: "var(--muted)" }}>
          Customise the look and feel of your dashboard.
        </p>
      </div>

      {/* ── Density ───────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gap: "1rem",
          padding: "1.25rem",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface)",
          maxWidth: 600,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>Display density</h3>
          <p
            style={{
              margin: "0.25rem 0 0",
              color: "var(--muted)",
              fontSize: "0.88rem",
            }}
          >
            Control the spacing and information density of data-heavy views.
          </p>
        </div>
        <DensityToggle workspace={workspace} />
        <p
          style={{
            margin: 0,
            color: "var(--muted)",
            fontSize: "0.82rem",
            lineHeight: 1.5,
          }}
        >
          Your preference is saved locally and synced to the cloud when you are
          signed in. Changes take effect immediately.
        </p>
      </div>
    </div>
  )
}

export default AppearancePanel
