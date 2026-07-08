import { Billboard, Html } from '@react-three/drei'
import { type ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import type { PlanetId } from '@/astronomy/planets'
import { PLANET_CONTENT } from '@/content/planets'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { PlanetOrbitTrail } from '@/scene/layers/PlanetOrbitTrail'
import { getPlanetGlowTexture, getPlanetTexture } from '@/scene/textures/planetTexture'
import { useSceneStore } from '@/state/useSceneStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { Planet } from '@/types/planet'

const BASE_MARKER_SIZE = 3.2
const GLOW_SIZE_MULTIPLIER = 2.1
const HIGHLIGHT_SCALE = 1.35
const HIGHLIGHT_BLEND = 0.45

interface PlanetMarkerProps {
  planet: Planet
  date: Date
}

/**
 * One planet's own billboarded sprite — a camera-facing plane textured
 * with a pre-shaded circular "sphere" (see scene/textures/planetTexture)
 * — rather than a true 3D sphere mesh. A real sphere renders as a
 * visible ellipse once it's off-center at this app's wider zoomed-out
 * FOVs (20-100 degrees, see CameraController's MIN_FOV/MAX_FOV): a real
 * effect of perspective projection, not a bug, but one that reads as
 * "flat and wrong" for a small on-screen dot meant to represent a
 * planet. A billboard sidesteps it entirely, since it's always drawn
 * face-on to the camera regardless of where it sits on screen. Follows
 * ConstellationFigure's precedent for individually-clickable,
 * independently-selectable per-object meshes (as opposed to StarsLayer's
 * single-buffer approach, which only makes sense at star-catalog scale).
 *
 * Gas giants get cloud-band texturing and Saturn gets its rings baked
 * into a per-style sprite (PLANET_CONTENT.visualStyle); marker size
 * varies per planet (PLANET_CONTENT.relativeSize) for visual variety —
 * not a true diameter ratio, which would make the rocky planets
 * invisible next to Jupiter at this scale. A soft additive glow sprite
 * sits behind the body for an atmospheric-halo feel.
 */
export function PlanetMarker({ planet, date }: PlanetMarkerProps) {
  const isSelected = useSelectionStore(
    (state) => state.selection?.type === 'planet' && state.selection.id === planet.id,
  )
  const select = useSelectionStore((state) => state.select)
  const setHoveredObjectId = useSceneStore((state) => state.setHoveredObjectId)
  const content = PLANET_CONTENT[planet.id]
  const baseColor = content?.colorHex ?? '#ffffff'
  const visualStyle = content?.visualStyle ?? 'rocky'
  const markerSize = BASE_MARKER_SIZE * (content?.relativeSize ?? 1)
  const texture = useMemo(() => getPlanetTexture(visualStyle), [visualStyle])
  const glowTexture = useMemo(() => getPlanetGlowTexture(), [])

  const color = useMemo(() => {
    const base = new THREE.Color(baseColor)
    return isSelected ? base.lerp(new THREE.Color('#ffffff'), HIGHLIGHT_BLEND) : base
  }, [baseColor, isSelected])

  const position = useMemo((): [number, number, number] => {
    const [x, y, z] = equatorialToCartesian(planet.equatorial)
    return [x * CELESTIAL_SPHERE_RADIUS, y * CELESTIAL_SPHERE_RADIUS, z * CELESTIAL_SPHERE_RADIUS]
  }, [planet.equatorial])

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    select({ type: 'planet', id: planet.id })
  }

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    setHoveredObjectId(planet.id)
  }

  function handlePointerOut() {
    setHoveredObjectId(null)
  }

  return (
    <group>
      <PlanetOrbitTrail id={planet.id as PlanetId} date={date} color={baseColor} />
      <Billboard position={position}>
        <mesh position={[0, 0, -0.05]} scale={isSelected ? HIGHLIGHT_SCALE : 1}>
          <planeGeometry
            args={[markerSize * GLOW_SIZE_MULTIPLIER, markerSize * GLOW_SIZE_MULTIPLIER]}
          />
          <meshBasicMaterial
            map={glowTexture}
            color={color}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh
          scale={isSelected ? HIGHLIGHT_SCALE : 1}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[markerSize, markerSize]} />
          <meshBasicMaterial map={texture} color={color} transparent depthWrite={false} />
        </mesh>
      </Billboard>
      <Html position={position} center style={{ pointerEvents: 'none' }}>
        <span className="block translate-y-3 text-center text-[10px] tracking-wide whitespace-nowrap text-star-300 uppercase select-none">
          {planet.name}
        </span>
      </Html>
    </group>
  )
}
