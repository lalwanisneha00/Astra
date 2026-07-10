import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { memo, useState } from 'react'
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

/**
 * Icon-triggered dock (mirroring `SearchBar`'s icon-expands-downward
 * pattern) surfacing what's notable in tonight's sky: bright planets,
 * the Moon, active meteor showers, conjunctions, upcoming eclipses,
 * well-placed constellations, and standout deep-sky objects — see
 * `astronomy/highlights.ts` for the detector engine driving this list.
 *
 * Wrapped in `memo` — see SearchBar's identical note. `context` is a
 * stable `null` in explore mode (App's own `useMemo` returns the literal
 * `null`, not a new object), so this skips re-rendering entirely outside
 * Today's Night Sky; in observer mode `context` legitimately changes
 * with the date, so it re-renders exactly when it needs to.
 */
export const TonightsHighlightsPanel = memo(function TonightsHighlightsPanel({
  context,
}: TonightsHighlightsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  // Whether the user has opened this panel at least once *this session*
  // — drives the attention-pulse on the trigger below. A plain `useState`
  // is enough: this component is always mounted by App (its own early
  // `return null` doesn't unmount it), so this persists across mode
  // switches and open/close cycles for the whole session, resetting
  // only on a real page reload.
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false)
  const reducedMotion = useReducedMotion()
  const panelRef = useDismissablePanel<HTMLDivElement>(() => setIsOpen(false))
  const select = useSelectionStore((state) => state.select)
  const highlights = useTonightsHighlights(context)

  if (!context) return null

  function handleFlyTo(highlight: Highlight) {
    useSceneStore.getState().setFlyToTarget(highlight.equatorial)
    if (highlight.selection) select(highlight.selection)
    setIsOpen(false)
  }

  function handleToggleOpen() {
    setIsOpen((open) => {
      const next = !open
      if (next) setHasOpenedOnce(true)
      return next
    })
  }

  const showAttentionPulse = !hasOpenedOnce && !reducedMotion

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
              className="flex max-h-[70vh] w-[min(90vw,380px)] flex-col gap-3 overflow-y-auto p-4 outline-none"
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
                    <span className="shrink-0 text-[10px] font-medium tracking-wide text-star-500 uppercase">
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
      <motion.div
        className="order-1 rounded-2xl"
        animate={
          showAttentionPulse
            ? {
                boxShadow: [
                  '0 0 0px 0px rgba(138,180,255,0)',
                  '0 0 14px 3px rgba(138,180,255,0.55)',
                  '0 0 0px 0px rgba(138,180,255,0)',
                ],
              }
            : { boxShadow: '0 0 0px 0px rgba(138,180,255,0)' }
        }
        transition={
          showAttentionPulse
            ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      >
        <GlassPanel className="px-3 py-2">
          <button
            type="button"
            onClick={handleToggleOpen}
            aria-expanded={isOpen}
            aria-label="Tonight's highlights"
            className="text-sm text-star-100 transition hover:text-accent-400"
          >
            ✨
          </button>
        </GlassPanel>
      </motion.div>
    </div>
  )
})
