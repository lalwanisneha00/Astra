export interface MeteorShower {
  id: string
  name: string
  /** Peak date recurs annually — month is 1-12. */
  peakMonth: number
  peakDay: number
  /** How many days before/after the peak the shower is still worth
   * watching for — a rough, honest window, not a precise cutoff. */
  activeWindowDays: number
  /** Zenith Hourly Rate at peak — meteors/hour under perfect dark-sky
   * conditions with the radiant directly overhead; always fewer in
   * practice. */
  zhr: number
  /** Radiant position, degrees — where the meteors appear to originate
   * from, not where to stare (meteors streak across a wide area). */
  radiant: { ra: number; dec: number }
  radiantConstellation: string
  description: string
}

/**
 * A small, hand-authored calendar of the major annual meteor showers —
 * astronomy-engine has no built-in meteor shower data (confirmed via
 * its full API surface), and there's no comet/meteor dataset integrated
 * into this project, so this is cross-checked against widely-published
 * figures the same way `PLANET_CONTENT`'s physical facts are.
 */
export const METEOR_SHOWERS: MeteorShower[] = [
  {
    id: 'quadrantids',
    name: 'Quadrantids',
    peakMonth: 1,
    peakDay: 4,
    activeWindowDays: 2,
    zhr: 110,
    radiant: { ra: 230, dec: 49 },
    radiantConstellation: 'Boötes',
    description:
      'One of the strongest annual showers, but with a sharp, brief peak — miss the peak night and rates drop off fast.',
  },
  {
    id: 'lyrids',
    name: 'Lyrids',
    peakMonth: 4,
    peakDay: 22,
    activeWindowDays: 2,
    zhr: 18,
    radiant: { ra: 271, dec: 34 },
    radiantConstellation: 'Lyra',
    description:
      'A modest but reliable shower, known for occasional bright fireballs, radiating from near Vega.',
  },
  {
    id: 'eta-aquariids',
    name: 'Eta Aquariids',
    peakMonth: 5,
    peakDay: 6,
    activeWindowDays: 3,
    zhr: 50,
    radiant: { ra: 338, dec: -1 },
    radiantConstellation: 'Aquarius',
    description:
      "Debris from Halley's Comet — fast, often leaving glowing trails, best seen from the tropics and southern hemisphere.",
  },
  {
    id: 'delta-aquariids',
    name: 'Southern Delta Aquariids',
    peakMonth: 7,
    peakDay: 30,
    activeWindowDays: 4,
    zhr: 25,
    radiant: { ra: 339, dec: -16 },
    radiantConstellation: 'Aquarius',
    description: 'A steady, long-lasting shower that overlaps with the more famous Perseids.',
  },
  {
    id: 'perseids',
    name: 'Perseids',
    peakMonth: 8,
    peakDay: 12,
    activeWindowDays: 3,
    zhr: 100,
    radiant: { ra: 48, dec: 58 },
    radiantConstellation: 'Perseus',
    description:
      "The most popular meteor shower of the year — warm summer nights, high rates, and Comet Swift-Tuttle's rich debris trail.",
  },
  {
    id: 'orionids',
    name: 'Orionids',
    peakMonth: 10,
    peakDay: 21,
    activeWindowDays: 3,
    zhr: 20,
    radiant: { ra: 95, dec: 16 },
    radiantConstellation: 'Orion',
    description:
      "Another Halley's Comet remnant shower, known for fast, occasionally bright meteors near Orion's raised club.",
  },
  {
    id: 'leonids',
    name: 'Leonids',
    peakMonth: 11,
    peakDay: 17,
    activeWindowDays: 2,
    zhr: 15,
    radiant: { ra: 152, dec: 22 },
    radiantConstellation: 'Leo',
    description:
      'Usually modest, but historically famous for producing spectacular meteor storms roughly every 33 years.',
  },
  {
    id: 'geminids',
    name: 'Geminids',
    peakMonth: 12,
    peakDay: 14,
    activeWindowDays: 3,
    zhr: 150,
    radiant: { ra: 112, dec: 33 },
    radiantConstellation: 'Gemini',
    description:
      'The strongest, most reliable shower of the year — slow, bright, multicolored meteors from an asteroid, not a comet.',
  },
  {
    id: 'ursids',
    name: 'Ursids',
    peakMonth: 12,
    peakDay: 22,
    activeWindowDays: 2,
    zhr: 10,
    radiant: { ra: 217, dec: 75 },
    radiantConstellation: 'Ursa Minor',
    description:
      'A quiet, often-overlooked shower near the end of the year, radiating near Polaris.',
  },
]
