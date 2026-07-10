import { useMemo } from 'react'
import { equatorialToHorizontal } from '@/astronomy/horizontal'
import { DsoMarker } from '@/scene/layers/DsoMarker'
import { useLayersStore } from '@/state/useLayersStore'
import type { ObserverLocation } from '@/types/coordinates'
import type { DeepSkyObject } from '@/types/deepSkyObject'

interface DeepSkyLayerProps {
  objects: DeepSkyObject[]
  observer: ObserverLocation | null
  date: Date
}

/** ~500 curated objects — cheap enough for a plain CPU altitude check per
 * object per recompute (memoized on date/observer change, not per
 * frame), same reasoning as PlanetsLayer: this scale never needed the
 * GPU-side discard StarsLayer's 40,000+ stars required. */
export function DeepSkyLayer({ objects, observer, date }: DeepSkyLayerProps) {
  const showDeepSky = useLayersStore((state) => state.deepSky)
  // The Earth-to-Universe progressive reveal now applies in both modes
  // — in observer mode it composes with the horizon filter below rather
  // than replacing it, so Today's Night Sky starts at the same
  // naked-eye baseline and reveals further exactly like Explore Mode.
  const explorationEnabled = true

  const visibleObjects = useMemo(() => {
    if (!observer) return objects
    return objects.filter(
      (dso) => equatorialToHorizontal(dso.equatorial, observer, date).altitude >= 0,
    )
  }, [objects, observer, date])

  if (!showDeepSky) return null

  return (
    <>
      {visibleObjects.map((dso) => (
        <DsoMarker key={dso.id} dso={dso} explorationEnabled={explorationEnabled} />
      ))}
    </>
  )
}
