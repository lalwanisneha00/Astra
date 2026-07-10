import { motion, useReducedMotion, type PanInfo } from 'framer-motion'
import { useEffect, useId, useState, type PointerEventHandler } from 'react'
import { useDismissablePanel } from '@/hooks/useDismissablePanel'
import { useHeaderSafeBottom } from '@/hooks/useHeaderSafeBottom'
import { GlassPanel } from '@/ui/primitives/GlassPanel'
import { resolveSheetSnap, type SheetSnap } from './bottomSheetSnap'
import type { InfoPanelProps } from './InfoPanel'

// Opens at ~38% of the viewport height, within the requested 35-40%.
const PEEK_HEIGHT_RATIO = 0.38
// Gap above the sheet's fully-expanded top edge, and below the header's
// safe area — matches the desktop panel's own `top-4`/`bottom-4` margin.
const EDGE_GAP = 16
const MIN_SHEET_HEIGHT = 200

// Stops a pointerdown that starts inside the scrollable content from
// ever reaching the sheet's own drag listener, so touch-scrolling facts/
// description there scrolls natively instead of dragging the whole
// sheet. Framer Motion's drag gesture listens on the element it's
// attached to and picks up bubbled pointer events from children, so
// stopping propagation here is enough to exclude just this region —
// the handle/title area above it is untouched and still starts a drag
// normally through Framer Motion's own default listener.
const stopPointerPropagation: PointerEventHandler = (event) => event.stopPropagation()

/**
 * Mobile equivalent of `DesktopInfoPanel` — a draggable bottom sheet
 * instead of a fixed top-right panel, so the selected object's name
 * never ends up hidden behind the logo/search button the way a
 * top-right panel would on a narrow screen. See `InfoPanel.tsx` for the
 * viewport switch between the two.
 *
 * Sizing and drag math both live in plain viewport-pixel coordinates
 * (not CSS `dvh`/`%`) because framer-motion's drag constraints need
 * numbers to compare against; `useHeaderSafeBottom` and a resize
 * listener keep those numbers current across resizes/orientation
 * changes.
 */
export function MobileInfoSheet({
  title,
  subtitle,
  facts,
  description,
  funFacts,
  related,
  onClose,
}: InfoPanelProps) {
  const titleId = useId()
  const reducedMotion = useReducedMotion()
  const panelRef = useDismissablePanel<HTMLDivElement>(onClose)
  const safeTop = useHeaderSafeBottom()

  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight)
  useEffect(() => {
    function handleResize() {
      setViewportHeight(window.innerHeight)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  const [snap, setSnap] = useState<SheetSnap>('peek')

  // y=0 is the sheet's natural, fully-expanded position (its top edge
  // sitting `EDGE_GAP` below the header); y=maxHeight is dragged down by
  // its own full height, i.e. entirely off-screen. peekY sits between
  // them, at the sheet's initial resting position.
  const maxHeight = Math.max(MIN_SHEET_HEIGHT, viewportHeight - safeTop - EDGE_GAP)
  const peekY = Math.max(0, maxHeight - viewportHeight * PEEK_HEIGHT_RATIO)

  function handleDragEnd(_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    const startY = snap === 'expanded' ? 0 : peekY
    const currentY = Math.min(Math.max(startY + info.offset.y, 0), maxHeight)
    const result = resolveSheetSnap(currentY, info.velocity.y, peekY, maxHeight)
    if (result.dismiss) {
      onClose()
      return
    }
    setSnap(result.snap)
  }

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-10 outline-none"
      style={{ height: maxHeight }}
      drag="y"
      dragConstraints={{ top: 0, bottom: maxHeight }}
      dragElastic={0.05}
      onDragEnd={handleDragEnd}
      initial={{ y: maxHeight }}
      animate={{ y: snap === 'expanded' ? 0 : peekY }}
      exit={{ y: maxHeight }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}
    >
      <GlassPanel className="flex h-full flex-col rounded-b-none">
        <div className="shrink-0 touch-none px-5 pt-2 pb-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-glass-border" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-xl font-semibold text-star-100">
                {title}
              </h2>
              {subtitle && <p className="text-sm text-star-500">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full border border-glass-border bg-glass px-2.5 py-1.5 text-star-300 transition hover:text-star-100"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          className="flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-6"
          onPointerDown={stopPointerPropagation}
        >
          <div className="flex flex-col gap-4">
            {facts.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {facts.map((fact) => (
                  <div key={fact.label} className="contents">
                    <dt className="text-star-500">{fact.label}</dt>
                    <dd className="text-right text-star-100">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {description && <p className="text-sm text-star-300">{description}</p>}

            {funFacts && funFacts.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-medium tracking-wide text-star-500 uppercase">
                  Did you know?
                </h3>
                <ul className="list-disc space-y-1 pl-4 text-sm text-star-300">
                  {funFacts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </div>
            )}

            {related && related.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-medium tracking-wide text-star-500 uppercase">
                  Related
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {related.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={item.onSelect}
                        className="rounded-full border border-glass-border bg-glass px-3 py-1 text-xs text-star-100 transition hover:border-accent-400/50"
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  )
}
