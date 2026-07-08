import * as THREE from 'three'
import type { DsoIconKind } from '@/content/dsoTypes'

const TEXTURE_SIZE = 128
const CENTER = TEXTURE_SIZE / 2

const textureCache = new Map<DsoIconKind, THREE.CanvasTexture>()

function radialFill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  stops: Array<[number, string]>,
) {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  for (const [offset, color] of stops) {
    gradient.addColorStop(offset, color)
  }
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
}

/** A soft, symmetric glow — the base look for a globular cluster (dense,
 * bright core) or the fallback "unresolved smudge" look. */
function drawGlobularCluster(ctx: CanvasRenderingContext2D) {
  radialFill(ctx, CENTER, CENTER, TEXTURE_SIZE * 0.46, [
    [0, 'rgba(255,255,255,1)'],
    [0.25, 'rgba(255,255,255,0.9)'],
    [0.55, 'rgba(255,255,255,0.45)'],
    [1, 'rgba(255,255,255,0)'],
  ])
}

/** A handful of small bright points scattered within a faint halo — an
 * open cluster reads as individually-resolved stars even at small
 * marker sizes, unlike a globular cluster's single dense smudge. */
function drawOpenCluster(ctx: CanvasRenderingContext2D) {
  radialFill(ctx, CENTER, CENTER, TEXTURE_SIZE * 0.48, [
    [0, 'rgba(255,255,255,0.25)'],
    [0.6, 'rgba(255,255,255,0.12)'],
    [1, 'rgba(255,255,255,0)'],
  ])

  const dotCount = 9
  for (let i = 0; i < dotCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * TEXTURE_SIZE * 0.32
    const x = CENTER + Math.cos(angle) * dist
    const y = CENTER + Math.sin(angle) * dist
    const dotRadius = TEXTURE_SIZE * (0.025 + Math.random() * 0.03)
    radialFill(ctx, x, y, dotRadius, [
      [0, 'rgba(255,255,255,1)'],
      [1, 'rgba(255,255,255,0)'],
    ])
  }
}

/** An irregular, blotchy soft cloud — several overlapping soft-edged
 * blobs rather than one perfect circle, so nebulae read as diffuse gas
 * rather than a solid disc like a star or planet marker. */
function drawNebula(ctx: CanvasRenderingContext2D) {
  const blobCount = 6
  for (let i = 0; i < blobCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * TEXTURE_SIZE * 0.18
    const x = CENTER + Math.cos(angle) * dist
    const y = CENTER + Math.sin(angle) * dist
    const blobRadius = TEXTURE_SIZE * (0.24 + Math.random() * 0.14)
    radialFill(ctx, x, y, blobRadius, [
      [0, 'rgba(255,255,255,0.55)'],
      [0.6, 'rgba(255,255,255,0.25)'],
      [1, 'rgba(255,255,255,0)'],
    ])
  }
}

/** A glowing ring with a dim (not empty) center — the classic
 * planetary-nebula silhouette (e.g. the Ring Nebula), rather than a
 * filled disc. */
function drawPlanetaryNebula(ctx: CanvasRenderingContext2D) {
  radialFill(ctx, CENTER, CENTER, TEXTURE_SIZE * 0.46, [
    [0, 'rgba(255,255,255,0.2)'],
    [0.35, 'rgba(255,255,255,0.3)'],
    [0.55, 'rgba(255,255,255,0.95)'],
    [0.75, 'rgba(255,255,255,0.4)'],
    [1, 'rgba(255,255,255,0)'],
  ])
}

/** An elongated, off-center-core smudge — reads as a distant spiral/
 * elliptical galaxy rather than a symmetric point-like object. Drawn
 * with a squashed transform so the same radial-gradient technique
 * everything else uses still produces an elongated shape. */
function drawGalaxy(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.translate(CENTER, CENTER)
  ctx.rotate(0.5)
  ctx.scale(1, 0.42)
  ctx.translate(-CENTER, -CENTER)
  radialFill(ctx, CENTER, CENTER, TEXTURE_SIZE * 0.48, [
    [0, 'rgba(255,255,255,1)'],
    [0.2, 'rgba(255,255,255,0.85)'],
    [0.5, 'rgba(255,255,255,0.35)'],
    [1, 'rgba(255,255,255,0)'],
  ])
  ctx.restore()
}

const DRAW_FNS: Record<DsoIconKind, (ctx: CanvasRenderingContext2D) => void> = {
  galaxy: drawGalaxy,
  openCluster: drawOpenCluster,
  globularCluster: drawGlobularCluster,
  nebula: drawNebula,
  planetaryNebula: drawPlanetaryNebula,
}

function createTexture(icon: DsoIconKind): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for DSO texture generation')

  DRAW_FNS[icon](ctx)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** One shared, grayscale (white-on-transparent) sprite texture per icon
 * kind, tinted per object via the material's `color` — see DsoMarker.
 * Cached since every object of the same kind shares an identical
 * texture. */
export function getDsoTexture(icon: DsoIconKind): THREE.CanvasTexture {
  const cached = textureCache.get(icon)
  if (cached) return cached
  const texture = createTexture(icon)
  textureCache.set(icon, texture)
  return texture
}
