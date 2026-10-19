import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Only allow same-origin absolute paths as a post-login target. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return null;
  }
  return next;
}

/**
 * Client-side route guard (UX only; the backend must enforce auth).
 * Redirects signed-out visitors to /login?next=<intended path>.
 */
export default function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}
