import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(QUERY).matches
}

/**
 * Reactive `prefers-reduced-motion` detection.
 *
 * Unlike a one-shot `matchMedia(...).matches` read, this hook re-evaluates
 * when the user toggles the OS setting mid-session, so animations can be
 * disabled live. SSR-safe (defaults to `false` on the server).
 *
 * Usage:
 *   const reduced = usePrefersReducedMotion()
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    // Server snapshot: no motion preference known, so assume motion is fine.
    () => false,
  )
}
