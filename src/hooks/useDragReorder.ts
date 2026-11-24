import { useCallback, useEffect, useRef, useState } from 'react'

interface PointerEventLike {
  pointerId?: number
  clientY?: number
  currentTarget?: unknown
  target?: unknown
  preventDefault?(): void
}

interface PointerCaptureTarget {
  setPointerCapture?: (id: number) => void
  releasePointerCapture?: (id: number) => void
}

export interface DragReorderState {
  /** Index being dragged (pointer) or selected for keyboard move, null when idle */
  grabbedIndex: number | null
  /** Index that is the current drop target during pointer drag */
  dropTargetIndex: number | null
}

export interface DragReorderHandlers {
  /** Call on pointerdown of the drag handle */
  handlePointerDown: (index: number) => (e: PointerEventLike) => void
  /** Call on pointerenter of each list item during a drag */
  handlePointerEnter: (index: number) => () => void
  /** Call on pointermove of the list */
  handlePointerMove: (e: PointerEventLike) => void
  /** Call on pointerup */
  handlePointerUp: (e?: PointerEventLike) => void
  /** Call on pointercancel */
  handlePointerCancel: (e?: PointerEventLike) => void
  /** Toggle keyboard reorder mode for an item */
  handleKeyboardGrab: (index: number) => void
  /** Handle ArrowUp/ArrowDown/Enter/Space/Escape in keyboard mode */
  handleKeyDown: (e: { key: string; preventDefault(): void }) => void
  /** Move item at index up one position (per-row button alternative) */
  moveUp: (index: number) => void
  /** Move item at index down one position (per-row button alternative) */
  moveDown: (index: number) => void
}

export interface UseDragReorderReturn extends DragReorderState, DragReorderHandlers {
  /** Announcement text for the aria-live region */
  announcement: string
}

