import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { useDismissablePanel } from '@/hooks/useDismissablePanel'
import { searchObjects } from '@/lib/search'
import type { SearchResult } from '@/types/search'
import { GlassPanel } from '@/ui/primitives/GlassPanel'

const MAX_RESULTS = 8

export interface SearchBarProps {
  index: SearchResult[]
  onSelect: (result: SearchResult) => void
}

/**
 * Unified search across stars, constellations, planets, and deep-sky
 * objects — collapsed behind a small 🔎 trigger (mirroring
 * `LayerToggleDock`'s icon-button-expands-panel pattern) rather than
 * permanently occupying screen space, so the sky stays unobstructed
 * until someone actually wants to search. All internal query/keyboard-
 * nav/results logic is unchanged from the always-visible version this
 * replaces; only the open/close chrome around it is new.
 *
 * Wrapped in `memo`: App re-renders on every Time Travel tick
 * (currentDate, throttled to ~120ms while playing), which has nothing
 * to do with search — without this, every tick re-rendered the whole
 * open/closed dropdown, query state, and results list for no reason.
 * Effective as long as `index`/`onSelect` stay referentially stable
 * (see useSearchIndex's memoization and App's useCallback).
 */
export const SearchBar = memo(function SearchBar({ index, onSelect }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const reducedMotion = useReducedMotion()
  const panelRef = useDismissablePanel<HTMLDivElement>(() => setIsOpen(false))
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => searchObjects(index, query, MAX_RESULTS), [index, query])

  // Runs after useDismissablePanel's own mount-focus effect (declared
  // above it), so this always wins: the input ends up focused, not the
  // panel div itself.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value)
    setActiveIndex(0)
  }

  function handleSelect(result: SearchResult) {
    onSelect(result)
    setQuery('')
    setIsOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (results.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const result = results[activeIndex]
      if (result) handleSelect(result)
    }
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
              className="flex w-[min(88vw,360px)] flex-col gap-1 p-1 outline-none"
            >
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span aria-hidden="true" className="text-star-500">
                  🔎
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Search stars, constellations, planets, objects…"
                  aria-label="Search the sky"
                  className="w-full bg-transparent text-sm text-star-100 outline-none placeholder:text-star-500"
                />
              </div>
              {results.length > 0 && (
                <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto" role="listbox">
                  {results.map((result, resultIndex) => (
                    <li
                      key={`${result.type}-${result.id}`}
                      role="option"
                      aria-selected={resultIndex === activeIndex}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setActiveIndex(resultIndex)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                          resultIndex === activeIndex ? 'bg-glass text-star-100' : 'text-star-300'
                        }`}
                      >
                        <span>{result.label}</span>
                        <span className="text-xs text-star-500">{result.subtitle}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
      <GlassPanel className="order-1 px-3 py-2">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label="Search the sky"
          className="text-sm text-star-100 transition hover:text-accent-400"
        >
          🔎
        </button>
      </GlassPanel>
    </div>
  )
})
