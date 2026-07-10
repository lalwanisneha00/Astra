import { useEffect } from 'react'
import { useInteractionStore } from '@/state/useInteractionStore'

/**
 * Sets the document cursor to a pointer while any selectable object
 * (star, constellation, planet, DSO, Sun, Moon) is hovered, and back to
 * the default otherwise. Subscribed outside React via zustand's vanilla
 * `subscribe` rather than a reactive selector — hover can change on
 * every pointer move across the sky, and a plain DOM style write needs
 * no React re-render to take effect.
 *
 * Compares whether *something* is hovered rather than the hovered
 * object itself: `InteractionManager` sets a fresh object on every
 * pointer move while hovering the same object, which would otherwise
 * make this write the same 'pointer' value on every single move instead
 * of only on the moves that actually cross a hover/unhover boundary.
 */
export function useHoverCursor(): void {
  useEffect(() => {
    return useInteractionStore.subscribe((state, prevState) => {
      const isHovering = state.hovered !== null
      const wasHovering = prevState.hovered !== null
      if (isHovering === wasHovering) return
      document.body.style.cursor = isHovering ? 'pointer' : ''
    })
  }, [])
}
