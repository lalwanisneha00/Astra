import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { HighlightContext } from '@/astronomy/highlights'
import { horizontalToEquatorial } from '@/astronomy/horizontal'
import { useConstellations } from '@/hooks/useConstellations'
import { useDeepSkyObjects } from '@/hooks/useDeepSkyObjects'
import { useHorizonCulling } from '@/hooks/useHorizonCulling'
import { useMoonPosition } from '@/hooks/useMoonPosition'
import { usePlanetPositions } from '@/hooks/usePlanetPositions'
import { useSearchIndex } from '@/hooks/useSearchIndex'
import { useStarCatalog } from '@/hooks/useStarCatalog'
import { useSunPosition } from '@/hooks/useSunPosition'
import { useVisibleConstellations } from '@/hooks/useVisibleConstellations'
import { SceneCanvas } from '@/scene/Canvas/SceneCanvas'
import { useLocationStore } from '@/state/useLocationStore'
import { useSceneStore } from '@/state/useSceneStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import { useTimeStore } from '@/state/useTimeStore'
import type { ObserverLocation } from '@/types/coordinates'
import type { SearchResult } from '@/types/search'
import { LayerToggleDock } from '@/ui/controls/LayerToggleDock'
import { LocationPicker } from '@/ui/controls/LocationPicker'
import { TimeTravelDock } from '@/ui/controls/TimeTravelDock'
import { TodayButton } from '@/ui/controls/TodayButton'
import { UtcClock } from '@/ui/controls/UtcClock'
import { ConstellationPanel } from '@/ui/panels/ConstellationPanel'
import { DeepSkyObjectPanel } from '@/ui/panels/DeepSkyObjectPanel'
import { MoonPanel } from '@/ui/panels/MoonPanel'
import { PlanetPanel } from '@/ui/panels/PlanetPanel'
import { StarPanel } from '@/ui/panels/StarPanel'
import { SunPanel } from '@/ui/panels/SunPanel'
import { TonightsHighlightsPanel } from '@/ui/panels/TonightsHighlightsPanel'
import { GlassPanel } from '@/ui/primitives/GlassPanel'
import { SearchBar } from '@/ui/search/SearchBar'
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
  const deepSkyObjects = useDeepSkyObjects()
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
  const planets = usePlanetPositions(currentDate)
  const sun = useSunPosition(currentDate)
  const moon = useMoonPosition(currentDate, observer)
  const searchIndex = useSearchIndex(starCatalog.stars, constellations, deepSkyObjects)

  const highlightContext = useMemo<HighlightContext | null>(
    () =>
      observer
        ? {
            date: currentDate,
            observer,
            planets,
            moon,
            dsos: deepSkyObjects,
            constellations,
          }
        : null,
    [observer, currentDate, planets, moon, deepSkyObjects, constellations],
  )

  const selectedStar =
    selection?.type === 'star' ? starCatalog.stars.find((s) => s.id === selection.id) : undefined
  const selectedConstellation =
    selection?.type === 'constellation'
      ? constellations.find((c) => c.id === selection.id)
      : undefined
  const selectedPlanet =
    selection?.type === 'planet' ? planets.find((p) => p.id === selection.id) : undefined
  const selectedDso =
    selection?.type === 'dso' ? deepSkyObjects.find((d) => d.id === selection.id) : undefined
  const isSunSelected = selection?.type === 'sun'
  const isMoonSelected = selection?.type === 'moon'

  const brightestStarsInSelectedConstellation = selectedConstellation
    ? starCatalog.stars
        .filter((star) => star.constellation === selectedConstellation.id)
        .sort((a, b) => a.magnitude - b.magnitude)
        .slice(0, MAX_RELATED_STARS)
    : []

  // Resolves the result's *current* position from the live catalogs
  // rather than a coordinate baked into the search index, so a planet's
  // fly-to target is never a stale snapshot from whenever the index was
  // built (see useSearchIndex).
  function handleSearchSelect(result: SearchResult) {
    select({ type: result.type, id: result.id })

    const target =
      result.type === 'star'
        ? starCatalog.stars.find((star) => star.id === result.id)?.equatorial
        : result.type === 'constellation'
          ? constellations.find((c) => c.id === result.id)?.labelPosition
          : result.type === 'planet'
            ? planets.find((planet) => planet.id === result.id)?.equatorial
            : result.type === 'dso'
              ? deepSkyObjects.find((dso) => dso.id === result.id)?.equatorial
              : result.type === 'sun'
                ? sun.equatorial
                : moon.equatorial

    if (target) useSceneStore.getState().setFlyToTarget(target)
  }

  return (
    <ErrorBoundary>
      <div className="relative h-dvh w-dvw overflow-hidden bg-space-950">
        <SceneCanvas
          starCatalog={starCatalog}
          constellations={visibleConstellations}
          deepSkyObjects={deepSkyObjects}
          sun={sun}
          moon={moon}
          observer={observer}
          date={currentDate}
          horizonCullingEnabled={horizonCullingEnabled}
          altitudes={altitudes}
        />
        <header className="pointer-events-none absolute top-4 left-4 z-20 flex flex-col items-start gap-2">
          <div className="flex items-start gap-2">
            <GlassPanel className="pointer-events-auto px-4 py-2">
              <h1 className="text-sm font-medium tracking-[0.2em] text-star-100 uppercase">
                {APP_NAME}
              </h1>
            </GlassPanel>
            <SearchBar index={searchIndex} onSelect={handleSearchSelect} />
          </div>
          <div className="flex items-start gap-2">
            <TodayButton onNeedManualLocation={() => setShowLocationPicker(true)} />
            <TonightsHighlightsPanel context={highlightContext} />
          </div>
        </header>
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          <UtcClock />
        </div>
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-end gap-2">
          <LayerToggleDock />
          <TimeTravelDock />
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
          {selectedPlanet && (
            <PlanetPanel
              key={`planet-${selectedPlanet.id}`}
              planet={selectedPlanet}
              onClose={clearSelection}
            />
          )}
          {selectedDso && (
            <DeepSkyObjectPanel
              key={`dso-${selectedDso.id}`}
              dso={selectedDso}
              onClose={clearSelection}
            />
          )}
          {isSunSelected && <SunPanel key="sun" sun={sun} onClose={clearSelection} />}
          {isMoonSelected && <MoonPanel key="moon" moon={moon} onClose={clearSelection} />}
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
