import { describe, expect, it } from 'vitest'
import { stepZoomTarget, zoomEdgeResistance } from './zoom'

const MIN_FOV = 20
const MAX_FOV = 100
const EDGE_BAND = 12

describe('zoomEdgeResistance', () => {
  it('is 1 (no resistance) far from either edge', () => {
    expect(zoomEdgeResistance(60, 1, MIN_FOV, MAX_FOV, EDGE_BAND)).toBe(1)
    expect(zoomEdgeResistance(60, -1, MIN_FOV, MAX_FOV, EDGE_BAND)).toBe(1)
  })

  it('tapers to 0 exactly at the max edge when zooming out', () => {
    expect(zoomEdgeResistance(MAX_FOV, 1, MIN_FOV, MAX_FOV, EDGE_BAND)).toBe(0)
  })

  it('tapers to 0 exactly at the min edge when zooming in', () => {
    expect(zoomEdgeResistance(MIN_FOV, -1, MIN_FOV, MAX_FOV, EDGE_BAND)).toBe(0)
  })

  it('ramps smoothly between the edge and the resistance band', () => {
    const midBand = zoomEdgeResistance(MAX_FOV - EDGE_BAND / 2, 1, MIN_FOV, MAX_FOV, EDGE_BAND)
    expect(midBand).toBeGreaterThan(0)
    expect(midBand).toBeLessThan(1)
  })

  it('is unaffected by the max edge when zooming in, even if already near it', () => {
    expect(zoomEdgeResistance(MAX_FOV, -1, MIN_FOV, MAX_FOV, EDGE_BAND)).toBe(1)
  })

  it('is unaffected by the min edge when zooming out, even if already near it', () => {
    expect(zoomEdgeResistance(MIN_FOV, 1, MIN_FOV, MAX_FOV, EDGE_BAND)).toBe(1)
  })

  it('is 1 when velocity is exactly zero', () => {
    expect(zoomEdgeResistance(MAX_FOV, 0, MIN_FOV, MAX_FOV, EDGE_BAND)).toBe(1)
  })
})

describe('stepZoomTarget', () => {
  it('increases FOV (zooms out) for positive velocity', () => {
    const next = stepZoomTarget(60, 1, 0.1, MIN_FOV, MAX_FOV, EDGE_BAND)
    expect(next).toBeGreaterThan(60)
  })

  it('decreases FOV (zooms in) for negative velocity', () => {
    const next = stepZoomTarget(60, -1, 0.1, MIN_FOV, MAX_FOV, EDGE_BAND)
    expect(next).toBeLessThan(60)
  })

  it('never exceeds maxFov even with a large velocity and timestep', () => {
    const next = stepZoomTarget(95, 50, 1, MIN_FOV, MAX_FOV, EDGE_BAND)
    expect(next).toBeLessThanOrEqual(MAX_FOV)
  })

  it('never goes below minFov even with a large negative velocity and timestep', () => {
    const next = stepZoomTarget(25, -50, 1, MIN_FOV, MAX_FOV, EDGE_BAND)
    expect(next).toBeGreaterThanOrEqual(MIN_FOV)
  })

  it('produces a proportionally equal relative step regardless of current FOV, away from either edge band', () => {
    const stepFromWide = stepZoomTarget(80, -1, 0.05, MIN_FOV, MAX_FOV, EDGE_BAND) / 80
    const stepFromNarrow = stepZoomTarget(40, -1, 0.05, MIN_FOV, MAX_FOV, EDGE_BAND) / 40
    expect(stepFromWide).toBeCloseTo(stepFromNarrow, 5)
  })

  it('is a no-op for zero velocity', () => {
    expect(stepZoomTarget(60, 0, 0.1, MIN_FOV, MAX_FOV, EDGE_BAND)).toBeCloseTo(60, 5)
  })
})
