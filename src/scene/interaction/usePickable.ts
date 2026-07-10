import { useEffect, useRef, type RefObject } from 'react'
import type { Object3D, Vector3 } from 'three'
import type { SelectableObjectType } from '@/state/useSelectionStore'
import { registerPickable, type PickResolution } from './pickableRegistry'

/**
 * Declares an Object3D as selectable by the centralized
 * InteractionManager (see pickableRegistry.ts). `resolve` is captured
 * through a ref so the registration effect only needs to run once, when
 * the underlying object first mounts, rather than on every render —
 * while every call still runs the *latest* closure, which is free to
 * read the caller's own live refs/props/state at call time.
 */
export function usePickable(
  ref: RefObject<Object3D | null>,
  type: SelectableObjectType,
  resolve: (index: number | undefined, point: Vector3) => PickResolution | null,
): void {
  const resolveRef = useRef(resolve)
  useEffect(() => {
    resolveRef.current = resolve
  })

  useEffect(() => {
    const object = ref.current
    if (!object) return
    return registerPickable(object, {
      type,
      resolve: (index, point) => resolveRef.current(index, point),
    })
  }, [ref, type])
}
