import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { usePickable } from '@/scene/interaction/usePickable'
import { selectionPulseIntensity } from '@/scene/selectionPulse'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { useInteractionStore } from '@/state/useInteractionStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { Constellation } from '@/types/constellation'

const DIM_COLOR = new THREE.Color('#4a5a80')
const HOVER_COLOR = new THREE.Color('#6f8cc9')
const HIGHLIGHT_COLOR = new THREE.Color('#8ab4ff')
// The brief "just selected" flash color the highlight pulses toward —
// see scene/selectionPulse.ts.
const PULSE_COLOR = new THREE.Color('#ffffff')

const DIM_OPACITY = 0.35
const HOVER_OPACITY = 0.6
const SELECTED_OPACITY = 0.95

interface ConstellationFigureProps {
  constellation: Constellation
}

/**
 * One constellation's line figure — its own small LineSegments object
 * (88 of these total is trivial for the GPU) so each can independently
 * react to hover/selection and be pick-tested on its own.
 *
 * Hover and click detection are *not* implemented here — this component
 * only renders the figure and declares it pick-able (`usePickable`
 * below); `scene/interaction/InteractionManager` owns all hit-testing.
 */
export function ConstellationFigure({ constellation }: ConstellationFigureProps) {
  const isSelected = useSelectionStore(
    (state) => state.selection?.type === 'constellation' && state.selection.id === constellation.id,
  )
  const isHovered = useInteractionStore(
    (state) => state.hovered?.type === 'constellation' && state.hovered.id === constellation.id,
  )
  const lineRef = useRef<THREE.LineSegments>(null)
  const materialRef = useRef<THREE.LineBasicMaterial>(null)
  // Tracked inline (rather than via the shared useSelectionPulse hook)
  // to keep this at one useFrame subscription per figure, not two — see
  // DsoMarker's identical reasoning.
  const wasSelectedRef = useRef(false)
  const wasHoveredRef = useRef(false)
  const selectedAtRef = useRef<number | null>(null)

  useFrame((state) => {
    if (!materialRef.current) return

    const stateChanged =
      isSelected !== wasSelectedRef.current || isHovered !== wasHoveredRef.current
    if (isSelected && !wasSelectedRef.current) selectedAtRef.current = state.clock.elapsedTime
    wasSelectedRef.current = isSelected
    wasHoveredRef.current = isHovered

    // Skip entirely once settled, unhovered, and unselected — of up to
    // 88 constellations, only a handful are ever hovered/selected at
    // once, so the rest have no per-frame color work to do at all
    // outside the single frame they transition away from either state.
    if (!isSelected && !isHovered && !stateChanged) return

    if (isSelected) {
      materialRef.current.color.copy(HIGHLIGHT_COLOR)
      if (selectedAtRef.current !== null) {
        const pulse = selectionPulseIntensity(state.clock.elapsedTime - selectedAtRef.current)
        if (pulse > 0) materialRef.current.color.lerp(PULSE_COLOR, pulse)
      }
    } else if (isHovered) {
      materialRef.current.color.copy(HOVER_COLOR)
    } else {
      materialRef.current.color.copy(DIM_COLOR)
    }
  })

  const positions = useMemo(() => {
    const { lines } = constellation
    const vertexCount = lines.length / 2
    const array = new Float32Array(vertexCount * 3)

    for (let i = 0; i < vertexCount; i++) {
      const ra = lines[i * 2] ?? 0
      const dec = lines[i * 2 + 1] ?? 0
      const [x, y, z] = equatorialToCartesian({ ra, dec })
      array[i * 3] = x * CELESTIAL_SPHERE_RADIUS
      array[i * 3 + 1] = y * CELESTIAL_SPHERE_RADIUS
      array[i * 3 + 2] = z * CELESTIAL_SPHERE_RADIUS
    }

    return array
  }, [constellation])

  usePickable(lineRef, 'constellation', (_index, point) => ({
    id: constellation.id,
    // Constellations have no single "true position" the way a star or
    // marker does (a whole line figure, not one point) — the raycast's
    // own hit point (where the ray actually crosses the nearest
    // segment) is the most meaningful "direction" to compare against
    // other candidates here.
    direction: point.clone().normalize(),
  }))

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        ref={materialRef}
        transparent
        opacity={isSelected ? SELECTED_OPACITY : isHovered ? HOVER_OPACITY : DIM_OPACITY}
        depthWrite={false}
        blending={isSelected ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </lineSegments>
  )
}
