import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onUndo?: () => void;
  undoLabel?: string;
}

// ─── Stacking rules ─────────────────────────────────────────────────────
// Max individual toasts visible before collapsing into a group summary.
export const MAX_VISIBLE_TOASTS = 3;

// ─── Auto-dismiss cadence per severity (milliseconds) ───────────────────
export const DISMISS_DURATIONS: Record<ToastType, number> = {
  success: 5000,
  info: 5000,
  warning: 0, // persists indefinitely
  error: 0, // persists indefinitely
};

export const DEFAULT_UNDO_DURATION = 8000;

interface ToastContextValue {
  toasts: Toast[];
  addToast: (
    message: string,
    type: ToastType,
    duration?: number,
    onUndo?: () => void,
    undoLabel?: string
  ) => void;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
  removeToastsByIds: (ids: string[]) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const removeToastsByIds = useCallback((ids: string[]) => {
    setToasts((prev) => prev.filter((toast) => !ids.includes(toast.id)));
  }, []);

  const addToast = useCallback(
    (
      message: string,
      type: ToastType,
      duration?: number,
      onUndo?: () => void,
      undoLabel?: string
    ) => {
      const id = Math.random().toString(36).substring(2, 9);
      // Default duration based on severity if not specified
      const resolvedDuration =
        duration !== undefined ? duration : DISMISS_DURATIONS[type];
      setToasts((prev) => [
        ...prev,
        { id, message, type, duration: resolvedDuration, onUndo, undoLabel },
      ]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, removeAllToasts, removeToastsByIds }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a no-op fallback when used outside a provider (e.g. in isolated tests)
    return {
      toasts: [] as Toast[],
      addToast: () => {},
      removeToast: () => {},
      removeAllToasts: () => {},
      removeToastsByIds: (_ids: string[]) => {},
    };
  }
  return context;
};
