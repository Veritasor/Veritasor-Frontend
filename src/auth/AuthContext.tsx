/**
 * Mock session context.
 *
 * SECURITY NOTE: this is a client-side, UX-only session. It stores a mock user
 * (no tokens, passwords or other secrets) in sessionStorage. The backend MUST
 * enforce authentication/authorization on every request; hiding routes in the
 * browser does not protect any data.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface AuthUser {
  name: string;
  initials: string;
  email: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: (user?: AuthUser) => void;
  signOut: () => void;
}

export const AUTH_STORAGE_KEY = "veritasor-session";

export const MOCK_USER: AuthUser = {
  name: "Joel Agboola",
  initials: "JA",
  email: "joel@example.com",
};

function loadUser(): AuthUser | null {
  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.name === "string" &&
      typeof parsed.initials === "string" &&
      typeof parsed.email === "string"
    ) {
      return { name: parsed.name, initials: parsed.initials, email: parsed.email };
    }
  } catch {
    // Ignore storage/parse errors
  }
  return null;
}

function saveUser(user: AuthUser | null) {
  try {
    if (user) window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    else window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Default (no provider) is signed-out with no-op actions so isolated component
// tests can render consumers without wrapping them.
const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadUser());

  const signIn = useCallback((next: AuthUser = MOCK_USER) => {
    saveUser(next);
    setUser(next);
  }, []);

  const signOut = useCallback(() => {
    saveUser(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, signIn, signOut }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
