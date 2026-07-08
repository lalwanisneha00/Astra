import { useMemo } from 'react'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { computePlanetPath, type PlanetId } from '@/astronomy/planets'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'

const TRAIL_HALF_SPAN_DAYS = 90
const TRAIL_STEP_DAYS = 4

interface PlanetOrbitTrailProps {
  id: PlanetId
  date: Date
  color: string
}

/** A faint line tracing the planet's own apparent path across the sky
 * over roughly six months — the meaningful "orbit" visualization this
 * observer-centered sphere model can show. There's no 3D solar-system
 * view here (see SceneCanvas), so a true heliocentric ellipse has no
 * on-sky representation, but the apparent path — including retrograde
 * loops for the outer planets — does. Recomputed via useMemo keyed on
 * date, same as GridLayer/HorizonLayer: a few dozen astronomy-engine
 * calls, never per-frame, nowhere near the scale that needed the star
 * catalog's GPU-side approach. */
export function PlanetOrbitTrail({ id, date, color }: PlanetOrbitTrailProps) {
  const positions = useMemo(() => {
    const path = computePlanetPath(id, date, TRAIL_HALF_SPAN_DAYS, TRAIL_STEP_DAYS)
    const array = new Float32Array(path.length * 3)
    path.forEach((coord, i) => {
      const [x, y, z] = equatorialToCartesian(coord)
      array[i * 3] = x * CELESTIAL_SPHERE_RADIUS
      array[i * 3 + 1] = y * CELESTIAL_SPHERE_RADIUS
      array[i * 3 + 2] = z * CELESTIAL_SPHERE_RADIUS
    })
    return array
  }, [id, date])

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} />
    </line>
  )
}
