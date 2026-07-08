import { useEffect, useRef, type RefObject } from 'react'

/**
 * Shared behavior for a closable, non-modal overlay panel: focuses the
 * panel on mount, restores focus to whatever was focused before on
 * unmount, closes on Escape, and closes on any pointerdown outside the
 * panel. Used by InfoPanel and LocationPicker so this a11y/dismissal
 * logic lives in exactly one place.
 */
export function useDismissablePanel<T extends HTMLElement>(
  onClose: () => void,
): RefObject<T | null> {
  const panelRef = useRef<T>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    return () => {
      previouslyFocused?.focus?.()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [onClose])

  return panelRef
}
