import { useEffect } from 'react'
import { useSceneStore } from '@/state/useSceneStore'

/**
 * Sets the document cursor to a pointer while any selectable object
 * (star, planet, DSO, Sun, Moon) is hovered, and back to the default
 * otherwise. Subscribed outside React via zustand's vanilla `subscribe`
 * rather than a reactive selector — hover can change on every pointer
 * move across the sky, and a plain DOM style write needs no React
 * re-render to take effect.
 */
export function useHoverCursor(): void {
  useEffect(() => {
    return useSceneStore.subscribe((state, prevState) => {
      if (state.hoveredObjectId === prevState.hoveredObjectId) return
      document.body.style.cursor = state.hoveredObjectId ? 'pointer' : ''
    })
  }, [])
}
