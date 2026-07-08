import { motion, useReducedMotion } from 'framer-motion'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { CITIES, type City } from '@/data/cities'
import { useDismissablePanel } from '@/hooks/useDismissablePanel'
import { GlassPanel } from '@/ui/primitives/GlassPanel'

export interface LocationPickerProps {
  onSelectLocation: (
    latitude: number,
    longitude: number,
    source: 'manual' | 'city',
    cityName?: string,
  ) => void
  onClose: () => void
}

const MAX_RESULTS = 8

/**
 * Manual location fallback for "Today's Night Sky" — shown whenever
 * geolocation is denied or unavailable, per the spec's "never a dead
 * end" requirement. City search matches against a curated list
 * (src/data/cities.ts); manual lat/lon entry covers anywhere else or
 * anyone who wants exact coordinates.
 */
export function LocationPicker({ onSelectLocation, onClose }: LocationPickerProps) {
  const titleId = useId()
  const reducedMotion = useReducedMotion()
  const panelRef = useDismissablePanel<HTMLDivElement>(onClose)

  const [query, setQuery] = useState('')
  const [manualLat, setManualLat] = useState('')
  const [manualLon, setManualLon] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (trimmed.length === 0) return []
    return CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(trimmed) || city.country.toLowerCase().includes(trimmed),
    ).slice(0, MAX_RESULTS)
  }, [query])

  function handleSelectCity(city: City) {
    onSelectLocation(city.latitude, city.longitude, 'city', `${city.name}, ${city.country}`)
  }

  function handleManualSubmit(event: FormEvent) {
    event.preventDefault()
    const lat = Number(manualLat)
    const lon = Number(manualLon)

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setManualError('Latitude must be a number between -90 and 90.')
      return
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setManualError('Longitude must be a number between -180 and 180.')
      return
    }

    setManualError(null)
    onSelectLocation(lat, lon, 'manual')
  }

  const offset = reducedMotion ? 0 : 16

  return (
    <motion.div
      initial={{ y: offset, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: offset, opacity: 0 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 32 }}
      className="pointer-events-auto absolute top-1/2 left-1/2 w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2"
    >
      <GlassPanel
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto p-5 outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-star-100">
            Set your location
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-glass-border bg-glass px-2 py-1 text-star-300 transition hover:text-star-100"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="city-search" className="text-xs text-star-500 uppercase">
            Search for a city
          </label>
          <input
            id="city-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Tokyo, Nairobi, São Paulo"
            className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-sm text-star-100 outline-none placeholder:text-star-500 focus:border-accent-400/50"
          />
          {matches.length > 0 && (
            <ul className="flex flex-col gap-1">
              {matches.map((city) => (
                <li key={`${city.name}-${city.country}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-star-100 transition hover:bg-glass"
                  >
                    {city.name}
                    <span className="text-star-500"> — {city.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length > 0 && matches.length === 0 && (
            <p className="text-xs text-star-500">
              No matches — try another spelling, or enter coordinates directly below.
            </p>
          )}
        </div>

        <div className="border-glass-border border-t pt-4">
          <p className="mb-2 text-xs text-star-500 uppercase">Or enter coordinates</p>
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="manual-lat" className="text-xs text-star-500">
                  Latitude
                </label>
                <input
                  id="manual-lat"
                  type="text"
                  inputMode="decimal"
                  value={manualLat}
                  onChange={(event) => setManualLat(event.target.value)}
                  placeholder="-90 to 90"
                  className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-sm text-star-100 outline-none placeholder:text-star-500 focus:border-accent-400/50"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="manual-lon" className="text-xs text-star-500">
                  Longitude
                </label>
                <input
                  id="manual-lon"
                  type="text"
                  inputMode="decimal"
                  value={manualLon}
                  onChange={(event) => setManualLon(event.target.value)}
                  placeholder="-180 to 180"
                  className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-sm text-star-100 outline-none placeholder:text-star-500 focus:border-accent-400/50"
                />
              </div>
            </div>
            {manualError && <p className="text-xs text-red-400">{manualError}</p>}
            <button
              type="submit"
              className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-sm text-star-100 transition hover:border-accent-400/50"
            >
              Use these coordinates
            </button>
          </form>
        </div>
      </GlassPanel>
    </motion.div>
  )
}
