import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { useConstellations } from '@/hooks/useConstellations'
import { useHorizonCulling } from '@/hooks/useHorizonCulling'
import { useStarCatalog } from '@/hooks/useStarCatalog'
import { useVisibleConstellations } from '@/hooks/useVisibleConstellations'
import { useVisibleStarCatalog } from '@/hooks/useVisibleStarCatalog'
import { SceneCanvas } from '@/scene/Canvas/SceneCanvas'
import { useLocationStore } from '@/state/useLocationStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import { useTimeStore } from '@/state/useTimeStore'
import type { ObserverLocation } from '@/types/coordinates'
import { ConstellationPanel } from '@/ui/panels/ConstellationPanel'
import { StarPanel } from '@/ui/panels/StarPanel'
import { GlassPanel } from '@/ui/primitives/GlassPanel'
import { APP_NAME } from './constants'
import { DevObserverToggle } from './DevObserverToggle'
import { ErrorBoundary } from './ErrorBoundary'

const MAX_RELATED_STARS = 5

export function App() {
  const starCatalog = useStarCatalog()
  const constellations = useConstellations()
  const selection = useSelectionStore((state) => state.selection)
  const clearSelection = useSelectionStore((state) => state.clearSelection)
  const select = useSelectionStore((state) => state.select)

  const mode = useTimeStore((state) => state.mode)
  const currentDate = useTimeStore((state) => state.currentDate)
  const latitude = useLocationStore((state) => state.latitude)
  const longitude = useLocationStore((state) => state.longitude)

  const observer = useMemo<ObserverLocation | null>(
    () =>
      mode === 'observer' && latitude !== null && longitude !== null
        ? { latitude, longitude }
        : null,
    [mode, latitude, longitude],
  )

  const altitudes = useHorizonCulling(starCatalog.stars, observer !== null, observer, currentDate)
  const visibleCatalog = useVisibleStarCatalog(starCatalog, altitudes)
  const visibleConstellations = useVisibleConstellations(constellations, observer, currentDate)

  const selectedStar =
    selection?.type === 'star' ? visibleCatalog.stars.find((s) => s.id === selection.id) : undefined
  const selectedConstellation =
    selection?.type === 'constellation'
      ? constellations.find((c) => c.id === selection.id)
      : undefined

  const brightestStarsInSelectedConstellation = selectedConstellation
    ? visibleCatalog.stars
        .filter((star) => star.constellation === selectedConstellation.id)
        .sort((a, b) => a.magnitude - b.magnitude)
        .slice(0, MAX_RELATED_STARS)
    : []

  return (
    <ErrorBoundary>
      <div className="relative h-dvh w-dvw overflow-hidden bg-space-950">
        <SceneCanvas
          starCatalog={visibleCatalog}
          constellations={visibleConstellations}
          observer={observer}
          date={currentDate}
        />
        <header className="pointer-events-none absolute top-4 left-4 flex flex-col items-start gap-2">
          <GlassPanel className="pointer-events-auto px-4 py-2">
            <h1 className="text-sm font-medium tracking-[0.2em] text-star-100 uppercase">
              {APP_NAME}
            </h1>
          </GlassPanel>
          <DevObserverToggle />
        </header>
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
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  )
}
