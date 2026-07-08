import { AnimatePresence } from 'framer-motion'
import { useStarCatalog } from '@/hooks/useStarCatalog'
import { SceneCanvas } from '@/scene/Canvas/SceneCanvas'
import { useSelectionStore } from '@/state/useSelectionStore'
import { GlassPanel } from '@/ui/primitives/GlassPanel'
import { StarPanel } from '@/ui/panels/StarPanel'
import { APP_NAME } from './constants'
import { ErrorBoundary } from './ErrorBoundary'

export function App() {
  const starCatalog = useStarCatalog()
  const selection = useSelectionStore((state) => state.selection)
  const clearSelection = useSelectionStore((state) => state.clearSelection)

  const selectedStar =
    selection?.type === 'star' ? starCatalog.stars.find((s) => s.id === selection.id) : undefined

  return (
    <ErrorBoundary>
      <div className="relative h-dvh w-dvw overflow-hidden bg-space-950">
        <SceneCanvas starCatalog={starCatalog} />
        <header className="pointer-events-none absolute top-4 left-4">
          <GlassPanel className="pointer-events-auto px-4 py-2">
            <h1 className="text-sm font-medium tracking-[0.2em] text-star-100 uppercase">
              {APP_NAME}
            </h1>
          </GlassPanel>
        </header>
        <AnimatePresence>
          {selectedStar && (
            <StarPanel key={selectedStar.id} star={selectedStar} onClose={clearSelection} />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  )
}
