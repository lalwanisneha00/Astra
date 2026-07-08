import { useMemo } from 'react'
import { equatorialToCartesian } from '@/astronomy/coordinates'
import { horizontalToEquatorial } from '@/astronomy/horizontal'
import { CELESTIAL_SPHERE_RADIUS } from '@/scene/constants'
import { useLayersStore } from '@/state/useLayersStore'
import type { EquatorialCoord, ObserverLocation } from '@/types/coordinates'

const SAMPLE_STEP_DEG = 5
const RA_LINE_COUNT = 12
const DEC_LINES = [-60, -30, 0, 30, 60]
const AZIMUTH_LINE_COUNT = 12
const ALTITUDE_CIRCLES = [30, 60]

const EQUATORIAL_GRID_COLOR = '#3a5a7a'
const HORIZONTAL_GRID_COLOR = '#7a5a3a'

function equatorialPoint(ra: number, dec: number): [number, number, number] {
  const [x, y, z] = equatorialToCartesian({ ra, dec })
  return [x * CELESTIAL_SPHERE_RADIUS, y * CELESTIAL_SPHERE_RADIUS, z * CELESTIAL_SPHERE_RADIUS]
}

function pushEquatorialSegment(points: number[], a: EquatorialCoord, b: EquatorialCoord) {
  points.push(...equatorialPoint(a.ra, a.dec), ...equatorialPoint(b.ra, b.dec))
}

/** RA meridians + Dec parallels — fixed relative to the stars, computed
 * once (no observer/time dependency). */
function buildEquatorialGrid(): Float32Array {
  const points: number[] = []

  for (let i = 0; i < RA_LINE_COUNT; i++) {
    const ra = (360 / RA_LINE_COUNT) * i
    for (let dec = -85; dec < 85; dec += SAMPLE_STEP_DEG) {
      pushEquatorialSegment(points, { ra, dec }, { ra, dec: Math.min(dec + SAMPLE_STEP_DEG, 85) })
    }
  }

  for (const dec of DEC_LINES) {
    for (let ra = 0; ra < 360; ra += SAMPLE_STEP_DEG) {
      pushEquatorialSegment(points, { ra, dec }, { ra: ra + SAMPLE_STEP_DEG, dec })
    }
  }

  return new Float32Array(points)
}

/** Azimuth meridians (horizon to zenith) + altitude circles — these
 * depend on the observer's location and the current time, since the
 * horizontal frame is anchored to the local horizon, not the stars. */
function buildHorizontalGrid(observer: ObserverLocation, date: Date): Float32Array {
  const points: number[] = []
  const toEquatorial = (altitude: number, azimuth: number) =>
    horizontalToEquatorial({ altitude, azimuth }, observer, date)

  for (let i = 0; i < AZIMUTH_LINE_COUNT; i++) {
    const azimuth = (360 / AZIMUTH_LINE_COUNT) * i
    for (let altitude = 0; altitude < 90; altitude += SAMPLE_STEP_DEG) {
      pushEquatorialSegment(
        points,
        toEquatorial(altitude, azimuth),
        toEquatorial(Math.min(altitude + SAMPLE_STEP_DEG, 90), azimuth),
      )
    }
  }

  for (const altitude of ALTITUDE_CIRCLES) {
    for (let azimuth = 0; azimuth < 360; azimuth += SAMPLE_STEP_DEG) {
      pushEquatorialSegment(
        points,
        toEquatorial(altitude, azimuth),
        toEquatorial(altitude, azimuth + SAMPLE_STEP_DEG),
      )
    }
  }

  return new Float32Array(points)
}

interface GridLayerProps {
  observer: ObserverLocation | null
  date: Date
}

export function GridLayer({ observer, date }: GridLayerProps) {
  const showEquatorial = useLayersStore((state) => state.equatorialGrid)
  const showHorizontal = useLayersStore((state) => state.horizontalGrid)

  const equatorialPositions = useMemo(() => buildEquatorialGrid(), [])
  const horizontalPositions = useMemo(
    () => (observer ? buildHorizontalGrid(observer, date) : null),
    [observer, date],
  )

  return (
    <>
      {showEquatorial && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[equatorialPositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color={EQUATORIAL_GRID_COLOR}
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        </lineSegments>
      )}
      {showHorizontal && horizontalPositions && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[horizontalPositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color={HORIZONTAL_GRID_COLOR}
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </>
  )
}
