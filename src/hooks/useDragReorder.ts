import { useCallback, useRef, useState } from 'react'

export interface DragReorderState {
  /** Index being dragged (pointer) or selected for keyboard move, null when idle */
  grabbedIndex: number | null
  /** Index that is the current drop target during pointer drag */
  dropTargetIndex: number | null
}

export interface DragReorderHandlers {
  /** Call on pointerdown of the drag handle */
  handlePointerDown: (index: number) => (e: { preventDefault(): void }) => void
  /** Call on pointerenter of each list item during a drag */
  handlePointerEnter: (index: number) => () => void
  /** Call on pointerup anywhere (attach to the list element) */
  handlePointerUp: () => void
  /** Toggle keyboard reorder mode for an item */
  handleKeyboardGrab: (index: number) => void
  /** Handle ArrowUp/ArrowDown/Enter/Space/Escape in keyboard mode */
  handleKeyDown: (e: { key: string; preventDefault(): void }) => void
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

  const handlePointerDown = useCallback(
    (index: number) => (e: { preventDefault(): void }) => {
      e.preventDefault()
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
      dragTo.current = index
      setDropTargetIndex(index)
    },
    [],
  )

  const handlePointerUp = useCallback(() => {
    const from = dragFrom.current
    const to = dragTo.current
    if (from === null) return

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
  }, [reorder, items, getLabel])

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
        setAnnouncement(`Reorder cancelled. ${getLabel(items[grabbedIndex])} returned to original position.`)
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

  return {
    grabbedIndex,
    dropTargetIndex,
    announcement,
    handlePointerDown,
    handlePointerEnter,
    handlePointerUp,
    handleKeyboardGrab,
    handleKeyDown,
  }
}
