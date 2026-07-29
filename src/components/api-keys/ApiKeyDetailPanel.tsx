import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ApiKey } from '../../pages/ApiKeyManagement';

// ─── Helper functions ────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  if (iso === 'Never') return iso;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatRelativeTime(iso: string): string {
  if (iso === 'Never') return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const minutes = Math.floor(diff / 60000);
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Sparkline rendered as a pure-SVG inline chart.
 * Uses a simple bar chart to show daily call volume with
 * a text alternative for screen readers.
 */
function Sparkline({
  data,
  label,
}: {
  data: { date: string; count: number }[];
  label: string;
}) {
  const width = 240;
  const height = 48;
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = Math.max(2, Math.floor(width / data.length) - 1);

  // Build a textual fallback for screen readers
  const textAlt = data
    .map((d) => `${d.date}: ${d.count} calls`)
    .join(', ');

  return (
    <div role="img" aria-label={`${label}: ${textAlt}`}>
      <svg
        aria-hidden="true"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block' }}
      >
        {data.map((d, i) => {
          const barHeight = Math.max(2, (d.count / maxCount) * (height - 2));
          const x = i * (barWidth + 1) + 0.5;
          const y = height - barHeight;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={1}
              fill="currentColor"
              style={{ color: 'inherit' }}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ─── Focus-trap helpers ─────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details>summary',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
  );
}

function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
) {
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusable = getFocusableElements(container!);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, containerRef]);
}

// ─── CopyButton ─────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API not available
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.3rem 0.65rem',
        borderRadius: 6,
        border: '1px solid var(--border, #e4e4e7)',
        background: copied ? 'rgba(52, 211, 153, 0.12)' : 'var(--surface-strong, #f4f4f5)',
        color: copied ? 'var(--success, #10b981)' : 'var(--muted, #71717a)',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontWeight: 600,
        transition: 'background 120ms ease, color 120ms ease',
        flexShrink: 0,
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ─── MetaRow ─────────────────────────────────────────────────────────────────

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'contents' }}>
      <dt
        style={{
          color: 'var(--muted, #71717a)',
          fontSize: '0.85rem',
          paddingTop: '0.05rem',
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          margin: 0,
          fontSize: '0.88rem',
          wordBreak: 'break-all',
        }}
      >
        {children}
      </dd>
    </div>
  );
}

// ─── ApiKeyDetailPanel ───────────────────────────────────────────────────────

export interface ApiKeyDetailPanelProps {
  keyData: ApiKey | null;
  onClose: () => void;
}

