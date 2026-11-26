import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'
import {
  DirtyRegistryProvider,
  usePageDirtyState,
  type DirtyRegistryCtx,
  type DirtyTabEntry,
  type TabId,
} from './dirtyRegistry'

type LeaveAction = { kind: "external" } | { kind: "tab"; target: TabId };

type TabDefinition = { id: TabId; label: string }

export interface SettingsShellProps {
  tabs: readonly TabDefinition[]
  panels: Record<TabId, () => JSX.Element>
  getTabFromHash: (hash: string) => TabId
}

function leaveActionToText(
  action: LeaveAction,
  tabs: readonly TabDefinition[],
): string {
  if (action.kind === "external") return "this page";
  const label = tabs.find((t) => t.id === action.target)?.label;
  return `the ${label ?? action.target} section`;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export default function SettingsShell({
  tabs,
  panels,
  getTabFromHash,
}: SettingsShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Map<TabId, DirtyTabEntry>>(() => new Map());
  const register = useCallback((tab: TabId, entry: DirtyTabEntry) => {
    setEntries((current) => new Map(current).set(tab, entry));
  }, []);
  const unregister = useCallback((tab: TabId) => {
    setEntries((current) => {
      if (!current.has(tab)) return current;
      const next = new Map(current);
      next.delete(tab);
      return next;
    });
  }, []);
  const registry = useMemo<DirtyRegistryCtx>(
    () => ({ entries, register, unregister }),
    [entries, register, unregister],
  );
  const pageState = usePageDirtyState(registry);
  const blocker = useBlocker(pageState.anyDirty);
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    getTabFromHash(location.hash),
  );
  const [pendingLeave, setPendingLeave] = useState<LeaveAction | null>(null);
  const [leaveSaveError, setLeaveSaveError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const srAnnounceRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const cancelLeave = useCallback(() => {
    setPendingLeave(null);
    if (blocker.state === "blocked") blocker.reset();
    setLeaveSaveError(null);
  }, [blocker]);

  useEffect(() => {
    if (blocker.state === "blocked") {
      const nextLocation = blocker.location;
      const target = nextLocation.pathname === location.pathname
        ? getTabFromHash(nextLocation.hash)
        : null;
      setPendingLeave(
        target && target !== activeTab
          ? { kind: "tab", target }
          : { kind: "external" },
      );
      if (srAnnounceRef.current) {
        srAnnounceRef.current.textContent =
          "Warning: you have unsaved changes. A dialog is open to confirm leaving the page.";
      }
    }
  }, [blocker, location.pathname, activeTab, getTabFromHash]);

  useEffect(() => {
    if (pendingLeave !== null) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      queueMicrotask(() => dialogRef.current?.focus());
    } else if (prevFocusRef.current) {
      const el = prevFocusRef.current;
      queueMicrotask(() => el.focus());
      prevFocusRef.current = null;
    }
  }, [pendingLeave]);

  useEffect(() => {
    if (pendingLeave === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelLeave();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingLeave, cancelLeave]);

  async function saveAllAndLeave(action: LeaveAction) {
    setLeaveSaveError(null);
    try {
      await pageState.saveAll();
    } catch (error) {
      setLeaveSaveError(
        error instanceof Error ? error.message : "Unable to save your changes.",
      );
      return;
    }
    setPendingLeave(null);
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else if (action.kind === "tab") {
      setActiveTab(action.target);
      navigate(`/settings#${action.target}`, { replace: true });
    }
    setLeaveSaveError(null);
  }

  function discardAndLeave(action: LeaveAction) {
    pageState.discardAll();
    setPendingLeave(null);
    setLeaveSaveError(null);
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else if (action.kind === "tab") {
      setActiveTab(action.target);
      navigate(`/settings#${action.target}`, { replace: true });
    }
  }

  // ── Sync tab with hash ────────────────────────────────────────────────

  useEffect(() => {
    const next = getTabFromHash(location.hash);
    if (next !== activeTab && pageState.anyDirty) {
      const was = history.state;
      history.replaceState(was, "", `#${activeTab}`);
      setPendingLeave({ kind: "tab", target: next });
      if (srAnnounceRef.current) {
        srAnnounceRef.current.textContent = `Warning: you have unsaved changes. Confirm switching to ${leaveActionToText(
          { kind: "tab", target: next },
          tabs,
        )}.`;
      }
    } else if (next !== activeTab) {
      setActiveTab(next);
    }
  }, [location.hash, activeTab, pageState.anyDirty, getTabFromHash, tabs]);

  useEffect(() => {
    if (!sheetOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheetOpen(false)
        document.getElementById('settings-sheet-trigger')?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [sheetOpen])

  const selectTab = useCallback(
    (id: TabId) => {
      if (id === activeTab) return;
      if (pageState.anyDirty) {
        setPendingLeave({ kind: "tab", target: id });
        if (srAnnounceRef.current) {
          const label = tabs.find((t) => t.id === id)?.label;
          srAnnounceRef.current.textContent = `Warning: you have unsaved changes. Confirm switching to the ${label} section.`;
        }
      } else {
        setActiveTab(id);
        navigate(`/settings#${id}`, { replace: true });
      }
    },
    [activeTab, navigate, pageState.anyDirty, tabs],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let next = currentIndex;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        next = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        next = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        next = tabs.length - 1;
      } else {
        return;
      }
      tabRefs.current[next]?.focus();
      selectTab(tabs[next].id);
    },
    [selectTab, tabs],
  );

  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? 'Settings'
  const dirtyTabLabels: string[] = [];
  const Panel = panels[activeTab]

  return (
    <DirtyRegistryProvider value={registry}>
      <div>
        <div
          ref={srAnnounceRef}
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          tabIndex={-1}
          className="sr-only"
        />
        <h1 style={{ marginTop: 0 }}>Settings</h1>

      {/* Mobile: bottom-sheet trigger */}
      <button
        id="settings-sheet-trigger"
        type="button"
        className="settings-tab-select"
        aria-haspopup="listbox"
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen(true)}
        style={{
          width: "100%",
          padding: "0.6rem 0.8rem",
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface-strong)',
          color: 'var(--text)',
          fontSize: '0.95rem',
          marginBottom: '1.5rem',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{activeLabel}</span>
        <span aria-hidden="true" style={{ fontSize: '0.8rem' }}>▼</span>
      </button>

      {/* Bottom sheet */}
      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Settings sections"
          ref={sheetRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div
            aria-hidden="true"
            onClick={() => setSheetOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
          />
          <div
            style={{
              position: 'relative',
              background: 'var(--surface)',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: '1rem 0 2rem',
              maxHeight: '70vh',
              overflowY: 'auto',
              animation: 'slideUp 0.2s ease-out',
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: 'var(--border)',
                borderRadius: 2,
                margin: '0 auto 1rem',
              }}
            />
            <ul role="listbox" aria-label="Settings sections" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tabs.map((tab) => (
                <li key={tab.id} role="option" aria-selected={tab.id === activeTab}>
                  <button
                    type="button"
                    onClick={() => { selectTab(tab.id); setSheetOpen(false) }}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1.2rem',
                      border: 'none',
                      background: tab.id === activeTab ? 'var(--surface-strong)' : 'transparent',
                      color: tab.id === activeTab ? 'var(--accent)' : 'var(--text)',
                      fontSize: '1rem',
                      fontWeight: tab.id === activeTab ? 600 : 400,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Desktop: tablist */}
        <div
          role="tablist"
          aria-label="Settings tabs"
          className="settings-tablist"
          style={{
            display: "flex",
            gap: "0",
            borderBottom: "2px solid var(--border)",
            marginBottom: "1.5rem",
            overflowX: "auto",
          }}
        >
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab;
            const dirty = registry.entries.get(tab.id)?.isDirty ?? false;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                type="button"
                onClick={() => selectTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                style={{
                  padding: "0.6rem 1.1rem",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  marginBottom: -2,
                  color: isActive ? "var(--accent)" : "var(--muted)",
                  fontWeight: isActive ? 700 : 400,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "color 0.15s, border-color 0.15s",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {tab.label}
                  {dirty && (
                    <span
                      aria-hidden="true"
                      title="Unsaved changes"
                      style={{
                        width: "0.45rem",
                        height: "0.45rem",
                        borderRadius: "50%",
                        background: "var(--warning)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {dirty && <span className="sr-only">unsaved changes</span>}
                </span>
              </button>
            );
          })}
        </div>

        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              hidden={!isActive}
              tabIndex={0}
            >
              {isActive && <Panel />}
            </div>
          );
        })}
      </div>

      {pendingLeave !== null && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- backdrop click cancels leave; Escape key is handled via keydown listener
        <div
          className="modal-backdrop"
          onClick={cancelLeave}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- stops click propagation from dialog to backdrop */}
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-warning-title"
            aria-describedby="leave-warning-desc leave-warning-tabs"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "0 24px 48px rgba(2, 6, 23, 0.5)",
              padding: "1.25rem 1.25rem 1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "50%",
                    background: "var(--warning-soft)",
                    border: "1px solid rgba(251, 191, 36, 0.4)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--warning)",
                    fontWeight: 800,
                    fontSize: "1rem",
                  }}
                >
                  !
                </span>
                <h2
                  id="leave-warning-title"
                  style={{ margin: 0, fontSize: "1.05rem" }}
                >
                  Leave with unsaved changes?
                </h2>
              </div>
              <button
                type="button"
                onClick={cancelLeave}
                aria-label="Close dialog, stay on page"
                title="Press Escape to dismiss"
                style={{
                  minWidth: "2.25rem",
                  minHeight: "2.25rem",
                  padding: "0.3rem",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <p
              id="leave-warning-desc"
              style={{
                margin: "0 0 0.5rem",
                fontSize: "0.93rem",
                color: "var(--text)",
                lineHeight: 1.5,
              }}
            >
              You have unsaved changes. If you leave{" "}
              <strong>{leaveActionToText(pendingLeave, tabs)}</strong>, your edits{" "}
              {pendingLeave.kind === "external"
                ? "will be saved as a local draft and may be lost if you clear browser storage."
                : "will remain as a local draft."}
            </p>
            {leaveSaveError && (
              <p role="alert" style={{ color: "var(--danger)", margin: "0 0 1rem" }}>
                {leaveSaveError}
              </p>
            )}
            {dirtyTabLabels.length > 0 && (
              <ul
                id="leave-warning-tabs"
                style={{
                  margin: "0 0 1rem",
                  paddingLeft: "1.2rem",
                  fontSize: "0.88rem",
                  color: "var(--muted)",
                }}
              >
                {dirtyTabLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={cancelLeave}
                style={{
                  minHeight: "2.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => discardAndLeave(pendingLeave)}
                style={{
                  minHeight: "2.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "1px solid rgba(251, 113, 133, 0.4)",
                  background: "rgba(251, 113, 133, 0.08)",
                  color: "var(--danger)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Discard & leave
              </button>
              <button
                type="button"
                onClick={() => saveAllAndLeave(pendingLeave)}
                style={{
                  minHeight: "2.5rem",
                  padding: "0.5rem 1.1rem",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "#04111f",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save & leave
              </button>
            </div>
          </div>
        </div>
      )}
    </DirtyRegistryProvider>
  )
}
