import { useEffect, useRef, useState } from 'react'

export interface UseViewportObserverOptions {
  /** IntersectionObserver threshold. Default 0.1 */
  threshold?: number
  /** Only trigger once. Default true */
  once?: boolean
  /** IntersectionObserver root margin. Default '0px' */
  rootMargin?: string
}

/**
 * useViewportObserver — observes whether an element has entered the viewport.
 *
 * Returns a ref to attach to the target element and a boolean `isVisible`
 * that flips to `true` (and stays `true` when `once` is the default).
 *
 * Designed for triggering entrance animations on dashboard charts,
 * metric cards, and other content that should animate in when scrolled into view.
 */
export function useViewportObserver<T extends HTMLElement = HTMLDivElement>(
  options: UseViewportObserverOptions = {},
): { ref: React.RefObject<T>; isVisible: boolean } {
  const { threshold = 0.1, once = true, rootMargin = '0px' } = options
  const ref = useRef<T>(null!)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Check for reduced-motion preference — if active, skip observation
    // and mark as visible immediately so animations collapse to final state.
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true)
            if (once) {
              observer.unobserve(entry.target)
            }
          } else if (!once) {
            setIsVisible(false)
          }
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [threshold, once, rootMargin])

  return { ref, isVisible }
}
