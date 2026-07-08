import { describe, expect, it } from 'vitest'
import { addGranularity, granularityToApproxMs } from './dateArithmetic'

function utc(y: number, m: number, d: number, h = 0): Date {
  return new Date(Date.UTC(y, m, d, h))
}

describe('addGranularity', () => {
  it('adds hours as an exact fixed duration (no DST ambiguity in UTC)', () => {
    const result = addGranularity(utc(2026, 5, 15, 10), 5, 'hour')
    expect(result.getTime()).toBe(utc(2026, 5, 15, 15).getTime())
  })

  it('adding 24 hours equals adding 1 day, exactly, in UTC', () => {
    const start = utc(2026, 5, 15, 10)
    const via24Hours = addGranularity(start, 24, 'hour')
    const via1Day = addGranularity(start, 1, 'day')
    expect(via24Hours.getTime()).toBe(via1Day.getTime())
  })

  it('adds a simple month with no day-of-month overflow', () => {
    const result = addGranularity(utc(2026, 0, 15), 1, 'month')
    expect(result.getUTCFullYear()).toBe(2026)
    expect(result.getUTCMonth()).toBe(1) // February
    expect(result.getUTCDate()).toBe(15)
  })

  it('rolls a month-end overflow into the following month (native Date behavior)', () => {
    // Jan 31 + 1 month -> "Feb 31" doesn't exist; 2026 is not a leap
    // year, so Feb has 28 days, overflowing 3 days into March.
    const result = addGranularity(utc(2026, 0, 31), 1, 'month')
    expect(result.getUTCFullYear()).toBe(2026)
    expect(result.getUTCMonth()).toBe(2) // March
    expect(result.getUTCDate()).toBe(3)
  })

  it('rolls a leap-day overflow into March on a non-leap year', () => {
    // Feb 29, 2024 (leap year) + 1 year -> Feb 29 2025 doesn't exist.
    const result = addGranularity(utc(2024, 1, 29), 1, 'year')
    expect(result.getUTCFullYear()).toBe(2025)
    expect(result.getUTCMonth()).toBe(2) // March
    expect(result.getUTCDate()).toBe(1)
  })

  it('subtracts when amount is negative', () => {
    const result = addGranularity(utc(2026, 5, 15), -10, 'day')
    expect(result.getTime()).toBe(utc(2026, 5, 5).getTime())
  })
})

describe('granularityToApproxMs', () => {
  it('returns exact millisecond durations for hour and day', () => {
    expect(granularityToApproxMs('hour')).toBe(3_600_000)
    expect(granularityToApproxMs('day')).toBe(86_400_000)
  })

  it('returns plausible averages for month and year', () => {
    const month = granularityToApproxMs('month')
    const year = granularityToApproxMs('year')
    expect(month).toBeGreaterThan(28 * 86_400_000)
    expect(month).toBeLessThan(32 * 86_400_000)
    expect(year).toBeGreaterThan(364 * 86_400_000)
    expect(year).toBeLessThan(367 * 86_400_000)
  })
})
