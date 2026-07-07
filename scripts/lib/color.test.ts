import { describe, expect, it } from 'vitest'
import { colorIndexToHex, colorIndexToTemperatureK } from './color.ts'

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

describe('colorIndexToTemperatureK', () => {
  it('matches the Sun’s known ~5778K effective temperature at B-V 0.65', () => {
    expect(colorIndexToTemperatureK(0.65)).toBeCloseTo(5778, -2)
  })
})

describe('colorIndexToHex', () => {
  it('renders a hot, blue-leaning star (Rigel-like B-V) as blue-white', () => {
    const { hex } = colorIndexToHex(-0.03)
    const [r, , b] = hexToRgb(hex)
    expect(b).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(200)
  })

  it('renders a cool, red-leaning star (Betelgeuse-like B-V) as orange/red', () => {
    const { hex } = colorIndexToHex(1.85)
    const [r, g, b] = hexToRgb(hex)
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })

  it('renders a Sun-like star as a warm near-white', () => {
    const { hex } = colorIndexToHex(0.65)
    const [r, g, b] = hexToRgb(hex)
    expect(r).toBeGreaterThan(240)
    expect(g).toBeGreaterThan(200)
    expect(b).toBeGreaterThan(180)
  })
})
