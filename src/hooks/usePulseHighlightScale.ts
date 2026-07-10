import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import type { Object3D } from 'three'
import { useSelectionPulse } from './useSelectionPulse'

/**
 * Drives an Object3D's uniform scale toward `baseScale` when selected
 * (with a brief extra pulse boost layered on top at the instant of
 * selection that decays away, see scene/selectionPulse.ts), toward
 * `hoverScale` when merely hovered (not selected), or 1 otherwise —
 * attach the returned ref to the group/mesh whose scale should reflect
 * hover/selection. Used by the billboard markers (planet/Sun/Moon) that
 * have no other per-frame work of their own; DSOs drive their own scale
 * inline alongside their existing opacity-fade `useFrame`.
 */
export function usePulseHighlightScale<T extends Object3D>(
  isSelected: boolean,
  baseScale: number,
  pulseBoost: number,
  isHovered: boolean,
  hoverScale: number,
): RefObject<T | null> {
  const objectRef = useRef<T>(null)
  const pulseRef = useSelectionPulse(isSelected)

  useFrame(() => {
    if (!objectRef.current) return
    const scale = isSelected
      ? baseScale + pulseRef.current * pulseBoost
      : isHovered
        ? hoverScale
        : 1
    objectRef.current.scale.setScalar(scale)
  })

  return objectRef
}
