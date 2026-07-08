import { describe, expect, it } from 'vitest'
import { localSiderealTimeDegrees } from '@/astronomy/horizontal'
import { getTonightsHighlights, type HighlightContext } from './highlights'
import type { Constellation } from '@/types/constellation'
import type { DeepSkyObject } from '@/types/deepSkyObject'
import type { Planet } from '@/types/planet'

const NYC = { latitude: 40.7128, longitude: -74.006 }
const PERSEID_PEAK = new Date('2024-08-12T00:00:00Z')
const NO_SHOWER_DATE = new Date('2024-02-15T12:00:00Z')

function makeMoon(overrides: Partial<HighlightContext['moon']> = {}): HighlightContext['moon'] {
  return {
    equatorial: { ra: 10, dec: -60 },
    distanceAu: 0.0026,
    illumination: 0.5,
    phaseAngle: 90,
    ...overrides,
  }
}

function makePlanet(overrides: Partial<Planet>): Planet {
  return {
    id: 'Mars',
    name: 'Mars',
    equatorial: { ra: 10, dec: -60 },
    distanceAu: 1.5,
    ...overrides,
  }
}

function makeContext(overrides: Partial<HighlightContext> = {}): HighlightContext {
  return {
    date: NO_SHOWER_DATE,
    observer: NYC,
    planets: [],
    moon: makeMoon(),
    dsos: [],
    constellations: [],
    ...overrides,
  }
}

/** Places an object at the observer's zenith at the given date, so its
 * visibility doesn't depend on real ephemeris — the same trick used in
 * horizontal.test.ts. */
function zenithEquatorial(date: Date) {
  return { ra: localSiderealTimeDegrees(date, NYC.longitude), dec: NYC.latitude }
}

describe('getTonightsHighlights', () => {
  it('returns results sorted by ascending priority and respects the limit', () => {
    const context = makeContext({
      date: PERSEID_PEAK,
      planets: [makePlanet({ id: 'Mars', equatorial: zenithEquatorial(PERSEID_PEAK) })],
    })

    const all = getTonightsHighlights(context)
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.priority).toBeGreaterThanOrEqual(all[i - 1]!.priority)
    }

    const limited = getTonightsHighlights(context, 1)
    expect(limited.length).toBeLessThanOrEqual(1)
  })

  it('detects the Perseids as a peak-night highlight on their peak date', () => {
    const context = makeContext({ date: PERSEID_PEAK })
    const highlights = getTonightsHighlights(context)
    const perseids = highlights.find((h) => h.title === 'Perseids')
    expect(perseids).toBeDefined()
    expect(perseids?.category).toBe('meteorShower')
    expect(perseids?.priority).toBe(1)
  })

  it('does not surface any meteor shower far from every known peak date', () => {
    const context = makeContext({ date: NO_SHOWER_DATE })
    const highlights = getTonightsHighlights(context)
    expect(highlights.some((h) => h.category === 'meteorShower')).toBe(false)
  })

  it('detects a conjunction between two bodies within the threshold separation', () => {
    const context = makeContext({
      planets: [
        makePlanet({ id: 'Jupiter', name: 'Jupiter', equatorial: { ra: 100, dec: 20 } }),
        makePlanet({ id: 'Saturn', name: 'Saturn', equatorial: { ra: 102, dec: 21 } }),
      ],
    })
    const highlights = getTonightsHighlights(context)
    const conjunction = highlights.find((h) => h.category === 'conjunction')
    expect(conjunction).toBeDefined()
    expect(conjunction?.title).toContain('Jupiter')
    expect(conjunction?.title).toContain('Saturn')
    expect(conjunction?.priority).toBe(1)
  })

  it('does not flag a conjunction between bodies far apart in the sky', () => {
    const context = makeContext({
      planets: [
        makePlanet({ id: 'Jupiter', name: 'Jupiter', equatorial: { ra: 10, dec: 20 } }),
        makePlanet({ id: 'Saturn', name: 'Saturn', equatorial: { ra: 200, dec: -20 } }),
      ],
    })
    const highlights = getTonightsHighlights(context)
    expect(highlights.some((h) => h.category === 'conjunction')).toBe(false)
  })

  it('detects a curated deep-sky object that is currently near the zenith', () => {
    const equatorial = zenithEquatorial(NO_SHOWER_DATE)
    const dso: DeepSkyObject = {
      id: 'NGC0224',
      type: 'G',
      equatorial,
      constellation: null,
      magnitude: 3.4,
      sizeArcmin: 190,
      messier: 'M31',
      commonNames: ['Andromeda Galaxy'],
    }
    const context = makeContext({ dsos: [dso] })
    const highlights = getTonightsHighlights(context)
    const andromeda = highlights.find((h) => h.category === 'dso')
    expect(andromeda).toBeDefined()
    expect(andromeda?.title).toBe('M31')
    expect(andromeda?.difficulty).toBe('Naked eye')
    expect(andromeda?.selection).toEqual({ type: 'dso', id: 'NGC0224' })
  })

  it('ignores deep-sky objects below the horizon', () => {
    const dso: DeepSkyObject = {
      id: 'NGC0224',
      type: 'G',
      equatorial: { ra: (zenithEquatorial(NO_SHOWER_DATE).ra + 180) % 360, dec: -NYC.latitude },
      constellation: null,
      magnitude: 3.4,
      sizeArcmin: 190,
      messier: 'M31',
      commonNames: ['Andromeda Galaxy'],
    }
    const context = makeContext({ dsos: [dso] })
    const highlights = getTonightsHighlights(context)
    expect(highlights.some((h) => h.category === 'dso')).toBe(false)
  })

  it('detects a curated constellation that is currently high in the sky', () => {
    const constellation: Constellation = {
      id: 'Ori',
      name: 'Orion',
      genitive: 'Orionis',
      labelPosition: zenithEquatorial(NO_SHOWER_DATE),
      lines: [],
      isZodiac: false,
      hemisphere: 'equatorial',
      bestViewingMonths: 'December-February',
    }
    const context = makeContext({ constellations: [constellation] })
    const highlights = getTonightsHighlights(context)
    const orion = highlights.find((h) => h.category === 'constellation')
    expect(orion).toBeDefined()
    expect(orion?.title).toBe('Orion')
    expect(orion?.selection).toEqual({ type: 'constellation', id: 'Ori' })
  })

  it('never returns an eclipse highlight when none is due within the lookahead window', () => {
    // astronomy-engine always finds *some* next eclipse, however far
    // away — this only asserts the 7-day lookahead filter excludes it
    // on an arbitrary date, not that eclipses never occur.
    const context = makeContext({ date: NO_SHOWER_DATE })
    const highlights = getTonightsHighlights(context)
    expect(highlights.some((h) => h.category === 'eclipse')).toBe(false)
  })
})
