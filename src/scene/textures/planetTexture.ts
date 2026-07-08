import * as THREE from 'three'
import type { PlanetVisualStyle } from '@/content/planets'

const TEXTURE_SIZE = 160
const CENTER = TEXTURE_SIZE / 2

const textureCache = new Map<PlanetVisualStyle, THREE.CanvasTexture>()
let cachedGlowTexture: THREE.CanvasTexture | null = null

/** Fills a circle whose own radial gradient fades to fully transparent
 * at its edge (rather than a hard-edged fill plus a separate erase
 * pass) — simpler and artifact-free, and doubles as the basic "shaded
 * sphere" look via an off-center highlight (sunlit side) darkening
 * toward the limb. */
function drawShadedDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const highlightOffset = radius * 0.35
  const gradient = ctx.createRadialGradient(
    cx - highlightOffset,
    cy - highlightOffset,
    0,
    cx,
    cy,
    radius,
  )
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.55, 'rgba(216,216,216,1)')
  gradient.addColorStop(0.82, 'rgba(150,150,150,1)')
  gradient.addColorStop(0.96, 'rgba(80,80,80,1)')
  gradient.addColorStop(1, 'rgba(80,80,80,0)')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
}

/** Alternating darkened horizontal stripes clipped to the disc — a
 * simple gas-giant "cloud band" look, applied on top of the shaded
 * disc via a multiply blend so the existing sphere shading shows
 * through rather than being flattened. */
function addCloudBands(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.globalCompositeOperation = 'multiply'

  const bandCount = 7
  const bandHeight = (radius * 2) / bandCount
  for (let i = 0; i < bandCount; i++) {
    if (i % 2 === 0) continue
    const y = cy - radius + i * bandHeight
    ctx.fillStyle = 'rgba(150,150,150,0.35)'
    ctx.fillRect(cx - radius, y, radius * 2, bandHeight)
  }
  ctx.restore()
}

/** Saturn's rings: a tilted flattened annulus drawn *behind* the disc
 * (so the disc's own draw covers the ring's middle), leaving only the
 * two characteristic "ears" visible to the sides — the standard
 * simplified ringed-planet look, consistent with this scene's already-
 * stylized rendering (2D point-sprite stars, flat constellation lines)
 * rather than an attempt at true 3D ring geometry. */
function addRings(ctx: CanvasRenderingContext2D, cx: number, cy: number, bodyRadius: number) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-0.36)

  const outerX = bodyRadius * 2.05
  const outerY = bodyRadius * 0.62
  const innerX = bodyRadius * 1.35
  const innerY = bodyRadius * 0.41

  const gradient = ctx.createLinearGradient(-outerX, 0, outerX, 0)
  gradient.addColorStop(0, 'rgba(214,197,150,0)')
  gradient.addColorStop(0.12, 'rgba(214,197,150,0.9)')
  gradient.addColorStop(0.5, 'rgba(232,220,182,0.95)')
  gradient.addColorStop(0.88, 'rgba(214,197,150,0.9)')
  gradient.addColorStop(1, 'rgba(214,197,150,0)')

  ctx.beginPath()
  ctx.ellipse(0, 0, outerX, outerY, 0, 0, Math.PI * 2)
  ctx.ellipse(0, 0, innerX, innerY, 0, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill('evenodd')
  ctx.restore()
}

function createTexture(style: PlanetVisualStyle): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for planet texture generation')

  if (style === 'ringed') {
    const bodyRadius = TEXTURE_SIZE * 0.26
    addRings(ctx, CENTER, CENTER, bodyRadius)
    drawShadedDisc(ctx, CENTER, CENTER, bodyRadius)
  } else {
    const bodyRadius = TEXTURE_SIZE * 0.42
    drawShadedDisc(ctx, CENTER, CENTER, bodyRadius)
    if (style === 'gasGiant') {
      addCloudBands(ctx, CENTER, CENTER, bodyRadius)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** One shared sprite texture per visual style (rocky / gasGiant /
 * ringed) — generated once and cached, since planets of the same style
 * are visually identical except for the color tint applied via the
 * material's `color`. See PlanetMarker. */
export function getPlanetTexture(style: PlanetVisualStyle): THREE.CanvasTexture {
  const cached = textureCache.get(style)
  if (cached) return cached
  const texture = createTexture(style)
  textureCache.set(style, texture)
  return texture
}

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for planet glow texture generation')

  const gradient = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, CENTER)
  gradient.addColorStop(0, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.18)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** A soft, oversized radial-falloff sprite drawn behind every planet
 * body for a subtle atmospheric-glow feel, additively blended and
 * tinted the same as the body itself. */
export function getPlanetGlowTexture(): THREE.CanvasTexture {
  cachedGlowTexture ??= createGlowTexture()
  return cachedGlowTexture
}
