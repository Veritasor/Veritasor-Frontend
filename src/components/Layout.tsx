import { useEffect, useState, useRef, useCallback } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import TopAppBar from "./TopAppBar";
import BottomTabBar from "./BottomTabBar";
import { ToastProvider } from "./ToastContext";
import OfflineBanner from "./OfflineBanner";
import { BillingProvider, useBilling } from "./BillingContext";
import ToastContainer from "./ToastContainer";
import ShortcutsOverlay from "./ShortcutsOverlay";
import ContextualHelpSearch from "./ContextualHelpSearch";
import CommandPalette from "./CommandPalette";

function BillingBannerSlot() {
  const { failedPayment, dismissFailedPayment } = useBilling();
  if (!failedPayment) return null;
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
        background: "var(--danger-soft, #fef2f2)",
        borderBottom: "1px solid rgba(251, 113, 133, 0.4)",
        textAlign: "center",
        fontSize: "0.9rem",
        fontWeight: 600,
        color: "var(--danger, #e11d48)",
      }}
    >
      <span>
        ⚠ A recent payment failed.{' '}
        <button
          type="button"
          onClick={dismissFailedPayment}
          style={{
            background: "none",
            border: "none",
            color: "inherit",
            fontWeight: 700,
            cursor: "pointer",
            textDecoration: "underline",
            fontSize: "inherit",
            fontFamily: "inherit",
          }}
        >
          Update payment method
        </button>
      </span>
    </div>
  );
}

function LayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpSearchOpen, setHelpSearchOpen] = useState(false);
  const [openWsSwitcherInSearchMode, setOpenWsSwitcherInSearchMode] = useState(false);

  const cmdTriggerRef = useRef<HTMLElement | null>(null);

  const openCommandPalette = useCallback(() => {
    cmdTriggerRef.current = document.activeElement as HTMLElement | null;
    setCmdOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCmdOpen(false);
    cmdTriggerRef.current?.focus();
  }, []);

  const handleWorkspaceJump = useCallback(() => {
    setOpenWsSwitcherInSearchMode(true);
  }, []);

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
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K") && !isEditable) {
        e.preventDefault();

        // Record this chord step so we can detect Ctrl+K → W next
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        lastKeyRef.current = { key: "k", ctrlOrMeta: true };
        chordTimerRef.current = setTimeout(() => {
          lastKeyRef.current = null;
        }, 1500);

        openCommandPalette();
        return;
      }

      // W — if the previous chord was Ctrl/Cmd+K, open workspace switcher in search mode
      if (
        !isEditable &&
        (e.key === "w" || e.key === "W") &&
        lastKeyRef.current?.key === "k" &&
        lastKeyRef.current?.ctrlOrMeta
      ) {
        e.preventDefault();
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        lastKeyRef.current = null;
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
  }, [openCommandPalette]);

  function toggleSidebar() {
    setSidebarOpen((o) => !o);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="vt-shell">
      <OfflineBanner />
      <TopAppBar
        onSidebarToggle={toggleSidebar}
        sidebarOpen={sidebarOpen}
        onSearchClick={openCommandPalette}
        openWorkspaceSwitcherInSearchMode={openWsSwitcherInSearchMode}
        onWorkspaceSwitcherOpenChange={(open) => {
          if (!open) {
            setOpenWsSwitcherInSearchMode(false);
          }
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
              to="/dashboard"
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
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-cookie-btn"
              onClick={() => navigate('/consent-preferences')}
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
            <a
              className="sidebar-help-btn sidebar-github"
              href="https://github.com/Veritasor/Veritasor-Frontend"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
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
      <CommandPalette
        isOpen={cmdOpen}
        onClose={closeCommandPalette}
        onWorkspaceJump={handleWorkspaceJump}
      />
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
