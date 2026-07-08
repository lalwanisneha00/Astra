export type TimeGranularity = 'hour' | 'day' | 'month' | 'year'

/**
 * Adds `amount` units of `granularity` to `date`, using UTC-based Date
 * methods throughout. UTC never observes DST, so this sidesteps the
 * classic "add 24 hours != add 1 day across a DST transition" bug class
 * entirely — the local system timezone never enters into it.
 *
 * Month/year arithmetic uses JS's native `setUTCMonth`/`setUTCFullYear`
 * rollover behavior for out-of-range days (e.g. Jan 31 + 1 month rolls
 * into early March, since February doesn't have 31 days) — that's
 * expected, unmodified native Date semantics, not a bug introduced here.
 */
export function addGranularity(date: Date, amount: number, granularity: TimeGranularity): Date {
  const result = new Date(date.getTime())

  switch (granularity) {
    case 'hour':
      result.setUTCHours(result.getUTCHours() + amount)
      break
    case 'day':
      result.setUTCDate(result.getUTCDate() + amount)
      break
    case 'month':
      result.setUTCMonth(result.getUTCMonth() + amount)
      break
    case 'year':
      result.setUTCFullYear(result.getUTCFullYear() + amount)
      break
  }

  return result
}

/**
 * Approximate real-world duration of one granularity unit, in
 * milliseconds — for smoothly *animating* continuous playback, not for
 * exact calendar jumps (use `addGranularity` for those). Month and year
 * are necessarily averages since their real length varies.
 */
export function granularityToApproxMs(granularity: TimeGranularity): number {
  switch (granularity) {
    case 'hour':
      return 3_600_000
    case 'day':
      return 86_400_000
    case 'month':
      return 30.44 * 86_400_000
    case 'year':
      return 365.25 * 86_400_000
  }
}
