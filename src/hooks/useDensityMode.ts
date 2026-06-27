import { useState, useEffect, useCallback } from "react";

export type DensityMode = "comfortable" | "compact";

const DENSITY_STORAGE_PREFIX = "veritasor_density_";

export function useDensityMode(workspace: string) {
  const storageKey = `${DENSITY_STORAGE_PREFIX}${workspace}`;

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
      setDensityState(mode);
      try {
        localStorage.setItem(storageKey, mode);
      } catch {
        // storage full or unavailable
      }
    },
    [storageKey],
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
