export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Classic smoothstep: eases 0->1 across [0,1] with zero slope at both
 * ends, so a value ramping through it never pops or arrives abruptly. */
export function smoothstep01(t: number): number {
  const c = clamp(t, 0, 1)
  return c * c * (3 - 2 * c)
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI
}
