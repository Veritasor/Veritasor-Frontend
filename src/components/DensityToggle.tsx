import { type CSSProperties } from "react";
import { useDensityMode, type DensityMode } from "../hooks/useDensityMode";

export interface DensityToggleProps {
  workspace: string;
}

const DENSITY_CONFIG: {
  key: DensityMode;
  label: string;
  description: string;
}[] = [
  {
    key: "comfortable",
    label: "Comfortable",
    description: "Larger padding, generous spacing",
  },
  {
    key: "compact",
    label: "Compact",
    description: "Tighter rows, more content per view",
  },
];

function DensityPreview({ mode, selected }: { mode: DensityMode; selected: boolean }) {
  const gap = mode === "comfortable" ? 3 : 1.5;
  const h = mode === "comfortable" ? 6 : 4;
  const br = mode === "comfortable" ? 2.5 : 1.5;

  const box: CSSProperties = {
    height: h,
    borderRadius: br,
    background: selected
      ? "var(--accent, #06b6d4)"
      : "var(--border, rgba(148,163,184,0.25))",
    transition: "all 0.2s ease",
  };

  return (
    <svg
      aria-hidden={true}
      width="100%"
      height="48"
      viewBox="0 0 120 48"
      style={{ display: "block" }}
    >
      {/* Row 1 */}
      <rect x="0" y={0} width="72" height={h} rx={br} fill={box.background} />
      <rect x={78} y={0} width="42" height={h} rx={br} fill={box.background} opacity={0.5} />
      {/* Row 2 */}
      <rect x="0" y={h + gap} width="52" height={h} rx={br} fill={box.background} />
      <rect x={58} y={h + gap} width="62" height={h} rx={br} fill={box.background} opacity={0.5} />
      {/* Row 3 */}
      <rect x="0" y={2 * (h + gap)} width="90" height={h} rx={br} fill={box.background} />
      <rect x={96} y={2 * (h + gap)} width="24" height={h} rx={br} fill={box.background} opacity={0.5} />
    </svg>
  );
}

export default function DensityToggle({ workspace }: DensityToggleProps) {
  const { density, setDensity } = useDensityMode(workspace);

  return (
    <div
      role="radiogroup"
      aria-label="Display density"
      style={{
        display: "flex",
        gap: "0.75rem",
      }}
    >
      {DENSITY_CONFIG.map((cfg) => {
        const selected = density === cfg.key;
        return (
          <button
            key={cfg.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${cfg.label} — ${cfg.description}`}
            onClick={() => setDensity(cfg.key)}
            style={{
              flex: "1 1 0",
              minWidth: 140,
              display: "grid",
              gap: "0.5rem",
              padding: "0.75rem",
              borderRadius: 12,
              border: `1px solid ${
                selected ? "var(--border-strong, rgba(125,211,252,0.4))" : "var(--border, rgba(148,163,184,0.2))"
              }`,
              background: selected
                ? "rgba(94, 234, 212, 0.08)"
                : "transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            <DensityPreview mode={cfg.key} selected={selected} />

            <div style={{ display: "grid", gap: "0.15rem" }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: selected ? "var(--text, #f4f7fb)" : "var(--muted, #9fb0c7)",
                }}
              >
                {cfg.label}
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--muted, #9fb0c7)",
                  lineHeight: 1.3,
                }}
              >
                {cfg.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
