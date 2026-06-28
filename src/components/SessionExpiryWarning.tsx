
import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SessionExpiryWarningProps {
  isOpen: boolean;
  timeLeft: number;
  onExtendSession: () => void;
  onReauth: () => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SessionExpiryWarning = ({
  isOpen,
  timeLeft,
  onExtendSession,
  onReauth,
}: SessionExpiryWarningProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExtendSession();
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
  }, [isOpen, onExtendSession]);

  const handleBackdropClick = () => {
    onExtendSession();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-warning-title"
        aria-describedby="session-warning-desc"
        className="modal-dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="session-warning-title" className="modal-title">
            Your session is about to expire
          </h2>
        </div>

        <div className="modal-body">
          <p id="session-warning-desc" className="modal-description">
            For your security, your session will expire in{' '}
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>
              <span aria-live="assertive" aria-atomic="true">
                {formatTime(timeLeft)}
              </span>
            </span>
            . You can extend your session or re-authenticate to continue.
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={onExtendSession}
          >
            Extend Session
          </button>
          <button
            type="button"
            className="modal-btn modal-btn-confirm"
            onClick={onReauth}
          >
            Re-authenticate Now
          </button>
        </div>
      </div>
    </div>
  );
};

