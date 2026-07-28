/**
 * List of authentication routes that bypass page-change crossfade motion.
 * Auth screens require immediate visual response without transition delays.
 */
export const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

/**
 * Helper to check if a pathname or location represents an auth route.
 */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

/**
 * Helper to check if location state or route path represents a modal route/overlay.
 */
export function isModalRoute(pathname: string, state?: unknown): boolean {
  if (state && typeof state === 'object' && state !== null && 'backgroundLocation' in state) {
    return true
  }
  return pathname.includes('/modal') || pathname.includes('-modal')
}
