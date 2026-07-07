import { create } from 'zustand'

export type LocationSource = 'geolocation' | 'manual' | 'city'
export type LocationPermission = 'idle' | 'granted' | 'denied'

interface LocationStore {
  latitude: number | null
  longitude: number | null
  source: LocationSource | null
  cityName: string | null
  permission: LocationPermission
  setLocation: (
    latitude: number,
    longitude: number,
    source: LocationSource,
    cityName?: string,
  ) => void
  setPermission: (permission: LocationPermission) => void
}

/** Observer location for "Today's Night Sky" (see Phase 7). */
export const useLocationStore = create<LocationStore>((set) => ({
  latitude: null,
  longitude: null,
  source: null,
  cityName: null,
  permission: 'idle',
  setLocation: (latitude, longitude, source, cityName) =>
    set({ latitude, longitude, source, cityName: cityName ?? null }),
  setPermission: (permission) => set({ permission }),
}))
