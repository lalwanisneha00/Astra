import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { memo, useState } from 'react'
import { useDismissablePanel } from '@/hooks/useDismissablePanel'
import { useLayersStore, type LayerName } from '@/state/useLayersStore'
import { GlassPanel } from '@/ui/primitives/GlassPanel'

const LAYER_ORDER: LayerName[] = [
  'constellationLines',
  'constellationNames',
  'starNames',
  'planets',
  'deepSky',
  'labels',
  'mythology',
  'equatorialGrid',
  'horizontalGrid',
]

const LAYER_LABELS: Record<LayerName, string> = {
  constellationLines: 'Constellation lines',
  constellationNames: 'Constellation names',
  starNames: 'Star names',
  equatorialGrid: 'Equatorial grid',
  horizontalGrid: 'Horizon grid & cardinals',
  deepSky: 'Deep-sky objects',
  planets: 'Planets',
  labels: 'Object name labels',
  mythology: 'Mythology & fun facts',
}

/**
 * The layer visibility dock every `useLayersStore` flag was added for
 * back in Phase 1 (`ui/controls/`, "toggle dock — Phase 12"). Expands
 * upward from a bottom-left button — the one corner of the layout not
 * already claimed by the header, search bar, time slider, or info
 * panels. Reuses `useDismissablePanel` (Esc/outside-click) exactly like
 * every other overlay in the app.
 *
 * Wrapped in `memo` — see SearchBar's identical note; takes no props,
 * so this only ever re-renders for its own state/store changes, never
 * because App re-rendered for an unrelated reason.
 */
export const LayerToggleDock = memo(function LayerToggleDock() {
  const [isOpen, setIsOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const panelRef = useDismissablePanel<HTMLDivElement>(() => setIsOpen(false))
  const layers = useLayersStore()

  return (
    <div className="pointer-events-auto flex flex-col items-start gap-2">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: reducedMotion ? 0 : 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reducedMotion ? 0 : 12, opacity: 0 }}
            transition={
              reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 32 }
            }
          >
            <GlassPanel
              ref={panelRef}
              tabIndex={-1}
              className="flex w-56 flex-col gap-0.5 p-2 outline-none"
            >
              {LAYER_ORDER.map((layer) => (
                <label
                  key={layer}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs text-star-100 transition hover:bg-glass"
                >
                  <span>{LAYER_LABELS[layer]}</span>
                  <input
                    type="checkbox"
                    checked={layers[layer]}
                    onChange={() => layers.toggleLayer(layer)}
                    className="accent-accent-400"
                  />
                </label>
              ))}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
      <GlassPanel className="px-4 py-2">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          className="text-xs font-medium tracking-wide text-star-100 uppercase transition hover:text-accent-400"
        >
          {isOpen ? 'Close layers' : 'Layers'}
        </button>
      </GlassPanel>
    </div>
  )
})
