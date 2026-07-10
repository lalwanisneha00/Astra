import { memo, useState } from 'react'
import { useLocationStore } from '@/state/useLocationStore'
import { useTimeStore } from '@/state/useTimeStore'
import { GlassPanel } from '@/ui/primitives/GlassPanel'

const GEOLOCATION_TIMEOUT_MS = 10_000

interface TodayButtonProps {
  /** Called when geolocation isn't available, is denied, or times out —
   * never a dead end, per the spec. App.tsx owns showing LocationPicker
   * so it can be positioned/animated at the top level, not nested inside
   * this small header button. */
  onNeedManualLocation: () => void
}

/**
 * The "Today's Night Sky" button: requests geolocation and, on success,
 * switches straight into observer mode at the user's real location and
 * the current time. Toggles back to explore mode if already active.
 *
 * Wrapped in `memo` — see SearchBar's identical note on why (App
 * re-renders on every Time Travel tick; this button has nothing to do
 * with the current date).
 */
export const TodayButton = memo(function TodayButton({ onNeedManualLocation }: TodayButtonProps) {
  const mode = useTimeStore((state) => state.mode)
  const setMode = useTimeStore((state) => state.setMode)
  const setLocation = useLocationStore((state) => state.setLocation)
  const setPermission = useLocationStore((state) => state.setPermission)
  const [isLocating, setIsLocating] = useState(false)

  function handleClick() {
    if (mode === 'observer') {
      setMode('explore')
      return
    }

    if (!('geolocation' in navigator)) {
      onNeedManualLocation()
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false)
        setPermission('granted')
        setLocation(position.coords.latitude, position.coords.longitude, 'geolocation')
        setMode('observer')
      },
      () => {
        setIsLocating(false)
        setPermission('denied')
        onNeedManualLocation()
      },
      { enableHighAccuracy: false, timeout: GEOLOCATION_TIMEOUT_MS },
    )
  }

  return (
    <GlassPanel className="pointer-events-auto px-4 py-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLocating}
        className="text-xs font-medium tracking-wide text-star-100 uppercase transition hover:text-accent-400 disabled:opacity-60"
      >
        {isLocating ? 'Locating…' : mode === 'observer' ? 'Back to explore' : "Today's Night Sky"}
      </button>
    </GlassPanel>
  )
})
