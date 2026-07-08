import { useLayersStore } from '@/state/useLayersStore'
import { useLocationStore } from '@/state/useLocationStore'
import { useTimeStore } from '@/state/useTimeStore'
import { GlassPanel } from '@/ui/primitives/GlassPanel'

// TODO(Phase 7): remove this once the real "Today's Night Sky" UI
// (geolocation + manual location entry) exists. Phase 6's acceptance
// criteria explicitly calls for a temporary dev control to exercise
// observer mode (horizon culling, grids, cardinal directions) before
// that real UI lands.
const TEST_LOCATION = { latitude: 40.7128, longitude: -74.006, cityName: 'New York City' }

export function DevObserverToggle() {
  const mode = useTimeStore((state) => state.mode)
  const setMode = useTimeStore((state) => state.setMode)
  const setLocation = useLocationStore((state) => state.setLocation)
  // The horizon ring/grid default to off (useLayersStore's baseline,
  // set before this feature existed) and there's no real toggle UI for
  // them until Phase 12 — so flip it on here too, otherwise there'd be
  // no way to actually see what this button is demonstrating.
  const setLayer = useLayersStore((state) => state.setLayer)

  function handleToggle() {
    if (mode === 'explore') {
      setLocation(TEST_LOCATION.latitude, TEST_LOCATION.longitude, 'manual', TEST_LOCATION.cityName)
      setMode('observer')
      setLayer('horizontalGrid', true)
    } else {
      setMode('explore')
      setLayer('horizontalGrid', false)
    }
  }

  return (
    <GlassPanel className="pointer-events-auto px-3 py-2">
      <button
        type="button"
        onClick={handleToggle}
        className="text-xs text-star-300 transition hover:text-star-100"
      >
        {mode === 'explore' ? 'Dev: observer mode (NYC)' : 'Dev: back to explore mode'}
      </button>
    </GlassPanel>
  )
}
