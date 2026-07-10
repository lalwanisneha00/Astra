import { Canvas } from '@react-three/fiber'
import { equatorialToHorizontal } from '@/astronomy/horizontal'
import type { StarCatalog } from '@/hooks/useStarCatalog'
import { CameraController } from '@/scene/camera/CameraController'
import { ConstellationLayer } from '@/scene/layers/ConstellationLayer'
import { DeepSkyLayer } from '@/scene/layers/DeepSkyLayer'
import { GridLayer } from '@/scene/layers/GridLayer'
import { HorizonLayer } from '@/scene/layers/HorizonLayer'
import { InteractionManager } from '@/scene/interaction/InteractionManager'
import { LabelsLayer } from '@/scene/layers/LabelsLayer'
import { MoonMarker } from '@/scene/layers/MoonMarker'
import { PlanetsLayer } from '@/scene/layers/PlanetsLayer'
import { StarLabelsLayer } from '@/scene/layers/StarLabelsLayer'
import { StarsLayer } from '@/scene/layers/StarsLayer'
import { SunMarker } from '@/scene/layers/SunMarker'
import type { Constellation } from '@/types/constellation'
import type { ObserverLocation } from '@/types/coordinates'
import type { DeepSkyObject } from '@/types/deepSkyObject'
import type { MoonPosition, SunPosition } from '@/types/sunMoon'

const INITIAL_FOV = 75
const NEAR_PLANE = 0.1
const FAR_PLANE = 500

// Matches --color-space-950 in src/styles/tokens.css.
const BACKGROUND_COLOR = '#04060c'

interface SceneCanvasProps {
  starCatalog: StarCatalog
  constellations: Constellation[]
  deepSkyObjects: DeepSkyObject[]
  sun: SunPosition
  moon: MoonPosition
  observer: ObserverLocation | null
  date: Date
  horizonCullingEnabled: boolean
  altitudes: Float32Array | null
}

/**
 * The camera always sits at the origin, at the center of the celestial
 * sphere: panning rotates it, zoom changes its FOV, and it never dollies
 * forward or back. See ARCHITECTURE.md for the full rendering model.
 */
export function SceneCanvas({
  starCatalog,
  constellations,
  deepSkyObjects,
  sun,
  moon,
  observer,
  date,
  horizonCullingEnabled,
  altitudes,
}: SceneCanvasProps) {
  const isAboveHorizon = (equatorial: { ra: number; dec: number }) =>
    !observer || equatorialToHorizontal(equatorial, observer, date).altitude >= 0

  return (
    <Canvas
      className="absolute inset-0 z-0 touch-none"
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: INITIAL_FOV, near: NEAR_PLANE, far: FAR_PLANE, position: [0, 0, 0] }}
    >
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <CameraController />
      <InteractionManager />
      {/* Rendered before StarsLayer so bright star points sit visually on
          top of the dimmer connecting lines/grids. */}
      <GridLayer observer={observer} date={date} />
      <ConstellationLayer constellations={constellations} />
      <StarsLayer
        catalog={starCatalog}
        horizonCullingEnabled={horizonCullingEnabled}
        altitudes={altitudes}
        explorationEnabled
      />
      <LabelsLayer constellations={constellations} />
      <StarLabelsLayer
        stars={starCatalog.stars}
        observer={observer}
        date={date}
        explorationEnabled
      />
      <DeepSkyLayer objects={deepSkyObjects} observer={observer} date={date} />
      <PlanetsLayer observer={observer} date={date} />
      {isAboveHorizon(sun.equatorial) && <SunMarker sun={sun} />}
      {isAboveHorizon(moon.equatorial) && <MoonMarker moon={moon} />}
      <HorizonLayer observer={observer} date={date} />
    </Canvas>
  )
}
