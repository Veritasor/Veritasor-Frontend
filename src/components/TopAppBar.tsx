import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useIntl } from "react-intl";
import DensityToggle from "./DensityToggle";
import LocalePicker from "./LocalePicker/LocalePicker";

export interface TopAppBarProps {
  workspaces?: string[];
  initialWorkspace?: string;
  initialEnvironment?: "testnet" | "mainnet";
  userName?: string;
  userInitials?: string;
  onSidebarToggle?: () => void;
  sidebarOpen?: boolean;
  onSearchClick?: () => void;
  onWorkspaceQuickJump?: () => void;
  /** When true the workspace switcher opens immediately in search/filter mode */
  openWorkspaceSwitcherInSearchMode?: boolean;
  /** Callback to notify parent that the workspace switcher has been opened/closed */
  onWorkspaceSwitcherOpenChange?: (open: boolean) => void;
}

const DEFAULT_WORKSPACES = ["Acme Corp", "My Workspace", "Test Org"];

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface CreateWorkspaceDraft {
  name: string;
  displayName: string;
  description: string;
  plan: "starter" | "growth" | "business";
  region: "us-east" | "us-west" | "eu-west" | "ap-southeast";
}

const EMPTY_DRAFT: CreateWorkspaceDraft = {
  name: "",
  displayName: "",
  description: "",
  plan: "growth",
  region: "us-east",
};

const DRAFT_STORAGE_KEY = "veritasor-create-workspace-draft";

function loadDraftFromStorage(): CreateWorkspaceDraft {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (stored) return { ...EMPTY_DRAFT, ...JSON.parse(stored) };
  } catch {}
  return { ...EMPTY_DRAFT };
}

