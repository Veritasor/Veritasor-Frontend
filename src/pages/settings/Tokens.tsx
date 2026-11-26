import TokensExport from '../../components/tokens/TokensExport'
import TokensDiffViewer from '../../components/tokens/TokensDiffViewer'

function TokensPanel() {
  return (
    <div>
      <h2>Design tokens</h2>
      <p style={{ color: "var(--muted)" }}>
        Review theme changes, then export a snapshot of Veritasor design tokens as CSS custom properties.
      </p>
      <div style={{ marginTop: "1.5rem", maxWidth: 1100, display: "grid", gap: "1.5rem" }}>
        <TokensDiffViewer />
        <TokensExport />
      </div>
    </div>
  );
}

export default TokensPanel