export function ApiKeyDetailPanel({
  keyData,
  onClose,
}: ApiKeyDetailPanelProps) {
  const isOpen = keyData !== null;
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(drawerRef, isOpen);

  useLayoutEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Dismiss on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen || !keyData) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(2, 6, 23, 0.6)',
          backdropFilter: 'blur(2px)',
          animation: 'apiKeyDrawerBackdropIn 150ms ease forwards',
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apikey-drawer-title"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 201,
          width: 'min(500px, 95vw)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg, #ffffff)',
          borderLeft: '1px solid var(--border, #e4e4e7)',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'apiKeyDrawerIn 200ms ease forwards',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border, #e4e4e7)',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              id="apikey-drawer-title"
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'var(--text, #18181b)',
              }}
            >
              {keyData.name}
            </h2>
            <p
              style={{
                margin: '0.2rem 0 0',
                fontSize: '0.8rem',
                color: 'var(--muted, #71717a)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {keyData.prefix}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close API key detail panel"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: 8,
              border: '1px solid var(--border, #e4e4e7)',
              background: 'var(--surface-strong, #f4f4f5)',
              color: 'var(--muted, #71717a)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'color 120ms ease, border-color 120ms ease',
            }}
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'grid',
            gap: '1.5rem',
            alignContent: 'start',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border, #e4e4e7) transparent',
            color: 'var(--text, #18181b)',
          }}
        >
          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: '0.82rem',
                color:
                  keyData.status === 'active'
                    ? 'var(--success, #10b981)'
                    : 'var(--muted, #71717a)',
                border: `1px solid ${
                  keyData.status === 'active'
                    ? 'rgba(16, 185, 129, 0.35)'
                    : 'rgba(113, 113, 122, 0.35)'
                }`,
                background:
                  keyData.status === 'active'
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(113, 113, 122, 0.08)',
              }}
            >
              {keyData.status.charAt(0).toUpperCase() + keyData.status.slice(1)}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted, #71717a)' }}>
              Created {formatTimestamp(keyData.createdAt)}
            </span>
          </div>

          {/* Scopes */}
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--muted, #71717a)',
              }}
            >
              Allowed Scopes
            </h3>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {keyData.scopes.map((s) => (
                <span
                  key={s}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.25rem 0.55rem',
                    borderRadius: 999,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    border: '1px solid rgba(94, 234, 212, 0.22)',
                    background: 'rgba(94, 234, 212, 0.08)',
                    color: 'var(--text, #18181b)',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Metadata grid */}
          <div>
            <h3
              style={{
                margin: '0 0 0.75rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--muted, #71717a)',
              }}
            >
              Usage Details
            </h3>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'max-content 1fr',
                gap: '0.5rem 1.25rem',
                margin: 0,
              }}
            >
              <MetaRow label="Key ID">
                <code
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '0.82rem',
                  }}
                >
                  {keyData.id}
                </code>
              </MetaRow>
              <MetaRow label="Created">
                <span>
                  {formatTimestamp(keyData.createdAt)}
                </span>
              </MetaRow>
              <MetaRow label="Last used">
                <span>
                  {formatTimestamp(keyData.lastUsedAt)}
                  <span
                    style={{
                      marginLeft: '0.4rem',
                      fontSize: '0.78rem',
                      color: 'var(--muted, #71717a)',
                    }}
                  >
                    ({formatRelativeTime(keyData.lastUsedAt)})
                  </span>
                </span>
              </MetaRow>
              <MetaRow label="Status">
                <span
                  style={{
                    color:
                      keyData.status === 'active'
                        ? 'var(--success, #10b981)'
                        : 'var(--muted, #71717a)',
                    fontWeight: 600,
                  }}
                >
                  {keyData.status.charAt(0).toUpperCase() +
                    keyData.status.slice(1)}
                </span>
              </MetaRow>
            </dl>
          </div>

          {/* Recent IPs */}
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--muted, #71717a)',
                }}
              >
                Recent Calling IPs
              </h3>
              <CopyButton
                text={keyData.recentIps.join('\n')}
                label="IP list"
              />
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
              }}
            >
              {keyData.recentIps.map((ip, i) => (
                <code
                  key={`${ip}-${i}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.3rem 0.55rem',
                    borderRadius: 6,
                    border: '1px solid var(--border, #e4e4e7)',
                    background: 'var(--surface-strong, #f4f4f5)',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '0.82rem',
                    color: 'var(--text, #18181b)',
                  }}
                >
                  {ip}
                </code>
              ))}
            </div>
          </div>

          {/* Call volume sparkline */}
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--muted, #71717a)',
              }}
            >
              Call Volume (last 14 days)
            </h3>
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm, 8px)',
                border: '1px solid var(--border, #e4e4e7)',
                background: 'var(--surface-strong, #f4f4f5)',
                color: 'var(--accent, #6366f1)',
              }}
            >
              <Sparkline
                data={keyData.callVolume}
                label={`Call volume for ${keyData.name}`}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'var(--muted, #71717a)',
              }}
            >
              <span>
                {keyData.callVolume.length > 0
                  ? keyData.callVolume[0].date
                  : ''}
              </span>
              <span>
                {keyData.callVolume.length > 0
                  ? keyData.callVolume[keyData.callVolume.length - 1].date
                  : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes apiKeyDrawerIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes apiKeyDrawerBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes apiKeyDrawerIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes apiKeyDrawerBackdropIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </>
  );
}
