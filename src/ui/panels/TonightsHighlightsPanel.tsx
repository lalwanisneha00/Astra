import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import type { HighlightContext } from '@/astronomy/highlights'
import { useDismissablePanel } from '@/hooks/useDismissablePanel'
import { useTonightsHighlights } from '@/hooks/useTonightsHighlights'
import { useSceneStore } from '@/state/useSceneStore'
import { useSelectionStore } from '@/state/useSelectionStore'
import type { Highlight } from '@/types/highlight'
import { GlassPanel } from '@/ui/primitives/GlassPanel'

interface TonightsHighlightsPanelProps {
  /** Null in explore mode — this feature only makes sense as an
   * enhancement to Today's Night Sky, where there's a real observer to
   * compute rise/set/direction from. */
  context: HighlightContext | null
}

const DIFFICULTY_COLOR: Record<Highlight['difficulty'], string> = {
  'Naked eye': 'text-emerald-300',
  Binoculars: 'text-amber-300',
  Telescope: 'text-sky-300',
}

/**
 * Icon-triggered dock (mirroring `SearchBar`'s icon-expands-downward
 * pattern) surfacing what's notable in tonight's sky: bright planets,
 * the Moon, active meteor showers, conjunctions, upcoming eclipses,
 * well-placed constellations, and standout deep-sky objects — see
 * `astronomy/highlights.ts` for the detector engine driving this list.
 */
export function TonightsHighlightsPanel({ context }: TonightsHighlightsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const panelRef = useDismissablePanel<HTMLDivElement>(() => setIsOpen(false))
  const select = useSelectionStore((state) => state.select)
  const highlights = useTonightsHighlights(context)

  if (!context) return null

  function handleFlyTo(highlight: Highlight) {
    useSceneStore.getState().setFlyToTarget(highlight.equatorial)
    if (highlight.selection) select(highlight.selection)
  }

  return (
    <div className="pointer-events-auto flex flex-col items-start gap-2">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: reducedMotion ? 0 : -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reducedMotion ? 0 : -8, opacity: 0 }}
            transition={
              reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 32 }
            }
            className="order-2"
          >
            <GlassPanel
              ref={panelRef}
              tabIndex={-1}
              className="flex max-h-[70vh] w-[min(92vw,380px)] flex-col gap-3 overflow-y-auto p-4 outline-none"
            >
              <h2 className="text-xs font-medium tracking-wide text-star-500 uppercase">
                Tonight&rsquo;s Highlights
              </h2>

              {highlights.length === 0 && (
                <p className="text-sm text-star-500">
                  Nothing especially notable right now — check back later.
                </p>
              )}

              {highlights.map((highlight) => (
                <div
                  key={highlight.id}
                  className="rounded-xl border border-glass-border/60 bg-glass/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className="text-lg">
                        {highlight.icon}
                      </span>
                      <h3 className="text-sm font-semibold text-star-100">{highlight.title}</h3>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-medium tracking-wide uppercase ${DIFFICULTY_COLOR[highlight.difficulty]}`}
                    >
                      {highlight.difficulty}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-star-300">{highlight.summary}</p>
                  <p className="mt-1 text-xs text-star-500 italic">{highlight.whySpecial}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-star-500">
                    {highlight.direction && <span>Look {highlight.direction}</span>}
                    <span>{highlight.timeDescription}</span>
                    <span>{highlight.visibilityWindow}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFlyTo(highlight)}
                    className="mt-2 rounded-full border border-glass-border bg-glass px-3 py-1 text-xs text-star-100 transition hover:border-accent-400/50"
                  >
                    Fly to
                  </button>
                </div>
              ))}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
      <GlassPanel className="order-1 px-3 py-2">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label="Tonight's highlights"
          className="text-sm text-star-100 transition hover:text-accent-400"
        >
          ✨
        </button>
      </GlassPanel>
    </div>
  )
}
