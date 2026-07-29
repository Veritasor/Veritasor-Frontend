import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Toast } from './ToastContext'
import { resolveAutoDismissMs } from './toastRules'

export type ToastAnimationState = 'entering' | 'idle' | 'exiting'

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
  /**
   * When true, the toast is rendered inside an expanded overflow group and
   * should not animate its entrance/exit — the group owns the motion.
   */
  disableMotion?: boolean
}

export default function ToastItem({ toast, onRemove, disableMotion = false }: ToastItemProps) {
  const { id, type, message, duration, onUndo, undoLabel = 'Undo' } = toast

  // Auto-dismiss duration: success/info default to 5000ms, warning/error persist
  // (0) unless explicitly overridden. ToastItem.tsx consults `toastRules` so the
  // documented cadence stays in lock-step with the spec.
  const hasUndo = typeof onUndo === 'function'
  const initialDuration = resolveAutoDismissMs(type, hasUndo, duration)

  const [timeLeft, setTimeLeft] = useState(initialDuration)
  const [isPaused, setIsPaused] = useState(false)
  const [animationState, setAnimationState] = useState<ToastAnimationState>('entering')
  const timerRef = useRef<number | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTickRef = useRef<number>(Date.now())
  const removingRef = useRef<boolean>(false)

  // Mark entrance complete after animation duration
  useEffect(() => {
    if (disableMotion) {
      setAnimationState('idle')
      return
    }
    const frame = requestAnimationFrame(() => {
      const timer = setTimeout(() => {
        setAnimationState('idle')
      }, 300) // matches motion.duration.lg
      return () => clearTimeout(timer)
    })
    return () => cancelAnimationFrame(frame)
  }, [disableMotion])

  // Cleanup exit timer on unmount
  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        clearTimeout(exitTimerRef.current)
        exitTimerRef.current = null
      }
      removingRef.current = false
    }
  }, [])

  const handleRemove = useCallback(() => {
    if (removingRef.current) return
    removingRef.current = true
    if (disableMotion) {
      onRemove(id)
      return
    }
    setAnimationState('exiting')
    // Clear any prior exit timer so the removal is debounced to a single
    // setTimeout, even if the countdown effect ticks handleRemove more than
    // once when fake timers (or paused/resumed intervals) tick past zero.
    if (exitTimerRef.current !== null) {
      clearTimeout(exitTimerRef.current)
    }
    // Wait for exit animation to complete before removing from DOM
    exitTimerRef.current = setTimeout(() => {
      onRemove(id)
    }, 200) // matches motion.duration.sm for fast exit
  }, [id, onRemove, disableMotion])

  // Countdown timer logic
  useEffect(() => {
    if (initialDuration <= 0 || isPaused) {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    lastTickRef.current = Date.now()
    timerRef.current = window.setInterval(() => {
      const now = Date.now()
      const delta = now - lastTickRef.current
      lastTickRef.current = now

      setTimeLeft((prev) => {
        const next = prev - delta
        if (next <= 0) {
          // Clear the interval the moment we cross zero so it cannot keep
          // firing tick updates (or trigger infinite loops under vitest's
          // `runAllTimers` safety limit). handleRemove is idempotent but
          // it does not own the timer's lifecycle.
          if (timerRef.current != null) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          handleRemove()
          return 0
        }
        return next
      })
    }, 50)

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [initialDuration, isPaused, handleRemove])

  function handleMouseEnter() {
    setIsPaused(true)
  }

  function handleMouseLeave() {
    setIsPaused(false)
  }

  function handleFocus() {
    setIsPaused(true)
  }

  function handleBlur() {
    setIsPaused(false)
  }

  function handleUndoClick() {
    if (onUndo) {
      onUndo()
    }
    handleRemove()
  }

  // Retrieve matching SVG icon based on the status type
  function getIcon() {
    switch (type) {
      case 'success':
        return (
          <svg className="toast-icon toast-icon-success" viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
        return (
          <svg className="toast-icon toast-icon-info" viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="toast-icon toast-icon-warning" viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="toast-icon toast-icon-error" viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'bulk-undo':
        return (
          <svg className="toast-icon toast-icon-bulk-undo" viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  const progressPercent = initialDuration > 0 ? (timeLeft / initialDuration) * 100 : 0
  const ariaRole = type === 'error' ? 'alert' : 'status'

  const animationClass = disableMotion
    ? ''
    : animationState === 'entering'
    ? 'toast-entering'
    : animationState === 'exiting'
    ? 'toast-exiting'
    : ''

  return (
    <div
      className={`toast toast-${type} ${animationClass}`.trim()}
      role={ariaRole}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div className="toast-content-wrapper">
        <span className="toast-icon-container" aria-hidden="true">
          {getIcon()}
        </span>
        <div className="toast-message">
          {message}
          {count !== undefined && <span className="toast-count"> ({count} items)</span>}
        </div>

        {onUndo && (
          <button
            type="button"
            className="toast-undo-btn"
            onClick={handleUndoClick}
            aria-keyshortcuts="Enter"
          >
            {undoLabel}
            {type === 'bulk-undo' && <span className="toast-undo-shortcut"> (U)</span>}
          </button>
        )}

        <button
          type="button"
          className="toast-close-btn"
          aria-label="Close notification"
          aria-keyshortcuts="Escape"
          onClick={handleRemove}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {initialDuration > 0 && (
        <div
          className="toast-progress-bar"
          style={{ width: `${progressPercent}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
