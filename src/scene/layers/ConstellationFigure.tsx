import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { wasDrag } from '@/scene/picking/dragGuard'
import { hitsAnotherObject } from '@/scene/picking/interactionPriority'
import { selectionPulseIntensity } from '@/scene/selectionPulse'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { Constellation } from '@/types/constellation'

const DIM_COLOR = new THREE.Color('#4a5a80')
const HIGHLIGHT_COLOR = new THREE.Color('#8ab4ff')
// The brief "just selected" flash color the highlight pulses toward —
// see scene/selectionPulse.ts.
const PULSE_COLOR = new THREE.Color('#ffffff')

interface ConstellationFigureProps {
  constellation: Constellation
}

/** One constellation's line figure — its own small LineSegments object
 * (88 of these total is trivial for the GPU) so each can independently
 * react to selection and be raycast-picked on its own. */
export function ConstellationFigure({ constellation }: ConstellationFigureProps) {
  const isSelected = useSelectionStore(
    (state) => state.selection?.type === 'constellation' && state.selection.id === constellation.id,
  )
  const select = useSelectionStore((state) => state.select)
  const materialRef = useRef<THREE.LineBasicMaterial>(null)
  // Tracked inline (rather than via the shared useSelectionPulse hook)
  // to keep this at one useFrame subscription per figure, not two — see
  // DsoMarker's identical reasoning.
  const wasSelectedRef = useRef(false)
  const selectedAtRef = useRef<number | null>(null)

  useFrame((state) => {
    if (isSelected && !wasSelectedRef.current) selectedAtRef.current = state.clock.elapsedTime
    wasSelectedRef.current = isSelected

    if (!materialRef.current) return
    materialRef.current.color.copy(isSelected ? HIGHLIGHT_COLOR : DIM_COLOR)
    if (isSelected && selectedAtRef.current !== null) {
      const pulse = selectionPulseIntensity(state.clock.elapsedTime - selectedAtRef.current)
      if (pulse > 0) materialRef.current.color.lerp(PULSE_COLOR, pulse)
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

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (wasDrag()) return
    // See interactionPriority.ts's doc comment: a constellation line
    // passing near a DSO/planet marker (e.g. Orion's sword right next
    // to M42) can otherwise out-rank and swallow a click meant for that
    // marker. Defer if this same ray also hit something with its own
    // handler.
    if (hitsAnotherObject(event.intersections, event.eventObject)) return
    event.stopPropagation()
    select({ type: 'constellation', id: constellation.id })
  }

  return (
    <lineSegments onClick={handleClick}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        ref={materialRef}
        transparent
        opacity={isSelected ? 0.95 : 0.35}
        depthWrite={false}
        blending={isSelected ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </lineSegments>
  )
}
