import { equatorialToHorizontal } from '@/astronomy/horizontal'
import { usePlanetPositions } from '@/hooks/usePlanetPositions'
import { PlanetMarker } from '@/scene/layers/PlanetMarker'
import { useLayersStore } from '@/state/useLayersStore'
import type { ObserverLocation } from '@/types/coordinates'

interface PlanetsLayerProps {
  observer: ObserverLocation | null
  date: Date
}

/** Only 7 bodies, so — unlike StarsLayer's GPU-side horizon discard,
 * which exists specifically because 40,000+ stars made CPU filtering and
 * geometry remounts too expensive — a plain CPU altitude check per
 * planet per recompute is trivial and doesn't need the same treatment. */
export function PlanetsLayer({ observer, date }: PlanetsLayerProps) {
  const showPlanets = useLayersStore((state) => state.planets)
  const planets = usePlanetPositions(date)

  if (!showPlanets) return null

  return (
    <>
      {planets.map((planet) => {
        if (observer && equatorialToHorizontal(planet.equatorial, observer, date).altitude < 0) {
          return null
        }
        return <PlanetMarker key={planet.id} planet={planet} date={date} />
      })}
    </>
  )
}
