import { useDensityMode } from "../hooks/useDensityMode";

export interface DensityToggleProps {
  workspace: string;
}

export default function DensityToggle({ workspace }: DensityToggleProps) {
  const { density, setDensity } = useDensityMode(workspace);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.25rem 0.5rem",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-soft)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "var(--muted)",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          marginRight: "0.25rem",
        }}
      >
        Density
      </span>
      <button
        type="button"
        onClick={() => setDensity("comfortable")}
        aria-pressed={density === "comfortable"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "2.5rem",
          minHeight: "2rem",
          padding: "0.25rem 0.5rem",
          borderRadius: "calc(var(--radius-sm) - 0.25rem)",
          border: "1px solid transparent",
          background:
            density === "comfortable" ? "var(--surface-strong)" : "transparent",
          color: density === "comfortable" ? "var(--text)" : "var(--muted)",
          fontWeight: 600,
          fontSize: "0.82rem",
          cursor: "pointer",
          transition:
            "background-color 120ms ease, color 120ms ease, border-color 120ms ease",
        }}
      >
        Comfortable
      </button>
      <button
        type="button"
        onClick={() => setDensity("compact")}
        aria-pressed={density === "compact"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "2.5rem",
          minHeight: "2rem",
          padding: "0.25rem 0.5rem",
          borderRadius: "calc(var(--radius-sm) - 0.25rem)",
          border: "1px solid transparent",
          background:
            density === "compact" ? "var(--surface-strong)" : "transparent",
          color: density === "compact" ? "var(--text)" : "var(--muted)",
          fontWeight: 600,
          fontSize: "0.82rem",
          cursor: "pointer",
          transition:
            "background-color 120ms ease, color 120ms ease, border-color 120ms ease",
        }}
      >
        Compact
      </button>
    </div>
  );
}
