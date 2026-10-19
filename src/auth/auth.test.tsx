import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { AuthProvider, useAuth, AUTH_STORAGE_KEY } from "./AuthContext";
import RequireAuth, { safeNextPath } from "./RequireAuth";
import Layout from "../components/Layout";
import messages from "../i18n/messages/en.json";

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{`${loc.pathname}${loc.search}`}</div>;
}

function LoginStub() {
  const { signIn } = useAuth();
  return (
    <div>
      <LocationProbe />
      <button onClick={() => signIn()}>do-sign-in</button>
    </div>
  );
}

function AuthStatus() {
  const { isAuthenticated, user } = useAuth();
  return <div data-testid="status">{isAuthenticated ? user?.name : "anon"}</div>;
}

function renderApp(initial: string, extra?: React.ReactNode) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/login" element={<LoginStub />} />
          <Route element={<RequireAuth />}>
            <Route path="/settings" element={<div>settings page</div>} />
          </Route>
        </Routes>
        {extra}
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("auth", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("RequireAuth redirects signed-out users to /login preserving the path", () => {
    renderApp("/settings?tab=security");
    expect(screen.queryByText("settings page")).not.toBeInTheDocument();
    expect(screen.getByTestId("loc").textContent).toBe(
      `/login?next=${encodeURIComponent("/settings?tab=security")}`,
    );
  });

  it("renders the protected route when signed in", () => {
    window.sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ name: "Test User", initials: "TU", email: "t@example.com" }),
    );
    renderApp("/settings");
    expect(screen.getByText("settings page")).toBeInTheDocument();
  });

  it("persists the session across reload and clears it on signOut", () => {
    function Controls() {
      const { signIn, signOut } = useAuth();
      return (
        <>
          <button onClick={() => signIn()}>in</button>
          <button onClick={signOut}>out</button>
          <AuthStatus />
        </>
      );
    }
    const first = render(
      <AuthProvider>
        <Controls />
      </AuthProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("anon");
    fireEvent.click(screen.getByText("in"));
    expect(screen.getByTestId("status").textContent).toBe("Joel Agboola");
    const stored = window.sessionStorage.getItem(AUTH_STORAGE_KEY)!;
    expect(stored).not.toMatch(/token|password/i);
    first.unmount();

    // "reload": new provider tree reads sessionStorage
    render(
      <AuthProvider>
        <Controls />
      </AuthProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("Joel Agboola");
    fireEvent.click(screen.getByText("out"));
    expect(screen.getByTestId("status").textContent).toBe("anon");
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("ignores corrupt stored sessions", () => {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, "{not json");
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("anon");
  });

  it("safeNextPath rejects open-redirect targets", () => {
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });

  it("Sign out from the account menu clears the session and returns to /login", () => {
    window.sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ name: "Test User", initials: "TU", email: "t@example.com" }),
    );
    render(
      <IntlProvider locale="en" messages={messages}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/settings"]}>
            <Routes>
              <Route path="/login" element={<LoginStub />} />
              <Route element={<RequireAuth />}>
                <Route element={<Layout />}>
                  <Route path="/settings" element={<div>settings page</div>} />
                </Route>
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </IntlProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /account menu for test user/i }));
    act(() => {
      fireEvent.click(screen.getByRole("menuitem", { name: messages["nav.signOut" as keyof typeof messages] as string }));
    });
    expect(screen.getByTestId("loc").textContent).toBe("/login");
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
