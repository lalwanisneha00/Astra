import type { EquatorialCoord } from './coordinates'

/** Raw OpenNGC type codes this app renders — see content/dsoTypes.ts for
 * the human-readable label/color/icon each maps to. */
export type DsoTypeCode = 'G' | 'OCl' | 'GCl' | 'Cl+N' | 'Neb' | 'PN' | 'SNR' | 'HII' | 'RfN'

export interface DeepSkyObject {
  /** NGC/IC designation (e.g. "NGC0224"), or a hand-added id for the rare
   * object missing from OpenNGC entirely (see scripts/build-dso.ts). */
  id: string
  type: DsoTypeCode
  equatorial: EquatorialCoord
  /** IAU 3-letter constellation abbreviation, e.g. "And". */
  constellation: string | null
  magnitude: number | null
  /** Apparent major axis, arcminutes — used to give bigger, closer
   * objects (e.g. Andromeda Galaxy) a visibly bigger marker than small
   * unresolved ones. */
  sizeArcmin: number | null
  /** "M31" style Messier designation, or null if it has none. */
  messier: string | null
  commonNames: string[]
}
