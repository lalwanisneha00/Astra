import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import { selectionPulseIntensity } from '@/scene/selectionPulse'

/**
 * Tracks a brief, decaying "just selected" pulse for one object: starts
 * at 1 the moment `isSelected` transitions from false to true, and
 * decays smoothly to 0 over `SELECTION_PULSE_DURATION_SECONDS` (see
 * scene/selectionPulse.ts). Returned as a ref, read imperatively inside
 * the caller's own per-frame update — mirroring this app's established
 * pattern for per-frame visual state (e.g. DsoMarker's opacity damping)
 * rather than reactive state, so it never forces a re-render.
 */
export function useSelectionPulse(isSelected: boolean): RefObject<number> {
  const wasSelectedRef = useRef(false)
  const selectedAtRef = useRef<number | null>(null)
  const pulseRef = useRef(0)

  useFrame((state) => {
    if (isSelected && !wasSelectedRef.current) {
      selectedAtRef.current = state.clock.elapsedTime
    }
    wasSelectedRef.current = isSelected

    pulseRef.current =
      isSelected && selectedAtRef.current !== null
        ? selectionPulseIntensity(state.clock.elapsedTime - selectedAtRef.current)
        : 0
  })

  return pulseRef
}
