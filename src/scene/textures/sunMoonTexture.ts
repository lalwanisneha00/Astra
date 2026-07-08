import * as THREE from 'three'

const TEXTURE_SIZE = 128
const CENTER = TEXTURE_SIZE / 2

let cachedSunTexture: THREE.CanvasTexture | null = null

/** The Sun's own disc: unlike a planet (reflected light, so shaded with
 * an off-center highlight — see planetTexture.ts), the Sun is self-
 * luminous, so it's rendered as a uniformly bright, symmetric radiant
 * disc instead — no terminator/shading makes sense for a light source. */
function createSunTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for Sun texture generation')

  const gradient = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, TEXTURE_SIZE * 0.46)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.6, 'rgba(255,244,214,1)')
  gradient.addColorStop(0.88, 'rgba(255,214,130,0.9)')
  gradient.addColorStop(1, 'rgba(255,214,130,0)')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(CENTER, CENTER, TEXTURE_SIZE * 0.46, 0, Math.PI * 2)
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** One shared Sun sprite texture — cached, since the Sun's own look
 * never changes (unlike the Moon's phase). */
export function getSunTexture(): THREE.CanvasTexture {
  cachedSunTexture ??= createSunTexture()
  return cachedSunTexture
}

/**
 * A phase-accurate Moon disc: a dark base disc with a lit region carved
 * out via the standard "half-plane plus ellipse" technique — the lit
 * half (right when waxing, left when waning) is drawn first, then an
 * ellipse either narrows it (crescent, illumination < 0.5) or fills in
 * the remaining dark half (gibbous, illumination > 0.5), so the
 * terminator curve is always a true ellipse arc, not a linear approximation.
 *
 * Orientation is the common simplified convention (waxing = lit on the
 * right, as seen by a northern-hemisphere observer) — a real position-
 * angle-correct terminator would need the Moon's parallactic angle
 * relative to the observer's zenith, which flips for southern-hemisphere
 * observers. Not attempting that here; this is a labeled simplification,
 * the same kind `constellationFacts.ts`'s viewing-month estimate is.
 *
 * Not cached like other sprites — the phase changes with date, but
 * regenerating a 128x128 canvas is cheap enough to do on every recompute
 * (a handful of 2D fill calls), and only one object ever needs it.
 */
export function createMoonPhaseTexture(illumination: number, waxing: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for Moon texture generation')

  const radius = TEXTURE_SIZE * 0.42
  const darkColor = '#3a3d47'
  const litColor = '#e8e6df'

  ctx.save()
  ctx.beginPath()
  ctx.arc(CENTER, CENTER, radius, 0, Math.PI * 2)
  ctx.clip()

  ctx.fillStyle = darkColor
  ctx.fillRect(CENTER - radius, CENTER - radius, radius * 2, radius * 2)

  const k = Math.min(Math.max(illumination, 0), 1)
  const litOnRight = waxing

  if (k > 0.001) {
    ctx.fillStyle = litColor
    ctx.beginPath()
    if (litOnRight) {
      ctx.rect(CENTER, CENTER - radius, radius, radius * 2)
    } else {
      ctx.rect(CENTER - radius, CENTER - radius, radius, radius * 2)
    }
    ctx.fill()

    const ellipseWidth = radius * Math.abs(1 - 2 * k)
    if (k < 0.5) {
      // Crescent: carve the lit half down with a dark ellipse.
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      // Gibbous: extend the lit area into the dark half with a light ellipse.
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = litColor
    }
    ctx.beginPath()
    ctx.ellipse(CENTER, CENTER, ellipseWidth, radius, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
