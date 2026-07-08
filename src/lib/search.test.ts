import { describe, expect, it } from 'vitest'
import { searchObjects } from './search'
import type { SearchResult } from '@/types/search'

function result(overrides: Partial<SearchResult>): SearchResult {
  return {
    type: 'star',
    id: 'id',
    label: 'label',
    subtitle: 'Star',
    rank: 0,
    keywords: 'label',
    ...overrides,
  }
}

const INDEX: SearchResult[] = [
  result({ id: 'sirius', label: 'Sirius', rank: -1.46, keywords: 'sirius cma' }),
  result({
    id: 'orion',
    type: 'constellation',
    label: 'Orion',
    rank: -2,
    keywords: 'orion orionis ori',
  }),
  result({ id: 'mars', type: 'planet', label: 'Mars', rank: -3, keywords: 'mars' }),
  result({
    id: 'ngc0224',
    type: 'dso',
    label: 'M31',
    rank: 3.44,
    keywords: 'ngc0224 m31 andromeda galaxy',
  }),
  result({ id: 'rigel', label: 'Rigel', rank: 0.13, keywords: 'rigel beta ori' }),
]

describe('searchObjects', () => {
  it('returns nothing for an empty or whitespace-only query', () => {
    expect(searchObjects(INDEX, '')).toEqual([])
    expect(searchObjects(INDEX, '   ')).toEqual([])
  })

  it('matches case-insensitively on the label', () => {
    const results = searchObjects(INDEX, 'sirius')
    expect(results.map((r) => r.id)).toEqual(['sirius'])
  })

  it('ranks an exact label match above a prefix match above a substring match', () => {
    const index: SearchResult[] = [
      result({ id: 'substring', label: 'Has Mars Crater' }),
      result({ id: 'prefix', label: 'Marsden Object' }),
      result({ id: 'exact', label: 'Mars' }),
    ]
    const results = searchObjects(index, 'mars')
    expect(results.map((r) => r.id)).toEqual(['exact', 'prefix', 'substring'])
  })

  it('falls back to the keyword blob when the label itself does not match', () => {
    const results = searchObjects(INDEX, 'andromeda')
    expect(results.map((r) => r.id)).toEqual(['ngc0224'])
  })

  it('finds a deep-sky object by its Messier number even though the label is the common name lookup key', () => {
    const results = searchObjects(INDEX, 'm31')
    expect(results.map((r) => r.id)).toEqual(['ngc0224'])
  })

  it('within the same match tier, ranks by ascending `rank` (brighter/more prominent first)', () => {
    const index: SearchResult[] = [
      result({ id: 'dim', label: 'Star Alpha', rank: 5 }),
      result({ id: 'bright', label: 'Star Beta', rank: -1 }),
    ]
    const results = searchObjects(index, 'star')
    expect(results.map((r) => r.id)).toEqual(['bright', 'dim'])
  })

  it('respects the limit parameter', () => {
    const index: SearchResult[] = Array.from({ length: 20 }, (_, i) =>
      result({ id: `s${i}`, label: `Star ${i}` }),
    )
    expect(searchObjects(index, 'star', 3)).toHaveLength(3)
  })

  it('returns an empty array when nothing matches', () => {
    expect(searchObjects(INDEX, 'zzzznotfound')).toEqual([])
  })
})
