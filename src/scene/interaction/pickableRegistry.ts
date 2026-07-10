import type { Object3D, Vector3 } from 'three'
import type { SelectableObjectType } from '@/state/useSelectionStore'

export interface PickResolution {
  id: string
  /** This candidate's true direction from the camera (the origin) —
   * used to fairly compare "how close is this to the cursor" across
   * every object type, regardless of how each one's own raycasting
   * technique locates a hit. See scene/interaction/pick.ts's module doc
   * for why that fairness matters. */
  direction: Vector3
  /** Only meaningful for stars — see HoveredObject's doc comment. */
  index?: number
}

export interface PickableEntry {
  type: SelectableObjectType
  /**
   * Resolves a raw raycast hit against this object into a concrete,
   * currently-selectable candidate, or `null` if the hit doesn't
   * correspond to a real, currently-visible object right now (e.g. a
   * star index that's culled below the horizon, or a deep-sky object
   * that hasn't faded in enough at this zoom depth to be worth
   * clicking).
   *
   * @param index Buffer index, only meaningful for the shared star
   *   `Points` object (one object represents many individual stars,
   *   distinguished only by which index the raycast landed on).
   * @param point The raycast's own hit point, in world space — exact
   *   for mesh objects (DSO/planet/Sun/Moon markers), and used as-is for
   *   them and for constellation lines; stars must resolve their own
   *   true position instead of using this (see the module doc in
   *   pick.ts for why).
   */
  resolve: (index: number | undefined, point: Vector3) => PickResolution | null
}

const registry = new Map<Object3D, PickableEntry>()

/**
 * Registers an Object3D as pick-able by the InteractionManager. This is
 * the *only* coupling point between a render layer and the interaction
 * system, and it's a one-way declaration — "here I am, here's how to
 * resolve a hit on me" — not a dependency on how picking itself works,
 * which lives entirely in scene/interaction/InteractionManager.tsx.
 */
export function registerPickable(object: Object3D, entry: PickableEntry): () => void {
  registry.set(object, entry)
  return () => {
    registry.delete(object)
  }
}

export function getPickableObjects(): Object3D[] {
  return [...registry.keys()]
}

export function getPickableEntry(object: Object3D): PickableEntry | undefined {
  return registry.get(object)
}
