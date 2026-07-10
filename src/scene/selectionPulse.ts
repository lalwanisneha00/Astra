import { clamp, smoothstep01 } from '@/lib/math'

/** How long the "just selected" pulse takes to fully decay. */
export const SELECTION_PULSE_DURATION_SECONDS = 1.2

/**
 * 1 the instant an object is selected, easing smoothly to 0 over
 * `SELECTION_PULSE_DURATION_SECONDS` — a brief, subtle "look here" pulse
 * layered on top of each marker's existing static selected-highlight
 * treatment (color/opacity/scale), for both direct clicks and search
 * navigation landing on an object.
 */
export function selectionPulseIntensity(elapsedSeconds: number): number {
  const t = clamp(elapsedSeconds / SELECTION_PULSE_DURATION_SECONDS, 0, 1)
  return 1 - smoothstep01(t)
}