export function useDragReorder<T>(
  items: T[],
  onReorder: (next: T[]) => void,
  getLabel: (item: T) => string,
): UseDragReorderReturn {
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')

  // Refs track drag state synchronously so pointerUp always sees the latest values
  const dragFrom = useRef<number | null>(null)
  const dragTo = useRef<number | null>(null)
  const capturedElement = useRef<PointerCaptureTarget | null>(null)
  const activePointerId = useRef<number | null>(null)
  const pointerY = useRef<number | null>(null)
  const pointerList = useRef<HTMLElement | null>(null)
  const scrollContainer = useRef<HTMLElement | null>(null)
  const animationFrame = useRef<number | null>(null)

  const reorder = useCallback(
    (from: number, to: number) => {
      if (from === to) return
      const next = [...items]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      onReorder(next)
    },
    [items, onReorder],
  )

  const stopAutoScroll = useCallback(() => {
    if (animationFrame.current !== null) {
      window.cancelAnimationFrame(animationFrame.current)
      animationFrame.current = null
    }
    pointerY.current = null
    pointerList.current = null
    scrollContainer.current = null
  }, [])

  const setPointerTarget = useCallback((index: number) => {
    if (dragFrom.current === null || index < 0 || index >= items.length) return
    if (dragTo.current === index) return
    dragTo.current = index
    setDropTargetIndex(index)
    setAnnouncement(`${getLabel(items[dragFrom.current])} over position ${index + 1} of ${items.length}.`)
  }, [items, getLabel])

  const updateTargetFromPointer = useCallback(() => {
    const list = pointerList.current
    const y = pointerY.current
    if (!list || y === null) return

    const rows = Array.from(list.children)
    if (rows.length === 0) return
    for (let index = 0; index < rows.length; index += 1) {
      const bounds = rows[index].getBoundingClientRect()
      if (y < bounds.top + bounds.height / 2) {
        setPointerTarget(index)
        return
      }
    }
    setPointerTarget(Math.min(rows.length - 1, items.length - 1))
  }, [items.length, setPointerTarget])

  const continueAutoScroll = useCallback(() => {
    if (animationFrame.current !== null) return
    const tick = () => {
      animationFrame.current = null
      const y = pointerY.current
      if (dragFrom.current === null || y === null) return

      const container = scrollContainer.current
      const top = container ? container.getBoundingClientRect().top : 0
      const bottom = container ? container.getBoundingClientRect().bottom : window.innerHeight
      const edgeSize = 48
      const maxStep = 16
      const distanceFromTop = y - top
      const distanceFromBottom = bottom - y
      const delta = distanceFromTop < edgeSize
        ? -Math.ceil(maxStep * Math.max(0, edgeSize - distanceFromTop) / edgeSize)
        : distanceFromBottom < edgeSize
          ? Math.ceil(maxStep * Math.max(0, edgeSize - distanceFromBottom) / edgeSize)
          : 0

      if (delta === 0) return
      if (container) {
        const previous = container.scrollTop
        container.scrollTop += delta
        if (container.scrollTop === previous) return
      } else {
        const previous = window.scrollY
        window.scrollBy(0, delta)
        if (window.scrollY === previous) return
      }
      updateTargetFromPointer()
      animationFrame.current = window.requestAnimationFrame(tick)
    }
    animationFrame.current = window.requestAnimationFrame(tick)
  }, [updateTargetFromPointer])

  useEffect(() => stopAutoScroll, [stopAutoScroll])

  const handlePointerDown = useCallback(
    (index: number) => (e: PointerEventLike) => {
      if (dragFrom.current !== null || index < 0 || index >= items.length) return
      e.preventDefault?.()
      const target = (e.currentTarget ?? e.target) as PointerCaptureTarget | null
      if (typeof e.pointerId === 'number') {
        activePointerId.current = e.pointerId
        if (target && typeof target.setPointerCapture === 'function') {
          try {
            target.setPointerCapture(e.pointerId)
            capturedElement.current = target
          } catch {
            capturedElement.current = null
          }
        }
      }
      dragFrom.current = index
      dragTo.current = index
      setGrabbedIndex(index)
      setDropTargetIndex(index)
      setAnnouncement(`Grabbed ${getLabel(items[index])}. Drag to reorder.`)
    },
    [items, getLabel],
  )

  const handlePointerEnter = useCallback(
    (index: number) => () => {
      if (dragFrom.current === null) return
      setPointerTarget(index)
    },
    [setPointerTarget],
  )

  const handlePointerMove = useCallback((e: PointerEventLike) => {
    if (dragFrom.current === null || typeof e.clientY !== 'number') return
    const list = e.currentTarget as HTMLElement | null
    if (!list) return
    pointerY.current = e.clientY
    pointerList.current = list

    let parent = list.parentElement
    let scrollableParent: HTMLElement | null = null
    while (parent && parent !== document.body) {
      const overflowY = window.getComputedStyle(parent).overflowY
      if (/(auto|scroll)/.test(overflowY) && parent.scrollHeight > parent.clientHeight) {
        scrollableParent = parent
        break
      }
      parent = parent.parentElement
    }
    scrollContainer.current = scrollableParent
    updateTargetFromPointer()
    continueAutoScroll()
  }, [continueAutoScroll, updateTargetFromPointer])

  const releasePointer = useCallback((e?: PointerEventLike) => {
    const pointerId = e?.pointerId ?? activePointerId.current
    const target = (capturedElement.current ?? e?.currentTarget ?? e?.target) as PointerCaptureTarget | null
    if (typeof pointerId === 'number' && target && typeof target.releasePointerCapture === 'function') {
      try {
        target.releasePointerCapture(pointerId)
      } catch {
        capturedElement.current = null
      }
    }
    capturedElement.current = null
    activePointerId.current = null
    stopAutoScroll()
  }, [stopAutoScroll])

  const handlePointerUp = useCallback((e?: PointerEventLike) => {
    if (activePointerId.current !== null && e?.pointerId !== undefined && e.pointerId !== activePointerId.current) return
    const from = dragFrom.current
    const to = dragTo.current
    if (from === null) {
      releasePointer(e)
      return
    }

    releasePointer(e)
    dragFrom.current = null
    dragTo.current = null
    setGrabbedIndex(null)
    setDropTargetIndex(null)

    if (to !== null && from !== to) {
      reorder(from, to)
      setAnnouncement(`Dropped. ${getLabel(items[from])} moved to position ${to + 1} of ${items.length}.`)
    } else {
      setAnnouncement('Drop cancelled.')
    }
  }, [getLabel, items, releasePointer, reorder])

  const handlePointerCancel = useCallback((e?: PointerEventLike) => {
    if (activePointerId.current !== null && e?.pointerId !== undefined && e.pointerId !== activePointerId.current) return
    const from = dragFrom.current
    if (from === null) {
      releasePointer(e)
      return
    }
    releasePointer(e)
    dragFrom.current = null
    dragTo.current = null
    setGrabbedIndex(null)
    setDropTargetIndex(null)
    setAnnouncement(`Reorder cancelled. ${getLabel(items[from])} returned to its original position.`)
  }, [getLabel, items, releasePointer])

  const handleKeyboardGrab = useCallback(
    (index: number) => {
      setGrabbedIndex((prev) => {
        if (prev === index) {
          setAnnouncement(`${getLabel(items[index])} dropped in place.`)
          return null
        }
        setAnnouncement(
          `${getLabel(items[index])} grabbed, position ${index + 1} of ${items.length}. ` +
            `Use arrow keys to move, Enter or Space to drop, Escape to cancel.`,
        )
        return index
      })
    },
    [items, getLabel],
  )

  const handleKeyDown = useCallback(
    (e: { key: string; preventDefault(): void }) => {
      if (grabbedIndex === null) return
      if (!['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape'].includes(e.key)) return
      e.preventDefault()

      if (e.key === 'Escape') {
        setGrabbedIndex(null)
        setAnnouncement(
          `Reorder cancelled. ${getLabel(items[grabbedIndex])} remains at position ${grabbedIndex + 1} of ${items.length}.`,
        )
        return
      }

      if (e.key === 'Enter' || e.key === ' ') {
        setGrabbedIndex(null)
        setAnnouncement(`${getLabel(items[grabbedIndex])} dropped at position ${grabbedIndex + 1} of ${items.length}.`)
        return
      }

      const next = e.key === 'ArrowUp' ? grabbedIndex - 1 : grabbedIndex + 1
      if (next < 0 || next >= items.length) return

      reorder(grabbedIndex, next)
      setGrabbedIndex(next)
      setAnnouncement(`${getLabel(items[grabbedIndex])} moved to position ${next + 1} of ${items.length}.`)
    },
    [grabbedIndex, items, getLabel, reorder],
  )

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return
      reorder(index, index - 1)
      setAnnouncement(`${getLabel(items[index])} moved up to position ${index} of ${items.length}.`)
    },
    [items, getLabel, reorder],
  )

  const moveDown = useCallback(
    (index: number) => {
      if (index >= items.length - 1) return
      reorder(index, index + 1)
      setAnnouncement(`${getLabel(items[index])} moved down to position ${index + 2} of ${items.length}.`)
    },
    [items, getLabel, reorder],
  )

  return {
    grabbedIndex,
    dropTargetIndex,
    announcement,
    handlePointerDown,
    handlePointerEnter,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleKeyboardGrab,
    handleKeyDown,
    moveUp,
    moveDown,
  }
}
