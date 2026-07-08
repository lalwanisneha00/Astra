import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { horizontalToEquatorial } from '@/astronomy/horizontal'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { useLayersStore } from '@/state/useLayersStore'
import type { ObserverLocation } from '@/types/coordinates'

const SAMPLE_STEP_DEG = 3
const HORIZON_RING_COLOR = '#c98a4b'

const CARDINALS: Array<{ label: string; azimuth: number }> = [
  { label: 'N', azimuth: 0 },
  { label: 'E', azimuth: 90 },
  { label: 'S', azimuth: 180 },
  { label: 'W', azimuth: 270 },
]

function toWorldPosition(
  altitude: number,
  azimuth: number,
  observer: ObserverLocation,
  date: Date,
): [number, number, number] {
  const equatorial = horizontalToEquatorial({ altitude, azimuth }, observer, date)
  const [x, y, z] = equatorialToCartesian(equatorial)
  return [x * CELESTIAL_SPHERE_RADIUS, y * CELESTIAL_SPHERE_RADIUS, z * CELESTIAL_SPHERE_RADIUS]
}

function buildHorizonRing(observer: ObserverLocation, date: Date): Float32Array {
  const points: number[] = []
  for (let azimuth = 0; azimuth < 360; azimuth += SAMPLE_STEP_DEG) {
    points.push(...toWorldPosition(0, azimuth, observer, date))
    points.push(...toWorldPosition(0, azimuth + SAMPLE_STEP_DEG, observer, date))
  }
  return new Float32Array(points)
}

interface HorizonLayerProps {
  observer: ObserverLocation | null
  date: Date
}

/** The horizon ring (Alt=0 great circle) and N/S/E/W cardinal labels —
 * both anchored to the observer's local horizon, so both depend on
 * observer location and current time exactly like GridLayer's
 * horizontal grid. */
export function HorizonLayer({ observer, date }: HorizonLayerProps) {
  const showHorizon = useLayersStore((state) => state.horizontalGrid)

  const ringPositions = useMemo(
    () => (observer ? buildHorizonRing(observer, date) : null),
    [observer, date],
  )

  const cardinalPositions = useMemo(
    () =>
      observer
        ? CARDINALS.map((cardinal) => ({
            ...cardinal,
            position: toWorldPosition(0, cardinal.azimuth, observer, date),
          }))
        : [],
    [observer, date],
  )

  if (!showHorizon || !observer || !ringPositions) return null

  return (
    <>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ringPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={HORIZON_RING_COLOR}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </lineSegments>
      {cardinalPositions.map((cardinal) => (
        <Html
          key={cardinal.label}
          position={cardinal.position}
          center
          style={{ pointerEvents: 'none' }}
        >
          <span className="text-[11px] font-semibold tracking-wide text-[#c98a4b] select-none">
            {cardinal.label}
          </span>
        </Html>
      ))}
    </>
  )
}
