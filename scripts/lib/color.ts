function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Ballesteros' formula: a well-known, accurate B-V -> effective temperature approximation. */
export function colorIndexToTemperatureK(bv: number): number {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))
}

/** Tanner Helland's widely-used blackbody temperature -> sRGB approximation (0-255 per channel). */
export function temperatureKToRgb(kelvin: number): [number, number, number] {
  const temp = kelvin / 100

  const red = temp <= 66 ? 255 : 329.698727446 * Math.pow(temp - 60, -0.1332047592)

  const green =
    temp <= 66
      ? 99.4708025861 * Math.log(temp) - 161.1195681661
      : 288.1221695283 * Math.pow(temp - 60, -0.0755148492)

  const blue =
    temp >= 66 ? 255 : temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307

  return [clamp(red, 0, 255), clamp(green, 0, 255), clamp(blue, 0, 255)]
}

function toHexByte(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0')
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`
}

/** Derives a star's rendered color and effective temperature from its B-V color index. */
export function colorIndexToHex(bv: number): { hex: string; temperatureK: number } {
  const temperatureK = colorIndexToTemperatureK(bv)
  const hex = rgbToHex(temperatureKToRgb(temperatureK))
  return { hex, temperatureK: Math.round(temperatureK) }
}
