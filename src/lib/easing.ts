/**
 * Frame-rate-independent exponential damping: moves `current` toward
 * `target` at a rate controlled by `lambda` (higher = faster), regardless
 * of the size of `deltaTime`. Kept dependency-free (no `three` import)
 * since `src/lib` is meant to stay generic/framework-agnostic.
 */
export function damp(current: number, target: number, lambda: number, deltaTime: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * deltaTime))
}
