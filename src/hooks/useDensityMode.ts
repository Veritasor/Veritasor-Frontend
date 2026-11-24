import { useState, useLayoutEffect, useCallback, useRef } from "react";
import { useFunctionalConsentGrant } from "../state/cookieConsent";
import { useOptionalWorkspace } from "../state/workspace";
import {
  DENSITY_STORAGE_PREFIX,
  readConsentStorage,
  writeConsentStorage,
} from "../utils/consentStorage";

export type DensityMode = "comfortable" | "compact";

const DENSITY_STORAGE_PREFIX = "veritasor_density_";
const API_BASE = "/api/v1/preferences/density";
const API_BASE = "/v1/preferences/density";

export interface UseDensityModeOptions {
  /** Called when server persistence fails — use for toast notification */
  onPersistError?: (message: string) => void;
}

/**
 * useDensityMode — manages density preference with optimistic server persistence.
 *
 * 1. Updates localStorage and React state immediately (optimistic).
 * 2. Fires PUT /api/v1/preferences/density to persist on the server.
 * 3. On success: no additional UI change needed.
 * 4. On failure: reverts to the previous value and calls onPersistError.
 *
 * Also reads from GET /api/v1/preferences/density on initial load (after
 * reading localStorage as the fast default).
 */
function isDensityMode(value: unknown): value is DensityMode {
  return value === "compact" || value === "comfortable";
}

function readDensity(key: string, grant?: AbortSignal): DensityMode {
  const saved = readConsentStorage(key, grant);
  return isDensityMode(saved) ? saved : "comfortable";
}

type DensitySync = {
  controller: AbortController;
  confirmed: DensityMode;
  revision: number;
  pending?: Promise<void>;
};

type DensityScope = {
  storageKey: string;
  grant?: AbortSignal;
  sync?: DensitySync;
};

export function useDensityMode(
  workspace?: string,
  options: UseDensityModeOptions = {},
) {
  const grant = useFunctionalConsentGrant();
  const workspaceCtx = useOptionalWorkspace();
  const effectiveWorkspace =
    workspace ?? workspaceCtx?.activeWorkspaceId ?? "default";
  const storageKey = `${DENSITY_STORAGE_PREFIX}${effectiveWorkspace}`;
  const onPersistErrorRef = useRef(options.onPersistError);
  onPersistErrorRef.current = options.onPersistError;
  const scopeRef = useRef<DensityScope>();

  const [density, setDensityState] = useState(() => readDensity(storageKey, grant));

  useLayoutEffect(() => {
    const scope: DensityScope = { storageKey, grant };
    scopeRef.current = scope;
    const initial = readDensity(storageKey, grant);
    setDensityState(initial);
    if (!grant || grant.aborted) {
      return () => { scopeRef.current = undefined; };
    }

    const controller = new AbortController();
    const { signal } = controller;
    const sync: DensitySync = { controller, confirmed: initial, revision: 0 };
    scope.sync = sync;
    const abort = () => controller.abort();
    grant.addEventListener("abort", abort, { once: true });

    async function loadDensity() {
      try {
        const response = await fetch(`${API_BASE}?workspace=${encodeURIComponent(effectiveWorkspace)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (signal.aborted || sync.revision !== 0 || !isDensityMode(data?.density)) return;
        sync.confirmed = data.density;
        setDensityState(data.density);
        writeConsentStorage(storageKey, data.density, grant);
      } catch {
        // Keep the local preference when the server is unavailable.
      }
    }

    void loadDensity();
    return () => {
      grant.removeEventListener("abort", abort);
      abort();
      scopeRef.current = undefined;
    };
  }, [storageKey, effectiveWorkspace, grant]);

  const setDensity = useCallback(
    (mode: DensityMode) => {
      const scope = scopeRef.current;
      if (!scope || scope.storageKey !== storageKey || scope.grant !== grant || grant?.aborted) return;
      setDensityState(mode);
      const { sync } = scope;
      if (!grant || !sync) return;

      // 2. API persistence (fire-and-forget with rollback)
      request(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: effectiveWorkspace, density: mode }),
      })
        .then(async (res) => {
          if (!res.ok) {
            // 3. Rollback on failure
            setDensityState(validatedPrevious);
            try {
              localStorage.setItem(storageKey, validatedPrevious);
            } catch {
              // ignore
            }
            onPersistErrorRef.current?.(
              "Could not save density preference. Changes reverted.",
            );
          }
          // On success, do nothing — optimistic update is already applied
        })
        .catch(() => {
          // Network error — rollback
          setDensityState(validatedPrevious);
          try {
            localStorage.setItem(storageKey, validatedPrevious);
          } catch {
            // ignore
          }
      const { signal } = sync.controller;
      const revision = ++sync.revision;
      writeConsentStorage(storageKey, mode, grant);

      const persist = async () => {
        if (signal.aborted) return;
        let saved = false;
        try {
          const response = await fetch(API_BASE, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspace: effectiveWorkspace, density: mode }),
            signal,
          });
          saved = response.ok;
        } catch {
          // Network failures use the same rollback as unsuccessful responses.
        }

        if (signal.aborted) return;
        if (saved) {
          sync.confirmed = mode;
        } else if (revision === sync.revision) {
          setDensityState(sync.confirmed);
          writeConsentStorage(storageKey, sync.confirmed, grant);
          onPersistErrorRef.current?.(
            "Could not save density preference. Changes reverted.",
          );
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === "ABORTED") return;
        // Server unavailable — keep localStorage value
      });
      };

      // Serialize saves so an older PUT cannot overwrite the latest selection.
      const pending = sync.pending ? sync.pending.then(persist) : persist();
      sync.pending = pending;
      const clearPending = () => {
        if (sync.pending === pending) sync.pending = undefined;
      };
      void pending.then(clearPending, clearPending);
    },
    [effectiveWorkspace, storageKey, grant],
  );

  return { density, setDensity };
}
