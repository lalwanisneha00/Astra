import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { HighlightContext } from '@/astronomy/highlights'
import { horizontalToEquatorial } from '@/astronomy/horizontal'
import { useConstellations } from '@/hooks/useConstellations'
import { useDeepSkyObjects } from '@/hooks/useDeepSkyObjects'
import { useHorizonCulling } from '@/hooks/useHorizonCulling'
import { useHoverCursor } from '@/hooks/useHoverCursor'
import { useMoonPosition } from '@/hooks/useMoonPosition'
import { usePlanetPositions } from '@/hooks/usePlanetPositions'
import { useSearchIndex } from '@/hooks/useSearchIndex'
import { useStarCatalog } from '@/hooks/useStarCatalog'
import { useSunPosition } from '@/hooks/useSunPosition'
import { useVisibleConstellations } from '@/hooks/useVisibleConstellations'
import { clamp } from '@/lib/math'
import { SceneCanvas } from '@/scene/Canvas/SceneCanvas'
import { MAX_FOV, MIN_FOV } from '@/scene/constants'
import {
  dsoRevealLevel,
  fovForExplorationLevel,
  fovForStarMagnitude,
  isDsoRevealed,
  isStarRevealed,
} from '@/scene/exploration'
import { useLocationStore } from '@/state/useLocationStore'
import { DEFAULT_FOV, useSceneStore } from '@/state/useSceneStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import { useTimeStore } from '@/state/useTimeStore'
import type { EquatorialCoord, ObserverLocation } from '@/types/coordinates'
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
  useHoverCursor()

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
  // happened to be facing, and reset zoom to the Level-1 naked-eye
  // baseline — otherwise a zoom carried over from Explore Mode could
  // open Today's Night Sky already showing deeper exploration levels
  // instead of "what's naturally visible from here, right now." Reads
  // currentDate imperatively (not as a dependency) so this only re-fires
  // when the observer itself changes, not on every tick once Phase 8
  // adds continuous time.
  useEffect(() => {
    if (!observer) return
    const date = useTimeStore.getState().currentDate
    const target = horizontalToEquatorial(DEFAULT_OBSERVER_VIEW, observer, date)
    useSceneStore.getState().setFlyToTarget(target)
    useSceneStore.getState().setTargetFov(DEFAULT_FOV)
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
  // Intelligent search navigation: if the result isn't currently revealed
  // at this zoom depth (a faint star or a deep-level DSO — see
  // scene/exploration.ts), the flight also zooms to the FOV that reveals
  // it, riding the exact same Earth-to-Universe fade every other zoom
  // already uses, so nearby context reveals naturally along the way
  // rather than teleporting to what would otherwise look like empty
  // space. Constellations/planets/Sun/Moon are always part of the
  // Level-1 baseline, so they never need this — a plain fly-to already
  // lands somewhere visible.
  //
  // Wrapped in useCallback (stable reference) so SearchBar — wrapped in
  // React.memo — doesn't re-render on every App render (e.g. Time
  // Travel's currentDate ticking every 120ms while playing), which was
  // otherwise churning its dismissable-panel listeners and general
  // render work on every tick regardless of whether search was even
  // open.
  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      select({ type: result.type, id: result.id })

      // Each catalog is scanned at most once per selection (previously
      // stars/DSOs were each looked up twice — once for position, once
      // for the reveal check — a real, avoidable doubling of an O(n)
      // scan over a catalog with up to ~41,000 entries).
      let target: EquatorialCoord | undefined
      let requiredFov: number | null = null
      const currentFov = useSceneStore.getState().fov

      if (result.type === 'star') {
        const star = starCatalog.stars.find((s) => s.id === result.id)
        target = star?.equatorial
        if (star && !isStarRevealed(currentFov, star.magnitude)) {
          requiredFov = fovForStarMagnitude(star.magnitude)
        }
      } else if (result.type === 'constellation') {
        target = constellations.find((c) => c.id === result.id)?.labelPosition
      } else if (result.type === 'planet') {
        target = planets.find((planet) => planet.id === result.id)?.equatorial
      } else if (result.type === 'dso') {
        const dso = deepSkyObjects.find((d) => d.id === result.id)
        target = dso?.equatorial
        if (dso && !isDsoRevealed(currentFov, dso)) {
          requiredFov = fovForExplorationLevel(dsoRevealLevel(dso))
        }
      } else if (result.type === 'sun') {
        target = sun.equatorial
      } else {
        target = moon.equatorial
      }

      if (!target) return

      useSceneStore.getState().setFlyToTarget(target)
      if (requiredFov !== null) {
        useSceneStore.getState().setTargetFov(clamp(requiredFov, MIN_FOV, MAX_FOV))
      }
    },
    [select, starCatalog, constellations, planets, deepSkyObjects, sun, moon],
  )

  const handleNeedManualLocation = useCallback(() => setShowLocationPicker(true), [])

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
          <div className="flex flex-wrap items-start gap-2">
            <TodayButton onNeedManualLocation={handleNeedManualLocation} />
            <TonightsHighlightsPanel context={highlightContext} />
          </div>
        </header>
        <div className="pointer-events-none absolute right-4 bottom-4 z-20">
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
