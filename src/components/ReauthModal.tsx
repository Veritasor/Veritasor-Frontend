
import { useEffect, useRef, useState } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ReauthModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  error?: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

export const ReauthModal = ({
  isOpen,
  isLoading = false,
  error = null,
  onSuccess,
  onClose,
}: ReauthModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      setPassword('');
      setTimeout(() => {
        const input = dialogRef.current?.querySelector('#reauth-password');
        if (input instanceof HTMLInputElement) {
          input.focus();
        } else {
          dialogRef.current?.focus();
        }
      }, 0);
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current!.querySelectorAll<HTMLElement>(FOCUSABLE)
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onSuccess();
    }
  };

  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reauth-title"
        aria-describedby="reauth-desc"
        className="modal-dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="reauth-title" className="modal-title">
            Please re-authenticate to continue
          </h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <form id="reauth-form" className="modal-body" onSubmit={handleSubmit}>
          <p id="reauth-desc" className="modal-description">
            Your session has expired or requires re-authentication. Please enter your password to continue.
          </p>

          {error && (
            <p role="alert" className="modal-error" style={{ marginTop: '1rem' }}>
              {error}
            </p>
          )}

          <div className="auth-input-group" style={{ marginTop: '1.5rem' }}>
            <label htmlFor="reauth-password" className="auth-label">
              Password
            </label>
            <input
              id="reauth-password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
              required
            />
          </div>
        </form>

        <div className="modal-footer">
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="reauth-form"
            className="modal-btn modal-btn-confirm"
            disabled={isLoading || !password}
            aria-busy={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

