import * as THREE from 'three'

const TEXTURE_SIZE = 128

let cachedTexture: THREE.CanvasTexture | null = null

function createPlanetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for planet texture generation')

  const center = TEXTURE_SIZE / 2
  const radius = TEXTURE_SIZE / 2

  // Base "sphere" shading: an off-center highlight (sunlit side) fading
  // to a darker limb, baked into a grayscale gradient. Each planet tints
  // this by its own color via the material's `color`, which multiplies
  // the texture's RGB — one shared texture serves every planet.
  const shading = ctx.createRadialGradient(
    center - radius * 0.35,
    center - radius * 0.35,
    0,
    center,
    center,
    radius,
  )
  shading.addColorStop(0, 'rgba(255,255,255,1)')
  shading.addColorStop(0.55, 'rgba(215,215,215,1)')
  shading.addColorStop(0.85, 'rgba(140,140,140,1)')
  shading.addColorStop(1, 'rgba(70,70,70,1)')

  ctx.fillStyle = shading
  ctx.beginPath()
  ctx.arc(center, center, radius * 0.97, 0, Math.PI * 2)
  ctx.fill()

  // Soft, anti-aliased edge fade so the disc doesn't read as a hard
  // cutout against the sky, matching the star shader's soft falloff.
  const edgeMask = ctx.createRadialGradient(center, center, radius * 0.85, center, center, radius)
  edgeMask.addColorStop(0, 'rgba(0,0,0,0)')
  edgeMask.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = edgeMask
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  ctx.globalCompositeOperation = 'source-over'

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * A single shared, pre-shaded circular sprite texture used by every
 * planet marker (see PlanetMarker) — generated once on first use and
 * cached, since it's identical for every planet (only the material's
 * `color` tint differs).
 */
export function getPlanetTexture(): THREE.CanvasTexture {
  cachedTexture ??= createPlanetTexture()
  return cachedTexture
}
