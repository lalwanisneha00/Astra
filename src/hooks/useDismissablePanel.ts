import { useEffect, useRef, type RefObject } from 'react'

/**
 * Shared behavior for a closable, non-modal overlay panel: focuses the
 * panel on mount, restores focus to whatever was focused before on
 * unmount, closes on Escape, and closes on any pointerdown outside the
 * panel. Used by every icon-triggered dock/panel in the app, so this
 * a11y/dismissal logic lives in exactly one place.
 */
export function useDismissablePanel<T extends HTMLElement>(
  onClose: () => void,
): RefObject<T | null> {
  const panelRef = useRef<T>(null)

  // `onClose` is typically a fresh closure every render of the caller
  // (e.g. `() => setIsOpen(false)`) — reading it through a ref, rather
  // than depending on it directly, keeps the two listener effects below
  // registered exactly once per mount instead of tearing down and
  // re-adding two document-level listeners on every single render of
  // every dismissable panel in the app (SearchBar alone would do this
  // on every keystroke).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

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
        onCloseRef.current()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onCloseRef.current()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return panelRef
}
