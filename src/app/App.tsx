import { AnimatePresence } from 'framer-motion'
import { useConstellations } from '@/hooks/useConstellations'
import { useStarCatalog } from '@/hooks/useStarCatalog'
import { SceneCanvas } from '@/scene/Canvas/SceneCanvas'
import { useSelectionStore } from '@/state/useSelectionStore'
import { ConstellationPanel } from '@/ui/panels/ConstellationPanel'
import { StarPanel } from '@/ui/panels/StarPanel'
import { GlassPanel } from '@/ui/primitives/GlassPanel'
import { APP_NAME } from './constants'
import { ErrorBoundary } from './ErrorBoundary'

const MAX_RELATED_STARS = 5

export function App() {
  const starCatalog = useStarCatalog()
  const constellations = useConstellations()
  const selection = useSelectionStore((state) => state.selection)
  const clearSelection = useSelectionStore((state) => state.clearSelection)
  const select = useSelectionStore((state) => state.select)

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
        <SceneCanvas starCatalog={starCatalog} constellations={constellations} />
        <header className="pointer-events-none absolute top-4 left-4">
          <GlassPanel className="pointer-events-auto px-4 py-2">
            <h1 className="text-sm font-medium tracking-[0.2em] text-star-100 uppercase">
              {APP_NAME}
            </h1>
          </GlassPanel>
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
