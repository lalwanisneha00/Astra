import { describe, expect, it } from 'vitest'
import { directionToYawPitch, shortestAngleTarget } from './orientation'

/** Mirrors CameraController's own forward-vector formula, so these
 * tests validate a true round trip rather than just re-deriving the
 * same formula in reverse. */
function yawPitchToDirection(yaw: number, pitch: number): [number, number, number] {
  return [-Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw)]
}

describe('directionToYawPitch', () => {
  it('maps the default forward direction to yaw=0, pitch=0', () => {
    const { yaw, pitch } = directionToYawPitch([0, 0, -1])
    expect(yaw).toBeCloseTo(0)
    expect(pitch).toBeCloseTo(0)
  })

  it('round-trips a variety of yaw/pitch pairs through the forward-vector formula', () => {
    const cases: Array<[number, number]> = [
      [0, 0],
      [Math.PI / 2, 0],
      [-Math.PI / 2, 0],
      [Math.PI, 0],
      [0, Math.PI / 4],
      [0, -Math.PI / 4],
      [1.2, 0.5],
      [-2.1, -0.3],
    ]

    for (const [yaw, pitch] of cases) {
      const direction = yawPitchToDirection(yaw, pitch)
      const result = directionToYawPitch(direction)
      // Recompute the direction from the *result* rather than comparing
      // angles directly, since yaw wraps and pitch=+-90 makes yaw
      // ambiguous - the direction itself is the unambiguous ground truth.
      const roundTripDirection = yawPitchToDirection(result.yaw, result.pitch)
      expect(roundTripDirection[0]).toBeCloseTo(direction[0], 5)
      expect(roundTripDirection[1]).toBeCloseTo(direction[1], 5)
      expect(roundTripDirection[2]).toBeCloseTo(direction[2], 5)
    }
  })
})

describe('shortestAngleTarget', () => {
  it('returns the same value when already equal', () => {
    expect(shortestAngleTarget(1, 1)).toBeCloseTo(1)
  })

  it('takes the short way across the 0/2pi wraparound', () => {
    const from = -0.1 // just under 0
    const to = (2 * Math.PI - 0.05) % (2 * Math.PI) // just under 2pi, i.e. near 0 from the other side
    const result = shortestAngleTarget(from, to)
    // Should be a small step near `from`, not nearly a full circle away.
    expect(Math.abs(result - from)).toBeLessThan(0.2)
  })

  it('never returns a delta larger than pi in magnitude', () => {
    for (let from = -10; from <= 10; from += 1.3) {
      for (let to = -10; to <= 10; to += 1.7) {
        const result = shortestAngleTarget(from, to)
        expect(Math.abs(result - from)).toBeLessThanOrEqual(Math.PI + 1e-9)
      }
    }
  })
})
