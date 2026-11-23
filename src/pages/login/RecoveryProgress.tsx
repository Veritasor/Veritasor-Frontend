import type { RecoveryStep } from "./loginMachine";

export default function RecoveryProgress({
  current,
}: {
  current: RecoveryStep;
}) {
  const uniqueSteps = [
    { key: "choose-path", label: "Choose recovery path", idx: 0 },
    { key: "verify", label: "Verify identity", idx: 1 },
    { key: "reenroll", label: "Set new method", idx: 2 },
    { key: "complete", label: "Complete", idx: 3 },
  ];

  const mapStepToLogical = (step: RecoveryStep): number => {
    switch (step) {
      case "choose-path":
        return 0;
      case "recovery-code-entry":
      case "recovery-code-success":
      case "support-verify":
        return 1;
      case "reenroll-method":
        return 2;
      case "complete":
        return 3;
    }
  };

  const logical = mapStepToLogical(current);

  return (
    <nav
      role="navigation"
      aria-label="MFA recovery progress"
      style={{
        display: "grid",
        gap: "0.75rem",
      }}
    >
      <ol
        role="list"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "0.35rem",
        }}
      >
        {uniqueSteps.map((s, i) => {
          const isComplete = i < logical;
          const isCurrent = i === logical;
          return (
            <li
              key={s.key}
              style={{
                display: "grid",
                gap: "0.35rem",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "1.75rem",
                    height: "1.75rem",
                    minWidth: "1.75rem",
                    borderRadius: 999,
                    border: `1.5px solid ${
                      isComplete || isCurrent
                        ? "var(--border-strong)"
                        : "var(--border)"
                    }`,
                    background: isComplete
                      ? "var(--accent)"
                      : isCurrent
                        ? "rgba(94, 234, 212, 0.08)"
                        : "transparent",
                    color: isComplete
                      ? "#04111f"
                      : isCurrent
                        ? "var(--accent)"
                        : "var(--muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    transition: "all 180ms ease",
                  }}
                >
                  {isComplete ? "✓" : i + 1}
                </span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: isCurrent ? 700 : 600,
                    color: isCurrent
                      ? "var(--text)"
                      : isComplete
                        ? "var(--text)"
                        : "var(--muted)",
                    whiteSpace: "nowrap" as const,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < uniqueSteps.length - 1 && (
                <div
                  aria-hidden="true"
                  style={{
                    marginLeft: "0.875rem",
                    height: 3,
                    borderRadius: 999,
                    background: isComplete
                      ? "var(--accent)"
                      : "rgba(148, 163, 184, 0.2)",
                    transition: "background-color 180ms ease",
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
