import { useEffect, useState } from 'react'

/**
 * Tracks the `prefers-reduced-motion: reduce` media query.
 *
 * Used by components whose JS-driven animation state machines need to stay
 * in lock-step with the CSS reduced-motion overrides (see
 * `docs/uiux/reduced-motion-fallback-spec.md`). Falls back to `false` in
 * environments without `window.matchMedia` (SSR, bare jsdom).
 *
 * @returns `true` when the user has requested reduced motion.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reducedMotion
}
