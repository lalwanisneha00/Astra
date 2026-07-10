import { Billboard, Html } from '@react-three/drei'
import { memo, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { usePulseHighlightScale } from '@/hooks/usePulseHighlightScale'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { usePickable } from '@/scene/interaction/usePickable'
import { getPlanetGlowTexture } from '@/scene/textures/planetTexture'
import { getSunTexture } from '@/scene/textures/sunMoonTexture'
import { useInteractionStore } from '@/state/useInteractionStore'
import { useLayersStore } from '@/state/useLayersStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { SunPosition } from '@/types/sunMoon'

const MARKER_SIZE = 5
const GLOW_SIZE_MULTIPLIER = 3.2
const SUN_COLOR = '#fff4d6'
const HIGHLIGHT_SCALE = 1.2
const HOVER_SCALE = 1.08
// Extra scale at the instant of selection, decaying away — see
// scene/selectionPulse.ts.
const PULSE_SCALE_BOOST = 0.5

interface SunMarkerProps {
  sun: SunPosition
}

/**
 * The Sun's own billboarded sprite — same technique as PlanetMarker,
 * but bigger and with a much stronger glow (it's the brightest thing in
 * the sky by a wide margin), and no shading gradient: a self-luminous
 * body has no terminator, unlike a planet reflecting sunlight.
 *
 * Hover and click detection are *not* implemented here — this component
 * only renders the marker and declares it pick-able (`usePickable`
 * below); `scene/interaction/InteractionManager` owns all hit-testing.
 */
export const SunMarker = memo(function SunMarker({ sun }: SunMarkerProps) {
  const isSelected = useSelectionStore(
    (state) => state.selection?.type === 'sun' && state.selection.id === 'sun',
  )
  const isHovered = useInteractionStore(
    (state) => state.hovered?.type === 'sun' && state.hovered.id === 'sun',
  )
  const showLabels = useLayersStore((state) => state.labels)
  const texture = useMemo(() => getSunTexture(), [])
  const glowTexture = useMemo(() => getPlanetGlowTexture(), [])
  const meshRef = useRef<THREE.Mesh>(null)

  const position = useMemo((): [number, number, number] => {
    const [x, y, z] = equatorialToCartesian(sun.equatorial)
    return [x * CELESTIAL_SPHERE_RADIUS, y * CELESTIAL_SPHERE_RADIUS, z * CELESTIAL_SPHERE_RADIUS]
  }, [sun.equatorial])

  const highlightRef = usePulseHighlightScale<THREE.Group>(
    isSelected,
    HIGHLIGHT_SCALE,
    PULSE_SCALE_BOOST,
    isHovered,
    HOVER_SCALE,
  )

  usePickable(meshRef, 'sun', (_index, point) => ({
    id: 'sun',
    direction: point.clone().normalize(),
  }))

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
          <mesh ref={meshRef}>
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
})
