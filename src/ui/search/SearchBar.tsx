import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
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
 * objects — the spec's "search bar," not a hidden icon-triggered
 * dialog, so it's always visible rather than behind an extra click.
 * Selecting a result closes the dropdown and clears the query; the
 * caller (App.tsx) is responsible for the actual camera fly-to and
 * object selection, since only it has the live catalogs needed to
 * resolve a result's current position.
 */
export function SearchBar({ index, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => searchObjects(index, query, MAX_RESULTS), [index, query])
  const showResults = isFocused && results.length > 0

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value)
    setActiveIndex(0)
  }

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function handleSelect(result: SearchResult) {
    onSelect(result)
    setQuery('')
    setIsFocused(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsFocused(false)
      event.currentTarget.blur()
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
    <div ref={containerRef} className="pointer-events-auto flex flex-col gap-1">
      <GlassPanel className="flex items-center gap-2 px-3 py-2">
        <span aria-hidden="true" className="text-star-500">
          🔎
        </span>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search stars, constellations, planets, objects…"
          aria-label="Search the sky"
          className="w-full bg-transparent text-sm text-star-100 outline-none placeholder:text-star-500"
        />
      </GlassPanel>
      {showResults && (
        <GlassPanel className="max-h-80 overflow-y-auto p-1" role="listbox">
          <ul className="flex flex-col gap-0.5">
            {results.map((result, index) => (
              <li
                key={`${result.type}-${result.id}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    index === activeIndex ? 'bg-glass text-star-100' : 'text-star-300'
                  }`}
                >
                  <span>{result.label}</span>
                  <span className="text-xs text-star-500">{result.subtitle}</span>
                </button>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </div>
  )
}
