import { describe, expect, it } from 'vitest'
import { buildSearchIndex } from './useSearchIndex'
import { searchObjects } from '@/lib/search'
import type { Constellation } from '@/types/constellation'
import type { Star } from '@/types/star'

function makeStar(overrides: Partial<Star>): Star {
  return {
    id: 'test-id',
    names: ['Test Star'],
    magnitude: 2,
    absoluteMagnitude: 0,
    distanceLy: 100,
    spectralClass: 'G',
    colorIndex: 0.5,
    colorHex: '#ffffff',
    temperatureK: 5800,
    luminositySolar: 1,
    constellation: null,
    equatorial: { ra: 0, dec: 0 },
    ...overrides,
  }
}

function makeConstellation(overrides: Partial<Constellation>): Constellation {
  return {
    id: 'Xxx',
    name: 'Test Constellation',
    genitive: 'Testis',
    labelPosition: { ra: 0, dec: 0 },
    lines: [],
    isZodiac: false,
    hemisphere: 'northern',
    bestViewingMonths: 'January–March',
    ...overrides,
  }
}

describe('buildSearchIndex + searchObjects: common-name aliases', () => {
  it('finds Polaris by its common nicknames, not just its catalog name', () => {
    const polaris = makeStar({ id: 'polaris-id', names: ['Polaris', '1 Alp UMi'], magnitude: 1.98 })
    const index = buildSearchIndex([polaris], [], [])

    for (const query of ['north star', 'pole star', 'lodestar']) {
      const results = searchObjects(index, query)
      expect(results.map((r) => r.id)).toContain('polaris-id')
    }
  })

  it('finds Sirius by "Dog Star"', () => {
    const sirius = makeStar({ id: 'sirius-id', names: ['Sirius'], magnitude: -1.46 })
    const index = buildSearchIndex([sirius], [], [])
    const results = searchObjects(index, 'dog star')
    expect(results.map((r) => r.id)).toContain('sirius-id')
  })

  it('finds Ursa Major by "Big Dipper" and "The Plough"', () => {
    const ursaMajor = makeConstellation({
      id: 'UMa',
      name: 'Ursa Major',
      genitive: 'Ursae Majoris',
    })
    const index = buildSearchIndex([], [ursaMajor], [])

    for (const query of ['big dipper', 'the plough', 'great bear']) {
      const results = searchObjects(index, query)
      expect(results.map((r) => r.id)).toContain('UMa')
    }
  })

  it('finds a constellation by its plain English translation even without a special nickname', () => {
    // Aquarius has no folk nickname beyond its own translation -- this
    // confirms every one of the 88 constellations got an alias entry,
    // not just the famous handful with extra nicknames.
    const aquarius = makeConstellation({ id: 'Aqr', name: 'Aquarius', genitive: 'Aquarii' })
    const index = buildSearchIndex([], [aquarius], [])
    const results = searchObjects(index, 'water bearer')
    expect(results.map((r) => r.id)).toContain('Aqr')
  })

  it('still finds objects by their real catalog name when no alias is involved', () => {
    const vega = makeStar({ id: 'vega-id', names: ['Vega'], magnitude: 0.03 })
    const index = buildSearchIndex([vega], [], [])
    const results = searchObjects(index, 'vega')
    expect(results.map((r) => r.id)).toContain('vega-id')
  })
})
