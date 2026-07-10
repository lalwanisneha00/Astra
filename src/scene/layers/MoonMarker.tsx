import { Billboard, Html } from '@react-three/drei'
import { type ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import type * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { usePulseHighlightScale } from '@/hooks/usePulseHighlightScale'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { wasDrag } from '@/scene/picking/dragGuard'
import { createMoonPhaseTexture } from '@/scene/textures/sunMoonTexture'
import { useLayersStore } from '@/state/useLayersStore'
import { useSceneStore } from '@/state/useSceneStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { MoonPosition } from '@/types/sunMoon'

const MARKER_SIZE = 4
const HIGHLIGHT_SCALE = 1.3
// Extra scale at the instant of selection, decaying away — see
// scene/selectionPulse.ts.
const PULSE_SCALE_BOOST = 0.5
// Round to a coarse step before regenerating the phase texture, so tiny
// float changes between adjacent date ticks don't force a fresh canvas
// draw for a visually-identical disc.
const ILLUMINATION_STEP = 0.02

interface MoonMarkerProps {
  moon: MoonPosition
}

/** The Moon's own billboarded sprite, textured with a phase-accurate
 * disc (see scene/textures/sunMoonTexture.ts) that's regenerated — not
 * cached like other sprites — whenever the phase changes meaningfully,
 * since unlike every other marker in this app, the Moon's own
 * appearance genuinely changes from night to night. */
export function MoonMarker({ moon }: MoonMarkerProps) {
  const isSelected = useSelectionStore(
    (state) => state.selection?.type === 'moon' && state.selection.id === 'moon',
  )
  const select = useSelectionStore((state) => state.select)
  const setHoveredObjectId = useSceneStore((state) => state.setHoveredObjectId)
  const showLabels = useLayersStore((state) => state.labels)

  const roundedIllumination = Math.round(moon.illumination / ILLUMINATION_STEP) * ILLUMINATION_STEP
  const waxing = moon.phaseAngle < 180

  const texture = useMemo(
    () => createMoonPhaseTexture(roundedIllumination, waxing),
    [roundedIllumination, waxing],
  )

  const position = useMemo((): [number, number, number] => {
    const [x, y, z] = equatorialToCartesian(moon.equatorial)
    return [x * CELESTIAL_SPHERE_RADIUS, y * CELESTIAL_SPHERE_RADIUS, z * CELESTIAL_SPHERE_RADIUS]
  }, [moon.equatorial])

  const highlightRef = usePulseHighlightScale<THREE.Mesh>(
    isSelected,
    HIGHLIGHT_SCALE,
    PULSE_SCALE_BOOST,
  )

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (wasDrag()) return
    event.stopPropagation()
    select({ type: 'moon', id: 'moon' })
  }

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    setHoveredObjectId('moon')
  }

  function handlePointerOut() {
    setHoveredObjectId(null)
  }

  return (
    <group>
      <Billboard position={position}>
        <mesh
          ref={highlightRef}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[MARKER_SIZE, MARKER_SIZE]} />
          <meshBasicMaterial map={texture} transparent depthWrite={false} />
        </mesh>
      </Billboard>
      {showLabels && (
        <Html position={position} center style={{ pointerEvents: 'none' }}>
          <span className="block translate-y-3 text-center text-[10px] tracking-wide whitespace-nowrap text-star-300 uppercase select-none">
            Moon
          </span>
        </Html>
      )}
    </group>
  )
}
