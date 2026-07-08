import { useEffect, useState } from 'react'
import { GlassPanel } from '@/ui/primitives/GlassPanel'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatUtc(date: Date): { dateLine: string; timeLine: string } {
  const dateLine = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  const timeLine = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`
  return { dateLine, timeLine }
}

/**
 * Always-visible live UTC clock — deliberately independent of
 * `useTimeStore.currentDate` (the simulated, scrubbable sky date sitting
 * behind `TimeTravelDock`). This is a permanent "what time is it, right
 * now, for real" reference, so it keeps ticking every second regardless
 * of whatever date the Time Travel panel has scrubbed the sky to.
 */
export function UtcClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { dateLine, timeLine } = formatUtc(now)

  return (
    <GlassPanel className="pointer-events-auto px-3 py-1.5 text-center">
      <p className="text-[11px] leading-tight text-star-500 tabular-nums">{dateLine}</p>
      <p className="text-xs leading-tight font-medium text-star-100 tabular-nums">{timeLine}</p>
    </GlassPanel>
  )
}
