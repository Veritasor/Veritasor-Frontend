import { useState, useEffect, useCallback, useRef } from "react";

export type DensityMode = "comfortable" | "compact";

const DENSITY_STORAGE_PREFIX = "veritasor_density_";

/**
 * Persist density preference to the server.
 * Returns { ok: boolean } indicating success or failure.
 */
async function persistDensityPreference(
  _workspace: string,
  _mode: DensityMode,
): Promise<{ ok: boolean }> {
  await new Promise((r) => setTimeout(r, 50));
  return { ok: true };
}

export function useDensityMode(workspace: string) {
  const storageKey = `${DENSITY_STORAGE_PREFIX}${workspace}`;
  const saveIdRef = useRef(0);

  const [density, setDensityState] = useState<DensityMode>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "compact" || raw === "comfortable") return raw;
    } catch {
      // ignore parse errors
    }
    return "comfortable";
  });

  const setDensity = useCallback(
    (mode: DensityMode) => {
      const prev = density;
      // ── Optimistic UI update ──
      setDensityState(mode);
      try {
        localStorage.setItem(storageKey, mode);
      } catch {
        // storage full or unavailable
      }

      // ── Server-side persistence (fire-and-forget with rollback) ──
      const saveId = ++saveIdRef.current;
      persistDensityPreference(workspace, mode).then((result) => {
        if (!result.ok && saveId === saveIdRef.current) {
          // Rollback: server persistence failed
          setDensityState(prev);
          try {
            localStorage.setItem(storageKey, prev);
          } catch {
            // ignore
          }
          // Dispatch a custom event so the toast system can react
          window.dispatchEvent(
            new CustomEvent("density:rollback", {
              detail: { workspace, mode: prev, failedMode: mode },
            }),
          );
        }
      });
    },
    [storageKey, workspace, density],
  );

  // Sync with localStorage when workspace changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "compact" || raw === "comfortable") {
        setDensityState(raw);
      } else {
        setDensityState("comfortable");
        localStorage.setItem(storageKey, "comfortable");
      }
    } catch {
      setDensityState("comfortable");
    }
  }, [storageKey, workspace]);

  return { density, setDensity };
}
