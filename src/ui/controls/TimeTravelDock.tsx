import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { memo, useState } from 'react'
import { useDismissablePanel } from '@/hooks/useDismissablePanel'
import { GlassPanel } from '@/ui/primitives/GlassPanel'
import { TimeSlider } from './TimeSlider'

/**
 * Collapses the Time Travel controls (previously a permanently-visible
 * panel) behind a small 🕐 trigger, structurally identical to
 * `LayerToggleDock` — expands upward from a bottom-left button, closes
 * on Esc/outside-click via `useDismissablePanel`. Wraps the existing
 * `TimeSlider` completely unmodified as the panel content, so every bit
 * of scrub/play/granularity behavior stays exactly as it was.
 *
 * Wrapped in `memo` — see SearchBar's identical note. `TimeSlider` keeps
 * updating live while the panel is open (it has its own store
 * subscription), this only skips this wrapper's own pointless
 * re-renders when collapsed.
 */
export const TimeTravelDock = memo(function TimeTravelDock() {
  const [isOpen, setIsOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const panelRef = useDismissablePanel<HTMLDivElement>(() => setIsOpen(false))

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
            <div ref={panelRef} tabIndex={-1} className="w-[min(88vw,420px)] outline-none">
              <TimeSlider />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <GlassPanel className="px-4 py-2">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label="Time travel"
          className="text-sm text-star-100 transition hover:text-accent-400"
        >
          🕐
        </button>
      </GlassPanel>
    </div>
  )
})
