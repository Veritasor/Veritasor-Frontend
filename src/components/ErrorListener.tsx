import { useEffect } from 'react'
import { useToast } from './ToastContext'
import { shouldShowError, clearErrorThrottle } from '../utils/errorReporting'

/**
 * React component that listens for unhandled errors from the error reporting
 * module and displays them as toasts.
 *
 * Must be rendered inside a ToastProvider.
 */
export function ErrorListener() {
  const { addToast } = useToast()

  useEffect(() => {
    const handleCustomError = (event: Event) => {
      const customEvent = event as CustomEvent<{ error: string; eventType: string }>
      const { error } = customEvent.detail

      if (shouldShowError(error)) {
        addToast(error, 'error')
      }
    }

    window.addEventListener('unhandled-error', handleCustomError)

    return () => {
      window.removeEventListener('unhandled-error', handleCustomError)
    }
  }, [addToast])

  return null
}

/**
 * Hook to clear the error throttle. Useful for tests.
 */
export function useClearErrorThrottle() {
  useEffect(() => {
    return () => {
      clearErrorThrottle()
    }
  }, [])
}
