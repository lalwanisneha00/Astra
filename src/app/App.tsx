import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { horizontalToEquatorial } from '@/astronomy/horizontal'
import { useConstellations } from '@/hooks/useConstellations'
import { useHorizonCulling } from '@/hooks/useHorizonCulling'
import { useStarCatalog } from '@/hooks/useStarCatalog'
import { useVisibleConstellations } from '@/hooks/useVisibleConstellations'
import { SceneCanvas } from '@/scene/Canvas/SceneCanvas'
import { useLocationStore } from '@/state/useLocationStore'
import { useSceneStore } from '@/state/useSceneStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import { useTimeStore } from '@/state/useTimeStore'
import type { ObserverLocation } from '@/types/coordinates'
import { LocationPicker } from '@/ui/controls/LocationPicker'
import { TimeSlider } from '@/ui/controls/TimeSlider'
import { TodayButton } from '@/ui/controls/TodayButton'
import { ConstellationPanel } from '@/ui/panels/ConstellationPanel'
import { StarPanel } from '@/ui/panels/StarPanel'
import { GlassPanel } from '@/ui/primitives/GlassPanel'
import { APP_NAME } from './constants'
import { ErrorBoundary } from './ErrorBoundary'

const MAX_RELATED_STARS = 5
// A comfortable, unremarkable default view when entering observer mode
// — roughly south and partway up the sky, not straight at the horizon
// or the zenith.
const DEFAULT_OBSERVER_VIEW = { altitude: 30, azimuth: 180 }

export function App() {
  const starCatalog = useStarCatalog()
  const constellations = useConstellations()
  const selection = useSelectionStore((state) => state.selection)
  const clearSelection = useSelectionStore((state) => state.clearSelection)
  const select = useSelectionStore((state) => state.select)
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  const mode = useTimeStore((state) => state.mode)
  const currentDate = useTimeStore((state) => state.currentDate)
  const latitude = useLocationStore((state) => state.latitude)
  const longitude = useLocationStore((state) => state.longitude)
  const setLocation = useLocationStore((state) => state.setLocation)

  const observer = useMemo<ObserverLocation | null>(
    () =>
      mode === 'observer' && latitude !== null && longitude !== null
        ? { latitude, longitude }
        : null,
    [mode, latitude, longitude],
  )

  // Elegant transition into observer mode: ease the camera to look
  // roughly south rather than leaving it pointed wherever explore mode
  // happened to be facing. Reads currentDate imperatively (not as a
  // dependency) so this only re-fires when the observer itself changes,
  // not on every tick once Phase 8 adds continuous time.
  useEffect(() => {
    if (!observer) return
    const date = useTimeStore.getState().currentDate
    const target = horizontalToEquatorial(DEFAULT_OBSERVER_VIEW, observer, date)
    useSceneStore.getState().setFlyToTarget(target)
  }, [observer])

  const horizonCullingEnabled = observer !== null
  const altitudes = useHorizonCulling(
    starCatalog.stars,
    horizonCullingEnabled,
    observer,
    currentDate,
  )
  const visibleConstellations = useVisibleConstellations(constellations, observer, currentDate)

  const selectedStar =
    selection?.type === 'star' ? starCatalog.stars.find((s) => s.id === selection.id) : undefined
  const selectedConstellation =
    selection?.type === 'constellation'
      ? constellations.find((c) => c.id === selection.id)
      : undefined

  const brightestStarsInSelectedConstellation = selectedConstellation
    ? starCatalog.stars
        .filter((star) => star.constellation === selectedConstellation.id)
        .sort((a, b) => a.magnitude - b.magnitude)
        .slice(0, MAX_RELATED_STARS)
    : []

  return (
    <ErrorBoundary>
      <div className="relative h-dvh w-dvw overflow-hidden bg-space-950">
        <SceneCanvas
          starCatalog={starCatalog}
          constellations={visibleConstellations}
          observer={observer}
          date={currentDate}
          horizonCullingEnabled={horizonCullingEnabled}
          altitudes={altitudes}
        />
        <header className="pointer-events-none absolute top-4 left-4 z-10 flex flex-col items-start gap-2">
          <GlassPanel className="pointer-events-auto px-4 py-2">
            <h1 className="text-sm font-medium tracking-[0.2em] text-star-100 uppercase">
              {APP_NAME}
            </h1>
          </GlassPanel>
          <TodayButton onNeedManualLocation={() => setShowLocationPicker(true)} />
        </header>
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 w-[min(90vw,420px)] -translate-x-1/2">
          <TimeSlider />
        </div>
        <AnimatePresence>
          {selectedStar && (
            <StarPanel
              key={`star-${selectedStar.id}`}
              star={selectedStar}
              onClose={clearSelection}
            />
          )}
          {selectedConstellation && (
            <ConstellationPanel
              key={`constellation-${selectedConstellation.id}`}
              constellation={selectedConstellation}
              brightestStars={brightestStarsInSelectedConstellation}
              onClose={clearSelection}
              onSelectStar={(starId) => select({ type: 'star', id: starId })}
            />
          )}
          {showLocationPicker && (
            <LocationPicker
              key="location-picker"
              onSelectLocation={(lat, lon, source, cityName) => {
                setLocation(lat, lon, source, cityName)
                useTimeStore.getState().setMode('observer')
                setShowLocationPicker(false)
              }}
              onClose={() => setShowLocationPicker(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  )
}
