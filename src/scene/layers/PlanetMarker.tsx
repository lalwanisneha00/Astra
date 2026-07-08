import { Html } from '@react-three/drei'
import { type ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import type { PlanetId } from '@/astronomy/planets'
import { PLANET_CONTENT } from '@/content/planets'
import { PlanetOrbitTrail } from '@/scene/layers/PlanetOrbitTrail'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { useSceneStore } from '@/state/useSceneStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { Planet } from '@/types/planet'

const MARKER_RADIUS = 1.6
const HIGHLIGHT_SCALE = 1.6

interface PlanetMarkerProps {
  planet: Planet
  date: Date
}

/** One planet's own small sphere mesh — following ConstellationFigure's
 * precedent for individually-clickable, independently-selectable objects
 * (as opposed to StarsLayer's single-buffer approach, which only makes
 * sense at star-catalog scale). A plain sphere (rather than a billboarded
 * sprite) looks like a circle from any viewing angle for free, so no
 * camera-facing plane/texture is needed. */
export function PlanetMarker({ planet, date }: PlanetMarkerProps) {
  const isSelected = useSelectionStore(
    (state) => state.selection?.type === 'planet' && state.selection.id === planet.id,
  )
  const select = useSelectionStore((state) => state.select)
  const setHoveredObjectId = useSceneStore((state) => state.setHoveredObjectId)
  const content = PLANET_CONTENT[planet.id]
  const color = content?.colorHex ?? '#ffffff'

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
      <PlanetOrbitTrail id={planet.id as PlanetId} date={date} color={color} />
      <mesh
        position={position}
        scale={isSelected ? HIGHLIGHT_SCALE : 1}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[MARKER_RADIUS, 16, 16]} />
        <meshBasicMaterial color={isSelected ? '#ffffff' : color} />
      </mesh>
      <Html position={position} center style={{ pointerEvents: 'none' }}>
        <span className="block translate-y-3 text-center text-[10px] tracking-wide whitespace-nowrap text-star-300 uppercase select-none">
          {planet.name}
        </span>
      </Html>
    </group>
  )
}
