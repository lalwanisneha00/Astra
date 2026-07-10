import { describe, expect, it } from 'vitest'
import { selectionPulseIntensity, SELECTION_PULSE_DURATION_SECONDS } from './selectionPulse'

describe('selectionPulseIntensity', () => {
  it('is 1 at the instant of selection', () => {
    expect(selectionPulseIntensity(0)).toBe(1)
  })

  it('is 0 once the pulse duration has fully elapsed', () => {
    expect(selectionPulseIntensity(SELECTION_PULSE_DURATION_SECONDS)).toBe(0)
  })

  it('is 0 well after the pulse duration has elapsed', () => {
    expect(selectionPulseIntensity(SELECTION_PULSE_DURATION_SECONDS * 5)).toBe(0)
  })

  it('decays monotonically between 0 and the full duration', () => {
    const quarter = selectionPulseIntensity(SELECTION_PULSE_DURATION_SECONDS * 0.25)
    const half = selectionPulseIntensity(SELECTION_PULSE_DURATION_SECONDS * 0.5)
    const threeQuarters = selectionPulseIntensity(SELECTION_PULSE_DURATION_SECONDS * 0.75)
    expect(quarter).toBeGreaterThan(half)
    expect(half).toBeGreaterThan(threeQuarters)
    expect(threeQuarters).toBeGreaterThan(0)
  })

  it('never goes negative for elapsed times beyond the duration', () => {
    expect(selectionPulseIntensity(100)).toBeGreaterThanOrEqual(0)
  })
})
