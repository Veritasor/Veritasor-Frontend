

function ApiKeysPanel() {
  return (
    <div>
      <h2>API Keys</h2>
      <p style={{ color: "var(--muted)" }}>
        Create and manage API keys for programmatic access.
      </p>
      <div
        style={{
          padding: "0.9rem 1rem",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface-strong)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 600,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
            Production key
          </div>
          <code style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            vrt_live_••••••••••••3f9a
          </code>
        </div>
        <button
          type="button"
          style={{
            padding: "0.4rem 0.9rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Revoke
        </button>
      </div>
    </div>
  );
}

export default ApiKeysPanel
