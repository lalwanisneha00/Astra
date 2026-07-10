import { Billboard, Html } from '@react-three/drei'
import { type ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { usePulseHighlightScale } from '@/hooks/usePulseHighlightScale'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { wasDrag } from '@/scene/picking/dragGuard'
import { PICK_PRIORITY } from '@/scene/picking/interactionPriority'
import { getPlanetGlowTexture } from '@/scene/textures/planetTexture'
import { getSunTexture } from '@/scene/textures/sunMoonTexture'
import { useLayersStore } from '@/state/useLayersStore'
import { useSceneStore } from '@/state/useSceneStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { SunPosition } from '@/types/sunMoon'

const MARKER_SIZE = 5
const GLOW_SIZE_MULTIPLIER = 3.2
const SUN_COLOR = '#fff4d6'
const HIGHLIGHT_SCALE = 1.2
// Extra scale at the instant of selection, decaying away — see
// scene/selectionPulse.ts.
const PULSE_SCALE_BOOST = 0.5

interface SunMarkerProps {
  sun: SunPosition
}

/** The Sun's own billboarded sprite — same technique as PlanetMarker,
 * but bigger and with a much stronger glow (it's the brightest thing in
 * the sky by a wide margin), and no shading gradient: a self-luminous
 * body has no terminator, unlike a planet reflecting sunlight. */
export function SunMarker({ sun }: SunMarkerProps) {
  const isSelected = useSelectionStore(
    (state) => state.selection?.type === 'sun' && state.selection.id === 'sun',
  )
  const select = useSelectionStore((state) => state.select)
  const setHoveredObjectId = useSceneStore((state) => state.setHoveredObjectId)
  const showLabels = useLayersStore((state) => state.labels)
  const texture = useMemo(() => getSunTexture(), [])
  const glowTexture = useMemo(() => getPlanetGlowTexture(), [])

  const position = useMemo((): [number, number, number] => {
    const [x, y, z] = equatorialToCartesian(sun.equatorial)
    return [x * CELESTIAL_SPHERE_RADIUS, y * CELESTIAL_SPHERE_RADIUS, z * CELESTIAL_SPHERE_RADIUS]
  }, [sun.equatorial])

  const highlightRef = usePulseHighlightScale<THREE.Group>(
    isSelected,
    HIGHLIGHT_SCALE,
    PULSE_SCALE_BOOST,
  )

  // A release, not `onClick` — see StarsLayer's detailed comment on why
  // react-three-fiber's own `onClick` unreliably drops clicks in a scene
  // with continuous camera easing between pointerdown and the click
  // event.
  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (wasDrag()) return
    event.stopPropagation()
    select({ type: 'sun', id: 'sun' })
  }

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    setHoveredObjectId('sun')
  }

  function handlePointerOut() {
    setHoveredObjectId(null)
  }

  return (
    <group>
      <Billboard position={position}>
        <group ref={highlightRef}>
          <mesh position={[0, 0, -0.05]}>
            <planeGeometry
              args={[MARKER_SIZE * GLOW_SIZE_MULTIPLIER, MARKER_SIZE * GLOW_SIZE_MULTIPLIER]}
            />
            <meshBasicMaterial
              map={glowTexture}
              color={SUN_COLOR}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh
            userData={{ pickPriority: PICK_PRIORITY.precise }}
            onPointerUp={handlePointerUp}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <planeGeometry args={[MARKER_SIZE, MARKER_SIZE]} />
            <meshBasicMaterial
              map={texture}
              color={SUN_COLOR}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </Billboard>
      {showLabels && (
        <Html position={position} center style={{ pointerEvents: 'none' }}>
          <span className="block translate-y-4 text-center text-[10px] tracking-wide whitespace-nowrap text-star-300 uppercase select-none">
            Sun
          </span>
        </Html>
      )}
    </group>
  )
}
