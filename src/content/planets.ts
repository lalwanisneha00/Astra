export interface PlanetContent {
  description: string
  funFacts: string[]
  diameterKm: number
  massEarths: number
  gravityEarths: number
  /** Known moon count. For Jupiter/Saturn this keeps climbing as small
   * irregular moons are discovered, so it's phrased as a lower bound in
   * the description/fun facts rather than presented as a final count. */
  moons: number
  orbitalPeriodDays: number
  /** Sidereal rotation period, hours. Negative = retrograde rotation
   * (Venus, Uranus) — displayed as an absolute value in the panel, with
   * the retrograde direction called out as its own fun fact instead. */
  rotationPeriodHours: number
  meanDistanceAu: number
  colorHex: string
}

/** Real physical data (IAU / NASA planetary fact sheet figures, rounded).
 * Unlike stars, every planet has all of these fields known precisely, so
 * — unlike STAR_CONTENT — this doubles as the source of the panel's
 * structured facts, not just its prose. */
export const PLANET_CONTENT: Record<string, PlanetContent> = {
  Mercury: {
    description:
      'The smallest planet and the closest to the Sun, Mercury has almost no atmosphere to hold in heat, so it swings between blistering days and frigid nights more extreme than any other planet.',
    funFacts: [
      'A single Mercury day (sunrise to sunrise) lasts about 176 Earth days — longer than its own year.',
      "Despite being closest to the Sun, Mercury isn't the hottest planet: that title goes to Venus, thanks to its thick, heat-trapping atmosphere.",
    ],
    diameterKm: 4879,
    massEarths: 0.055,
    gravityEarths: 0.38,
    moons: 0,
    orbitalPeriodDays: 88.0,
    rotationPeriodHours: 1407.6,
    meanDistanceAu: 0.387,
    colorHex: '#9c9691',
  },
  Venus: {
    description:
      'Similar in size to Earth but utterly hostile, Venus is shrouded in thick clouds of sulfuric acid over a crushing, carbon-dioxide atmosphere that traps heat in a runaway greenhouse effect.',
    funFacts: [
      'Venus rotates backwards (retrograde) compared to most planets, and so slowly that its day is longer than its year.',
      "It's the hottest planet in the solar system, with a surface temperature around 465°C — hot enough to melt lead.",
    ],
    diameterKm: 12104,
    massEarths: 0.815,
    gravityEarths: 0.904,
    moons: 0,
    orbitalPeriodDays: 224.7,
    rotationPeriodHours: -5832.5,
    meanDistanceAu: 0.723,
    colorHex: '#e8cda2',
  },
  Mars: {
    description:
      'The Red Planet gets its color from iron oxide (rust) coating its dusty surface. It hosts the tallest known volcano and deepest canyon in the solar system, and once had rivers and lakes of liquid water.',
    funFacts: [
      'Olympus Mons, a Martian volcano, stands roughly three times the height of Mount Everest.',
      'Its two small moons, Phobos and Deimos, are thought to be captured asteroids rather than formed alongside Mars.',
    ],
    diameterKm: 6779,
    massEarths: 0.107,
    gravityEarths: 0.38,
    moons: 2,
    orbitalPeriodDays: 686.98,
    rotationPeriodHours: 24.6,
    meanDistanceAu: 1.524,
    colorHex: '#c1440e',
  },
  Jupiter: {
    description:
      'The largest planet by far, Jupiter is a gas giant with a Great Red Spot — a storm bigger than Earth that has raged for centuries — and a powerful magnetic field that shapes its own radiation belts.',
    funFacts: [
      'Jupiter is more massive than all the other planets combined, roughly 2.5 times over.',
      'It has more than 95 confirmed moons and counting, including the four large Galilean moons Galileo himself spotted through an early telescope in 1610.',
    ],
    diameterKm: 139820,
    massEarths: 317.8,
    gravityEarths: 2.53,
    moons: 95,
    orbitalPeriodDays: 4332.6,
    rotationPeriodHours: 9.9,
    meanDistanceAu: 5.204,
    colorHex: '#d8ca9d',
  },
  Saturn: {
    description:
      'Famous for its spectacular ring system of ice and rock, Saturn is the least dense planet in the solar system — it would float in a bathtub large enough to hold it.',
    funFacts: [
      'Saturn has more than 146 confirmed moons, more than any other planet — a count still rising with new discoveries.',
      'Its rings span up to hundreds of thousands of kilometers wide, yet are typically only about 10 meters thick.',
    ],
    diameterKm: 116460,
    massEarths: 95.2,
    gravityEarths: 1.06,
    moons: 146,
    orbitalPeriodDays: 10759,
    rotationPeriodHours: 10.7,
    meanDistanceAu: 9.573,
    colorHex: '#e3d9b8',
  },
  Uranus: {
    description:
      'An ice giant tipped almost completely on its side, Uranus rolls around the Sun like a ball rather than spinning upright — a tilt likely caused by an ancient, massive collision.',
    funFacts: [
      "Uranus's axial tilt of about 98° means its poles, not its equator, point roughly toward the Sun for part of each orbit.",
      'Like Venus, it rotates in retrograde, spinning opposite to most planets in the solar system.',
    ],
    diameterKm: 50724,
    massEarths: 14.5,
    gravityEarths: 0.89,
    moons: 28,
    orbitalPeriodDays: 30687,
    rotationPeriodHours: -17.2,
    meanDistanceAu: 19.165,
    colorHex: '#9fd9e0',
  },
  Neptune: {
    description:
      'The most distant known planet, Neptune is a deep-blue ice giant with the fastest winds in the solar system, whipping up storms at speeds over 2,000 km/h.',
    funFacts: [
      "Neptune was the first planet found by mathematical prediction rather than direct observation — its gravity was pulling on Uranus's orbit before anyone had seen it.",
      'One Neptune year lasts about 165 Earth years; it has completed barely more than one full orbit since its discovery in 1846.',
    ],
    diameterKm: 49244,
    massEarths: 17.1,
    gravityEarths: 1.14,
    moons: 16,
    orbitalPeriodDays: 60190,
    rotationPeriodHours: 16.1,
    meanDistanceAu: 30.178,
    colorHex: '#3e5fcc',
  },
}
