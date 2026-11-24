import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotifications,
  type InAppNotification,
  type NotificationSeverity,
} from "../store/notificationsStore";

const SEVERITY_DOT_COLOR: Record<NotificationSeverity, string> = {
  info: "var(--primary, #60a5fa)",
  success: "var(--success, #34d399)",
  warning: "var(--warning, #fbbf24)",
  error: "var(--danger, #fb7185)",
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelectNotification(item: InAppNotification) {
    markAsRead(item.id);
    if (item.actionHref) {
      setOpen(false);
      navigate(item.actionHref);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        className="notifications-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="notifications-popover"
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: "var(--radius-sm, 8px)",
          border: "1px solid var(--border)",
          background: "var(--surface-strong)",
          color: "var(--text)",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span
            data-testid="notifications-unread-badge"
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-0.3rem",
              right: "-0.3rem",
              minWidth: "1.15rem",
              height: "1.15rem",
              padding: "0 0.25rem",
              borderRadius: "999px",
              background: "var(--danger, #ef4444)",
              color: "#ffffff",
              fontSize: "0.68rem",
              fontWeight: 800,
              lineHeight: "1.15rem",
              textAlign: "center",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          id="notifications-popover"
          role="region"
          aria-label="Notifications"
          className="disclosure-menu disclosure-menu-right"
          style={{
            width: "22rem",
            maxWidth: "calc(100vw - 2rem)",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 0.9rem",
              borderBottom: "1px solid var(--border)",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <strong style={{ fontSize: "0.92rem" }}>Notifications</strong>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "0.1rem 0.45rem",
                    borderRadius: "999px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              style={{
                background: "transparent",
                border: "none",
                color: unreadCount === 0 ? "var(--muted)" : "var(--accent)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: unreadCount === 0 ? "default" : "pointer",
                opacity: unreadCount === 0 ? 0.55 : 1,
                padding: "0.2rem 0.4rem",
              }}
            >
              Mark all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <div
              style={{
                padding: "1.5rem 1rem",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "0.88rem",
              }}
            >
              No notifications yet.
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                maxHeight: "20rem",
                overflowY: "auto",
              }}
            >
              {notifications.map((item) => (
                <li
                  key={item.id}
                  data-unread={item.read ? "false" : "true"}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.6rem",
                    padding: "0.75rem 0.9rem",
                    borderBottom: "1px solid var(--border)",
                    background: item.read
                      ? "transparent"
                      : "rgba(94, 234, 212, 0.06)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "50%",
                      marginTop: "0.4rem",
                      flexShrink: 0,
                      background: item.read
                        ? "transparent"
                        : SEVERITY_DOT_COLOR[item.severity],
                      border: item.read
                        ? "1px solid var(--border)"
                        : "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSelectNotification(item)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: item.read ? 500 : 700,
                        fontSize: "0.86rem",
                        color: "var(--text)",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--muted)",
                        marginTop: "0.15rem",
                      }}
                    >
                      {item.message}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--muted)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {formatTimestamp(item.createdAt)}
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`Dismiss notification: ${item.title}`}
                    onClick={() => dismissNotification(item.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      padding: "0.15rem 0.35rem",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div
            style={{
              padding: "0.6rem 0.9rem",
              borderTop: "1px solid var(--border)",
              textAlign: "center",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/settings#notifications");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Notification preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
