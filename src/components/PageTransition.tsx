import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isAuthRoute, isModalRoute } from '../utils/pageTransitionUtils'

interface PageTransitionProps {
  children: ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  const isAuth = isAuthRoute(location.pathname)
  const isModal = isModalRoute(location.pathname, location.state)
  const isExempt = isAuth || isModal || prefersReducedMotion

  const transitionClass = isExempt
    ? 'page-transition-instant'
    : 'page-transition-crossfade'

  return (
    <div
      key={isExempt ? 'instant' : location.pathname}
      className={`page-transition-container ${transitionClass}`}
      data-testid="page-transition-wrapper"
      data-transition-exempt={isExempt ? 'true' : 'false'}
      data-transition-type={isExempt ? 'instant' : 'crossfade'}
    >
      {children}
    </div>
  )
}
