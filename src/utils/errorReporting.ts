/**
 * Error reporting module for unhandled promise rejections and global errors.
 *
 * Normalizes errors, throttles duplicates, shows toasts, and hands off to a
 * pluggable reporter.
 */

/**
 * Pluggable error reporter interface. Implementations can send errors to
 * external services (e.g., Sentry, LogRocket, custom logging).
 */
export interface ErrorReporter {
  /**
   * Report an error to an external service.
   * @param error - The normalized error message
   * @param originalError - The original error object/reason
   */
  report(error: string, originalError: unknown): void | Promise<void>
}

/**
 * Normalize any error value to a string for display and reporting.
 */
export function normalizeError(error: unknown): string {
  if (error === null || error === undefined) {
    return 'Unknown error'
  }

  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message || String(error)
  }

  try {
    return String(error)
  } catch {
    return 'Unstringifiable error'
  }
}

/**
 * Throttle state to prevent duplicate error toasts within a time window.
 */
const errorThrottleMap = new Map<string, number>()
const THROTTLE_MS = 5000

/**
 * Check if an error should be throttled (shown) based on recent history.
 * Returns true if the error should be shown, false if throttled.
 * Exported for testing.
 */
export function shouldShowError(error: string): boolean {
  const now = Date.now()
  const lastShown = errorThrottleMap.get(error)

  if (lastShown !== undefined && now - lastShown < THROTTLE_MS) {
    return false
  }

  errorThrottleMap.set(error, now)
  return true
}

/**
 * Clear the throttle map. Useful for tests.
 */
export function clearErrorThrottle(): void {
  errorThrottleMap.clear()
}

/**
 * Global error reporter instance. Can be set by the application.
 */
let globalReporter: ErrorReporter | null = null

/**
 * Set the global error reporter.
 */
export function setErrorReporter(reporter: ErrorReporter | null): void {
  globalReporter = reporter
}

/**
 * Handle an unhandled rejection or error.
 */
function handleError(error: unknown, eventType: 'unhandledrejection' | 'error'): void {
  const normalized = normalizeError(error)

  // Hand off to pluggable reporter
  if (globalReporter) {
    try {
      const result = globalReporter.report(normalized, error)
      if (result instanceof Promise) {
        // Fire and forget — don't block
        result.catch((err) => {
          console.error('Error reporter failed:', err)
        })
      }
    } catch (err) {
      console.error('Error reporter threw:', err)
    }
  }

  // Log to console for visibility
  console.error(`Unhandled ${eventType}:`, error)

  // Store for later toast display (via ErrorListener component)
  // We use a custom event to communicate with the React component
  const event = new CustomEvent('unhandled-error', {
    detail: { error: normalized, eventType },
  })
  window.dispatchEvent(event)
}

/**
 * Handler for unhandled promise rejections.
 */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  event.preventDefault()
  handleError(event.reason, 'unhandledrejection')
}

/**
 * Handler for global errors.
 */
function handleGlobalError(event: ErrorEvent): void {
  event.preventDefault()
  handleError(event.error, 'error')
}

/**
 * Register global error listeners.
 */
export function registerErrorListeners(): () => void {
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  window.addEventListener('error', handleGlobalError)

  // Return unregister function
  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    window.removeEventListener('error', handleGlobalError)
  }
}
