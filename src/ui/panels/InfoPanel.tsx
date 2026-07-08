import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef } from 'react'
import { GlassPanel } from '@/ui/primitives/GlassPanel'

export interface InfoPanelFact {
  label: string
  value: string
}

export interface InfoPanelRelatedItem {
  id: string
  label: string
  onSelect: () => void
}

export interface InfoPanelProps {
  title: string
  subtitle?: string
  facts: InfoPanelFact[]
  description?: string
  funFacts?: string[]
  related?: InfoPanelRelatedItem[]
  onClose: () => void
}

/**
 * Generic glassmorphic detail panel: title, key/value facts, description,
 * "Did you know?", and related links — every object type (star now,
 * constellation/planet/DSO later) renders through this same shell rather
 * than each having its own bespoke panel.
 *
 * Non-modal by design: the sky stays interactive behind it, so it doesn't
 * trap focus, but it does return focus on close and is fully operable by
 * keyboard (Esc closes; outside click closes).
 */
export function InfoPanel({
  title,
  subtitle,
  facts,
  description,
  funFacts,
  related,
  onClose,
}: InfoPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    return () => {
      previouslyFocused?.focus?.()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [onClose])

  const offset = reducedMotion ? 0 : 32

  return (
    <motion.div
      initial={{ x: offset, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: offset, opacity: 0 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 32 }}
      className="pointer-events-auto absolute top-4 right-4 bottom-4 w-[min(90vw,380px)]"
    >
      <GlassPanel
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex h-full flex-col gap-4 overflow-y-auto p-5 outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-star-100">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-star-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-glass-border bg-glass px-2 py-1 text-star-300 transition hover:text-star-100"
          >
            ✕
          </button>
        </div>

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
      </GlassPanel>
    </motion.div>
  )
}
