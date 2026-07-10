import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { pickNearest, type PickCandidate } from './pick'

function candidate(
  type: PickCandidate['type'],
  id: string,
  direction: [number, number, number],
): PickCandidate {
  return { type, id, direction: new Vector3(...direction).normalize() }
}

describe('pickNearest', () => {
  it('returns null for no candidates', () => {
    expect(pickNearest(new Vector3(0, 0, -1), [])).toBeNull()
  })

  it('picks the single candidate when there is only one', () => {
    const only = candidate('star', 'sirius', [0, 0, -1])
    expect(pickNearest(new Vector3(0, 0.01, -1), [only])).toBe(only)
  })

  it('picks the candidate with the smallest true angular separation from the ray', () => {
    const near = candidate('star', 'near', [0.01, 0, -1])
    const far = candidate('star', 'far', [0.5, 0, -1])
    const ray = new Vector3(0, 0, -1)
    expect(pickNearest(ray, [far, near])).toBe(near)
    expect(pickNearest(ray, [near, far])).toBe(near)
  })

  it('a precisely-clicked star wins over a farther constellation line, regardless of order', () => {
    const star = candidate('star', 'polaris', [0.001, 0, -1])
    const line = candidate('constellation', 'UMi', [0.05, 0, -1])
    const ray = new Vector3(0, 0, -1)
    expect(pickNearest(ray, [star, line])?.id).toBe('polaris')
    expect(pickNearest(ray, [line, star])?.id).toBe('polaris')
  })

  it('a precisely-clicked DSO wins over a farther star, regardless of order', () => {
    const dso = candidate('dso', 'M31', [0.001, 0, -1])
    const star = candidate('star', 'nearby-star', [0.05, 0, -1])
    const ray = new Vector3(0, 0, -1)
    expect(pickNearest(ray, [dso, star])?.id).toBe('M31')
    expect(pickNearest(ray, [star, dso])?.id).toBe('M31')
  })

  it('does not let a farther, more "specific" object beat a genuinely closer one', () => {
    // The DSO is real but much farther off-axis than the star — true
    // nearest-wins must still pick the star; specificity only breaks
    // *ties*, it never overrides a clearly closer candidate.
    const star = candidate('star', 'close-star', [0.001, 0, -1])
    const dso = candidate('dso', 'far-dso', [0.3, 0, -1])
    const ray = new Vector3(0, 0, -1)
    expect(pickNearest(ray, [star, dso])?.id).toBe('close-star')
  })

  it('breaks an exact tie by preferring the more specific object type', () => {
    const sameDirection: [number, number, number] = [0.02, 0, -1]
    const star = candidate('star', 'tied-star', sameDirection)
    const dso = candidate('dso', 'tied-dso', sameDirection)
    const ray = new Vector3(0, 0, -1)
    expect(pickNearest(ray, [star, dso])?.id).toBe('tied-dso')
    expect(pickNearest(ray, [dso, star])?.id).toBe('tied-dso')
  })

  it('breaks a tie between a star and a constellation line by preferring the star', () => {
    const sameDirection: [number, number, number] = [0.02, 0, -1]
    const star = candidate('star', 'anchor-star', sameDirection)
    const line = candidate('constellation', 'Ori', sameDirection)
    const ray = new Vector3(0, 0, -1)
    expect(pickNearest(ray, [star, line])?.id).toBe('anchor-star')
    expect(pickNearest(ray, [line, star])?.id).toBe('anchor-star')
  })

  it('picks correctly among many candidates of mixed types', () => {
    const ray = new Vector3(0, 0, -1)
    const candidates = [
      candidate('constellation', 'far-line', [0.2, 0, -1]),
      candidate('planet', 'mars', [0.1, 0, -1]),
      candidate('star', 'best', [0.005, 0, -1]),
      candidate('dso', 'far-dso', [0.15, 0, -1]),
    ]
    expect(pickNearest(ray, candidates)?.id).toBe('best')
  })
})