export default function TopAppBar({
  workspaces = DEFAULT_WORKSPACES,
  initialWorkspace = DEFAULT_WORKSPACES[0],
  initialEnvironment = "testnet",
  userName = "Joel Agboola",
  userInitials = "JA",
  onSidebarToggle,
  sidebarOpen = false,
  onSearchClick,
  onWorkspaceQuickJump,
  openWorkspaceSwitcherInSearchMode = false,
  onWorkspaceSwitcherOpenChange,
}: TopAppBarProps) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([
    initialWorkspace,
  ]);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [environment, setEnvironment] = useState<"testnet" | "mainnet">(
    initialEnvironment,
  );
  const [accountOpen, setAccountOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [createWsDraft, setCreateWsDraft] = useState<CreateWorkspaceDraft>(() =>
    loadDraftFromStorage(),
  );
  const [createWsSubmitting, setCreateWsSubmitting] = useState(false);
  const intl = useIntl();

  const workspaceBtnRef = useRef<HTMLButtonElement>(null);
  const workspaceMenuRef = useRef<HTMLUListElement>(null);
  const workspaceSearchRef = useRef<HTMLInputElement>(null);
  const accountBtnRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLUListElement>(null);
  const createWsTriggerRef = useRef<HTMLElement | null>(null);
  const createWsModalRef = useRef<HTMLDivElement>(null);
  const createWsNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(createWsDraft));
    } catch {}
  }, [createWsDraft]);

  // Open workspace switcher in search mode when triggered externally (e.g. Ctrl+K→W shortcut)
  useEffect(() => {
    if (openWorkspaceSwitcherInSearchMode) {
      setWorkspaceSearch("");
      setWorkspaceOpen(true);
      // Focus the search input once the dropdown mounts
      const t = window.setTimeout(() => workspaceSearchRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [openWorkspaceSwitcherInSearchMode]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      // Refs are non-null while component is mounted
      if (
        workspaceOpen &&
        !workspaceBtnRef.current!.contains(target) &&
        !workspaceMenuRef.current!.contains(target)
      ) {
        setWorkspaceOpen(false);
      }
      if (
        accountOpen &&
        !accountBtnRef.current!.contains(target) &&
        !accountMenuRef.current!.contains(target)
      ) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [workspaceOpen, accountOpen]);

  // Focus first option when workspace listbox opens (skip when search is active)
  useEffect(() => {
    onWorkspaceSwitcherOpenChange?.(workspaceOpen);
    if (workspaceOpen && !workspaceSearch) {
      workspaceMenuRef
        .current!.querySelectorAll<HTMLElement>('[role="option"]')[0]
        ?.focus();
    }
  }, [workspaceOpen]);

  // Focus first menuitem when account menu opens
  useEffect(() => {
    if (accountOpen) {
      accountMenuRef
        .current!.querySelectorAll<HTMLElement>('[role="menuitem"]')[0]
        ?.focus();
    }
  }, [accountOpen]);

  // Focus + scroll lock for create workspace modal
  useEffect(() => {
    if (createWsOpen) {
      createWsTriggerRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      const t = window.setTimeout(() => createWsNameRef.current?.focus(), 20);
      return () => {
        window.clearTimeout(t);
        document.body.style.overflow = "";
      };
    } else {
      createWsTriggerRef.current?.focus();
    }
  }, [createWsOpen]);

  // Focus trap + Escape for create workspace modal
  useEffect(() => {
    if (!createWsOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !createWsSubmitting) {
        e.preventDefault();
        setCreateWsOpen(false);
        return;
      }
      if (e.key !== "Tab" || !createWsModalRef.current) return;
      const focusable = Array.from(
        createWsModalRef.current.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTORS,
        ),
      ).filter((el) => (el as HTMLElement).offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [createWsOpen, createWsSubmitting]);

  const handleWorkspaceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setWorkspaceOpen(false);
        workspaceBtnRef.current!.focus();
      } else if (!workspaceOpen && e.key === "ArrowDown") {
        e.preventDefault();
        setWorkspaceOpen(true);
      }
    },
    [workspaceOpen],
  );

  const handleWorkspaceMenuKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      const arr = Array.from(
        workspaceMenuRef.current!.querySelectorAll<HTMLElement>(
          '[role="option"]',
        ),
      );
      const idx = arr.indexOf(document.activeElement as HTMLElement);

      if (e.key === "Escape") {
        e.preventDefault();
        setWorkspaceOpen(false);
        workspaceBtnRef.current!.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        arr[(idx + 1) % arr.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        arr[idx <= 0 ? arr.length - 1 : idx - 1]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        arr[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        arr[arr.length - 1]?.focus();
      }
    },
    [],
  );

  const handleAccountKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setAccountOpen(false);
        accountBtnRef.current!.focus();
      } else if (!accountOpen && e.key === "ArrowDown") {
        e.preventDefault();
        setAccountOpen(true);
      }
    },
    [accountOpen],
  );

  const handleAccountMenuKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      const arr = Array.from(
        accountMenuRef.current!.querySelectorAll<HTMLElement>(
          '[role="menuitem"]',
        ),
      );
      const idx = arr.indexOf(document.activeElement as HTMLElement);

      if (e.key === "Escape") {
        e.preventDefault();
        setAccountOpen(false);
        accountBtnRef.current!.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        arr[(idx + 1) % arr.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        arr[idx <= 0 ? arr.length - 1 : idx - 1]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        arr[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        arr[arr.length - 1]?.focus();
      }
    },
    [],
  );

  function selectWorkspace(ws: string) {
    setWorkspace(ws);

    setRecentWorkspaces((prev) => {
      const updated = [ws, ...prev.filter((item) => item !== ws)];
      return updated.slice(0, 5);
    });

    setWorkspaceSearch("");
    setWorkspaceOpen(false);
    workspaceBtnRef.current?.focus();
  }

  function closeAccountMenu() {
    setAccountOpen(false);
  }

  const hasDraftContent = useMemo(
    () =>
      createWsDraft.name.trim() !== "" ||
      createWsDraft.displayName.trim() !== "" ||
      createWsDraft.description.trim() !== "",
    [createWsDraft],
  );

  function openCreateWorkspace() {
    createWsTriggerRef.current = workspaceBtnRef.current;
    setWorkspaceOpen(false);
    setCreateWsOpen(true);
  }

  function handleCreateWorkspaceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateWsSubmitting(true);
    setTimeout(() => {
      const newName =
        createWsDraft.displayName.trim() ||
        createWsDraft.name.trim() ||
        "New Workspace";
      setWorkspace(newName);
      setRecentWorkspaces((prev) => [newName, ...prev].slice(0, 5));
      setCreateWsDraft({ ...EMPTY_DRAFT });
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      setCreateWsSubmitting(false);
      setCreateWsOpen(false);
    }, 1400);
  }

  function clearCreateWorkspaceDraft() {
    setCreateWsDraft({ ...EMPTY_DRAFT });
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
  }

  // Density mode is managed by DensityToggle via data attribute on root

  return (
    <header className="app-bar" role="banner">
      <div className="app-bar-inner">
        <button
          type="button"
          className="app-bar-hamburger"
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          onClick={onSidebarToggle}
        >
          <span aria-hidden="true">{sidebarOpen ? "✕" : "☰"}</span>
        </button>

        <span className="app-bar-brand">Veritasor</span>

        <div className="app-bar-workspace" style={{ position: "relative" }}>
          <button
            ref={workspaceBtnRef}
            type="button"
            className="workspace-trigger"
            aria-haspopup="listbox"
            aria-expanded={workspaceOpen}
            aria-label={`Workspace: ${workspace}. Change workspace`}
            onClick={() => setWorkspaceOpen((o) => !o)}
            onKeyDown={handleWorkspaceKeyDown}
          >
            <span className="workspace-name">{workspace}</span>
            <span aria-hidden="true" className="workspace-chevron">
              {workspaceOpen ? "▲" : "▼"}
            </span>
          </button>

          {workspaceOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 0.375rem)",
                left: 0,
                minWidth: "15rem",
                zIndex: 200,
              }}
            >
              {/* Quick-jump search input — shown when switcher opens in search mode */}
              <div
                style={{
                  padding: "0.375rem",
                  background: "var(--surface-strong)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-lg)",
                  marginBottom: "0.25rem",
                }}
              >
                <div style={{ position: "relative" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "0.6rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                      pointerEvents: "none",
                    }}
                  >
                    🔍
                  </span>
                  <input
                    ref={workspaceSearchRef}
                    type="search"
                    value={workspaceSearch}
                    onChange={(e) => setWorkspaceSearch(e.target.value)}
                    placeholder="Find workspace…"
                    aria-label="Search workspaces"
                    aria-controls="workspace-listbox"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setWorkspaceSearch("");
                        setWorkspaceOpen(false);
                        workspaceBtnRef.current?.focus();
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const first = workspaceMenuRef.current?.querySelector<HTMLElement>('[role="option"]');
                        first?.focus();
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.75rem 0.45rem 2rem",
                      borderRadius: "calc(var(--radius-sm) - 0.25rem)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "0.88rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <ul
                ref={workspaceMenuRef}
                id="workspace-listbox"
                role="listbox"
                aria-label="Select workspace"
                className="disclosure-menu"
                style={{ position: "static", minWidth: "100%" }}
                onKeyDown={handleWorkspaceMenuKeyDown}
              >
                {workspaces
                  .filter((ws) =>
                    workspaceSearch.trim() === "" ||
                    ws.toLowerCase().includes(workspaceSearch.toLowerCase()),
                  )
                  .map((ws) => (
                    <li
                      key={ws}
                      role="option"
                      aria-selected={ws === workspace}
                      tabIndex={0}
                      className={`disclosure-item${ws === workspace ? " disclosure-item-active" : ""}`}
                      onClick={() => selectWorkspace(ws)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectWorkspace(ws);
                        }
                      }}
                    >
                      {ws}
                      {ws === workspace && (
                        <span className="sr-only"> (current)</span>
                      )}
                    </li>
                  ))}
                {workspaceSearch.trim() !== "" &&
                  workspaces.filter((ws) =>
                    ws.toLowerCase().includes(workspaceSearch.toLowerCase()),
                  ).length === 0 && (
                    <li
                      role="option"
                      aria-disabled="true"
                      tabIndex={-1}
                      style={{
                        padding: "0.6rem 0.9rem",
                        fontSize: "0.88rem",
                        color: "var(--muted)",
                        fontStyle: "italic",
                      }}
                    >
                      No workspaces match "{workspaceSearch}"
                    </li>
                  )}
              </ul>
              <div
                style={{
                  marginTop: "0.375rem",
                  padding: "0.375rem",
                  background: "var(--surface-strong)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <button
                  type="button"
                  role="option"
                  tabIndex={0}
                  onClick={openCreateWorkspace}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openCreateWorkspace();
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    width: "100%",
                    minHeight: "2.5rem",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "calc(var(--radius-sm) - 0.25rem)",
                    border: "1px dashed rgba(94, 234, 212, 0.4)",
                    background:
                      "linear-gradient(135deg, rgba(94, 234, 212, 0.08), rgba(96, 165, 250, 0.08))",
                    color: "var(--text)",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    transition:
                      "border-color 120ms ease, background-color 120ms ease, transform 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(-1px)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "none";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "rgba(94, 234, 212, 0.4)";
                  }}
                  aria-label={
                    hasDraftContent
                      ? "Create new workspace (resume draft)"
                      : "Create new workspace"
                  }
                >
                  <span aria-hidden="true" style={{ fontSize: "1rem" }}>
                    +
                  </span>
                  <span>Create workspace</span>
                  {hasDraftContent && (
                    <span
                      aria-label="Draft in progress"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "1.4rem",
                        height: "1.2rem",
                        padding: "0 0.35rem",
                        borderRadius: 999,
                        background: "rgba(251, 191, 36, 0.18)",
                        color: "var(--warning)",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                      }}
                    >
                      DRAFT
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="app-bar-search-trigger"
          aria-label="Search or type command"
          onClick={onSearchClick}
        >
          <span aria-hidden="true" className="search-icon">
            🔍
          </span>
          <span className="search-placeholder">Search...</span>
          <kbd className="search-kbd">Ctrl K</kbd>
        </button>

        <div className="app-bar-actions">
          <DensityToggle workspace={workspace} />
          <button
            type="button"
            className={`env-badge env-badge-${environment}`}
            aria-label={`Environment: ${environment}. Toggle environment`}
            onClick={() =>
              setEnvironment((env) =>
                env === "testnet" ? "mainnet" : "testnet",
              )
            }
          >
            <span aria-hidden="true" className="env-dot" />
            {environment}
          </button>

          <div style={{ position: "relative" }}>
            <button
              ref={accountBtnRef}
              type="button"
              className="account-trigger"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-label={`Account menu for ${userName}`}
              onClick={() => setAccountOpen((o) => !o)}
              onKeyDown={handleAccountKeyDown}
            >
              <span aria-hidden="true" className="account-avatar">
                {userInitials}
              </span>
              <span className="sr-only">{userName}</span>
              <span aria-hidden="true" className="workspace-chevron">
                {accountOpen ? "▲" : "▼"}
              </span>
            </button>

            {accountOpen && (
              <ul
                ref={accountMenuRef}
                role="menu"
                aria-label="Account options"
                className="disclosure-menu disclosure-menu-right"
                onKeyDown={handleAccountMenuKeyDown}
              >
                <li
                  role="menuitem"
                  tabIndex={0}
                  className="disclosure-item"
                  onClick={closeAccountMenu}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      closeAccountMenu();
                    }
                  }}
                >
                  {intl.formatMessage({ id: "settings.title" })}
                </li>
                <li
                  role="menuitem"
                  tabIndex={0}
                  className="disclosure-item"
                  onClick={closeAccountMenu}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      closeAccountMenu();
                    }
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-zinc-500">
                      {intl.formatMessage({ id: "settings.locale.label" })}
                    </span>
                    <LocalePicker compact />
                  </div>
                </li>
                <li
                  role="menuitem"
                  tabIndex={0}
                  className="disclosure-item"
                  onClick={closeAccountMenu}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      closeAccountMenu();
                    }
                  }}
                >
                  API keys
                </li>
                <li
                  role="separator"
                  aria-hidden="true"
                  className="disclosure-separator"
                />
                <li
                  role="menuitem"
                  tabIndex={0}
                  className="disclosure-item disclosure-item-danger"
                  onClick={closeAccountMenu}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      closeAccountMenu();
                    }
                  }}
                >
                  {intl.formatMessage({ id: "nav.signOut" })}
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
