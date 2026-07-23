import { useEffect, useState } from 'react'

/** Matches the "mobile" cutoff already used elsewhere in src/index.css (max-width: 640px). */
export const DEFAULT_MOBILE_BREAKPOINT = 640

/**
 * Tracks whether the viewport is at or below `breakpointPx` via matchMedia,
 * following the same subscribe/addEventListener pattern as useTheme.ts.
 */
export function useIsMobile(breakpointPx: number = DEFAULT_MOBILE_BREAKPOINT): boolean {
  const query = `(max-width: ${breakpointPx}px)`
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return isMobile
}
