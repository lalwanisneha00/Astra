import { useEffect, useState } from 'react'
import { loadCities } from '@/data/loaders/cityLoader'
import type { City } from '@/types/city'

export interface CitiesState {
  cities: City[]
  isLoading: boolean
  error: string | null
}

/** Loads the world cities list on mount — call this from LocationPicker
 * itself (not App.tsx), so the ~3MB fetch only happens for the fraction
 * of sessions where geolocation actually fails. */
export function useCities(): CitiesState {
  const [state, setState] = useState<CitiesState>({ cities: [], isLoading: true, error: null })

  useEffect(() => {
    let cancelled = false

    loadCities()
      .then((cities) => {
        if (!cancelled) setState({ cities, isLoading: false, error: null })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            cities: [],
            isLoading: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
