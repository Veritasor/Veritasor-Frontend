import { useState, useEffect } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import TopAppBar from "./TopAppBar";
import BottomTabBar from "./BottomTabBar";
import CommandPalette from "./CommandPalette";
import ShortcutsOverlay from "./ShortcutsOverlay";
import { ToastProvider, useToast } from "./ToastContext";
import { useCookieConsent } from "./CookieConsentContext";
import FailedPaymentBanner from "./FailedPaymentBanner";
import { BillingProvider, useBilling } from "./BillingContext";
import ShortcutsOverlay from "./ShortcutsOverlay";
import ContextualHelpSearch from "./ContextualHelpSearch";

function ToastContainer() {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" aria-atomic="false" className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={
            toast.type === "error" || toast.type === "warning"
              ? "alert"
              : "status"
          }
          className={`toast toast-${toast.type}`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            aria-label="Close notification"
            onClick={() => removeToast(toast.id)}
            className="toast-close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Simple offline banner shown when the browser reports no network connection.
 */
function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const setOnline = () => setOffline(false);
    const setOfflineState = () => setOffline(true);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOfflineState);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOfflineState);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "0.6rem 1rem",
        background: "var(--warning-soft, #fef3c7)",
        borderBottom: "1px solid rgba(251, 191, 36, 0.4)",
        textAlign: "center",
        fontSize: "0.9rem",
        fontWeight: 600,
        color: "var(--warning, #d97706)",
      }}
    >
      ⚠ You appear to be offline. Some features may be unavailable.
    </div>
  );
}

const navItems = [
  { path: '/', name: 'Dashboard' },
  { path: '/attestations', name: 'Attestations' },
  { path: '/sources', name: 'Revenue Sources' },
  { path: '/motion-tokens', name: 'Motion Tokens' },
]

function LayoutInner() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [helpSearchOpen, setHelpSearchOpen] = useState(false);
  const { openSettings: openCookieSettings } = useCookieConsent();

  /**
   * Sequential key chord tracker for multi-key shortcuts.
   * Tracks the last key pressed so we can detect Ctrl+K → W.
   */
  const lastKeyRef = useRef<{ key: string; ctrlOrMeta: boolean } | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global keyboard shortcut handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Shift+? — keyboard shortcuts overlay (not in editable fields)
      if (!isEditable && e.shiftKey && e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
        return;
      }

      // Ctrl/Cmd+K — open command palette (not in editable fields)
      if ((e.ctrlKey || e.metaKey) && e.key === "k" && !isEditable) {
        e.preventDefault();

        // Record this chord step so we can detect Ctrl+K → W next
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        lastKeyRef.current = { key: "k", ctrlOrMeta: true };
        chordTimerRef.current = setTimeout(() => {
          lastKeyRef.current = null;
        }, 1500);

        setCmdOpen(true);
        return;
      }

      // W — if the previous chord was Ctrl/Cmd+K, open workspace switcher in search mode
      if (
        !isEditable &&
        e.key === "w" &&
        lastKeyRef.current?.key === "k" &&
        lastKeyRef.current?.ctrlOrMeta
      ) {
        e.preventDefault();
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        lastKeyRef.current = null;
        // Close the command palette if it was opened by Ctrl+K
        setCmdOpen(false);
        setOpenWsSwitcherInSearchMode(true);
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    };
  }, []);

  function toggleSidebar() {
    setSidebarOpen((o) => !o);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <OfflineBanner />

      {/* Sidebar Layout shell */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-6">
        <div className="flex items-center space-x-2 px-2">
          <span className="text-lg font-bold tracking-wider uppercase text-zinc-900 dark:text-white">
            Veritasor
          </span>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <TopAppBar
        onSidebarToggle={toggleSidebar}
        sidebarOpen={sidebarOpen}
        onSearchClick={() => setCmdOpen(true)}
        openWorkspaceSwitcherInSearchMode={openWsSwitcherInSearchMode}
        onWorkspaceSwitcherOpenChange={(open) => {
          // Once TopAppBar confirms the switcher is open, clear the trigger flag
          if (open) setOpenWsSwitcherInSearchMode(false);
        }}
      />

      <div className="app-body">
        <aside
          id="app-sidebar"
          className={`app-sidebar${sidebarOpen ? " app-sidebar-open" : ""}`}
          aria-label="Site navigation"
        >
          <nav aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `sidebar-link${isActive ? " sidebar-link-active" : ""}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/attestations"
              className={({ isActive }) =>
                `sidebar-link${isActive ? " sidebar-link-active" : ""}`
              }
            >
              Attestations
            </NavLink>
            <NavLink
              to="/sources"
              className={({ isActive }) =>
                `sidebar-link${isActive ? " sidebar-link-active" : ""}`
              }
            >
              Revenue Sources
            </NavLink>
            <NavLink to="/motion-tokens" className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
              Motion Tokens
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-cookie-btn"
              onClick={openCookieSettings}
              aria-label="Open cookie settings"
            >
              Cookie settings
            </button>
            <button
              type="button"
              className="sidebar-help-btn"
              onClick={() => setHelpSearchOpen(true)}
              aria-label="Open help search (Ctrl+H)"
            >
              Help &amp; support
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="app-sidebar-overlay"
            aria-hidden="true"
            onClick={closeSidebar}
          />
        )}

        <main id="main-content" tabIndex={-1} className="app-main">
          <BillingBannerSlot />
          <Outlet />
        </main>
      </div>

      <BottomTabBar />
      <ToastContainer />
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ContextualHelpSearch open={helpSearchOpen} onClose={() => setHelpSearchOpen(false)} />
    </div>
  );
}

export default function Layout() {
  return (
    <BillingProvider>
      <ToastProvider>
        <LayoutInner />
      </ToastProvider>
    </BillingProvider>
  );
}
