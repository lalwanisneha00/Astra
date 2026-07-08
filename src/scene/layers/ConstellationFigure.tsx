import { type ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { wasDrag } from '@/scene/picking/dragGuard'
import { hitsAnotherObject } from '@/scene/picking/interactionPriority'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { Constellation } from '@/types/constellation'

const DIM_COLOR = new THREE.Color('#4a5a80')
const HIGHLIGHT_COLOR = new THREE.Color('#8ab4ff')

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
        color={isSelected ? HIGHLIGHT_COLOR : DIM_COLOR}
        transparent
        opacity={isSelected ? 0.95 : 0.35}
        depthWrite={false}
        blending={isSelected ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </lineSegments>
  )
}
