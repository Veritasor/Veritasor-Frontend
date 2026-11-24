import { useCallback, useEffect, useRef } from "react";

export interface TimeoutHandle {
  schedule: (callback: () => void, delayMs: number) => void;
  clear: () => void;
}

/**
 * Owns a single setTimeout ref, replacing any pending timer when rescheduled
 * and automatically clearing it on unmount.
 */
export function useTimeout(): TimeoutHandle {
  const timerRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(
    (callback: () => void, delayMs: number) => {
      clear();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        callback();
      }, delayMs);
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  return { schedule, clear };
}
