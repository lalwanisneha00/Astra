import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addGranularity,
  granularityToApproxMs,
  type TimeGranularity,
} from '@/astronomy/dateArithmetic'
import { throttle } from '@/lib/throttle'
import { useTimeStore } from '@/state/useTimeStore'
import { GlassPanel } from '@/ui/primitives/GlassPanel'

interface GranularityOption {
  value: TimeGranularity
  label: string
  /** The slider spans -range..+range steps of this granularity. */
  range: number
}

const GRANULARITIES: GranularityOption[] = [
  { value: 'hour', label: 'Hour', range: 24 },
  { value: 'day', label: 'Day', range: 30 },
  { value: 'month', label: 'Month', range: 12 },
  { value: 'year', label: 'Year', range: 50 },
]

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10]

// How often scrubbing/playback is allowed to push a new date into
// useTimeStore — protects useHorizonCulling's worker (and the
// horizontal grid/constellation-visibility recomputation) from being
// flooded by a slider that can fire far faster than either needs to
// react, per the phase's own "throttle" guidance.
const UPDATE_THROTTLE_MS = 120

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
})

export function TimeSlider() {
  const isPlaying = useTimeStore((state) => state.isPlaying)
  const speed = useTimeStore((state) => state.speed)
  const currentDate = useTimeStore((state) => state.currentDate)
  const setCurrentDate = useTimeStore((state) => state.setCurrentDate)
  const setPlaying = useTimeStore((state) => state.setPlaying)
  const setSpeed = useTimeStore((state) => state.setSpeed)
  const resetToNow = useTimeStore((state) => state.resetToNow)

  const [granularity, setGranularity] = useState<TimeGranularity>('hour')
  const [offset, setOffset] = useState(0)
  // The date that offset=0 represents; re-anchored whenever the user
  // changes granularity or jumps to "now", so switching views never
  // causes a jarring jump to a stale offset interpreted in new units.
  const anchorRef = useRef(currentDate)

  const throttledSetDate = useMemo(
    () => throttle(setCurrentDate, UPDATE_THROTTLE_MS),
    [setCurrentDate],
  )

  // `granularity` state only ever comes from a GRANULARITIES option's own
  // `value` (initial state included), so this lookup always succeeds.
  const active = GRANULARITIES.find((option) => option.value === granularity)!

  function handleGranularityChange(next: TimeGranularity) {
    anchorRef.current = currentDate
    setOffset(0)
    setGranularity(next)
  }

  function handleSliderChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextOffset = Number(event.target.value)
    setOffset(nextOffset)
    throttledSetDate(addGranularity(anchorRef.current, nextOffset, granularity))
  }

  function handleNow() {
    setPlaying(false)
    resetToNow()
    anchorRef.current = new Date()
    setOffset(0)
  }

  // Continuous playback: advances useTimeStore.currentDate every frame
  // (frame-rate independent, like the camera's damping) while playing,
  // through the same throttled setter scrubbing uses.
  useEffect(() => {
    if (!isPlaying) return undefined

    let rafId: number
    let lastFrameTime = performance.now()

    function tick(now: number) {
      const deltaSeconds = (now - lastFrameTime) / 1000
      lastFrameTime = now
      const advanceMs = granularityToApproxMs(granularity) * speed * deltaSeconds
      const latest = useTimeStore.getState().currentDate
      throttledSetDate(new Date(latest.getTime() + advanceMs))
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying, speed, granularity, throttledSetDate])

  return (
    <GlassPanel className="pointer-events-auto flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-star-300 tabular-nums">
          {dateFormatter.format(currentDate)}
        </span>
        <div className="flex gap-1">
          {GRANULARITIES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleGranularityChange(option.value)}
              aria-pressed={option.value === granularity}
              className={`rounded-full px-2 py-0.5 text-[11px] uppercase transition ${
                option.value === granularity
                  ? 'bg-accent-500/30 text-star-100'
                  : 'text-star-500 hover:text-star-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <input
        type="range"
        aria-label={`Offset in ${active.label.toLowerCase()}s from the anchor time`}
        min={-active.range}
        max={active.range}
        step={1}
        value={offset}
        onChange={handleSliderChange}
        disabled={isPlaying}
        className="w-full disabled:opacity-50"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying(!isPlaying)}
            className="rounded-full border border-glass-border bg-glass px-3 py-1 text-xs text-star-100 transition hover:border-accent-400/50"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <select
            aria-label="Playback speed"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="rounded-full border border-glass-border bg-glass px-2 py-1 text-xs text-star-100"
          >
            {SPEED_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}×
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleNow}
          className="rounded-full border border-glass-border bg-glass px-3 py-1 text-xs text-star-100 transition hover:border-accent-400/50"
        >
          Now
        </button>
      </div>
    </GlassPanel>
  )
}
