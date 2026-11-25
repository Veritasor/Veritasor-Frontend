import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ToastSeverity } from './toastRules';
import {
  addNotification,
  type NotificationCategoryId,
} from '../store/notificationsStore';
import { newId } from '../utils/secureRandom';

export type ToastType = ToastSeverity;

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onUndo?: () => void;
  undoLabel?: string;
  /**
   * Optional grouping key. When set, the toast and any other toasts sharing
   * the same key form a logical group (used by `ToastGroup` for an overflow
   * summary). An empty/missing value places the toast in the default "stack".
   */
  groupId?: string;
  /**
   * Optional item count for stacked/grouped toasts.
   */
  count?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (
    message: string,
    type: ToastType,
    duration?: number,
    onUndo?: () => void,
    undoLabel?: string,
    groupId?: string,
    count?: number,
    category?: NotificationCategoryId,
  ) => string;
  removeToast: (id: string) => void;
  /** Remove the most recent (top) toast — bound to the Escape key. */
  dismissTopToast: () => void;
  /** Remove every toast in the stack at once. */
  dismissAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissTopToast = useCallback(() => {
    setToasts((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)));
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (
      message: string,
      type: ToastType,
      duration?: number,
      onUndo?: () => void,
      undoLabel?: string,
      groupId?: string,
      count?: number,
      category?: NotificationCategoryId,
    ) => {
      const id = newId('toast-');
      setToasts((prev) => [
        ...prev,
        { id, message, type, duration, onUndo, undoLabel, groupId, count },
      ]);
      if (category) {
        addNotification({
          category,
          title: message,
          message,
          severity: type,
        });
      }
      return id;
    },
    [],
  );

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      dismissTopToast,
      dismissAllToasts,
    }),
    [toasts, addToast, removeToast, dismissTopToast, dismissAllToasts],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error(
      'useToast must be used within a ToastProvider. Wrap your tree in ' +
        '<ToastProvider> before mounting any component that calls useToast().',
    );
  }
  return context;
};
