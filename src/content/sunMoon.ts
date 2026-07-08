export interface SunMoonContent {
  description: string
  funFacts: string[]
  diameterKm: number
}

/** Real physical data, hand-authored the same way PLANET_CONTENT is
 * (cross-checked against widely-published figures, not pulled from a
 * redistributed dataset file — see ATTRIBUTIONS.md). */
export const SUN_CONTENT: SunMoonContent & {
  massEarths: number
  surfaceTempK: number
  ageBillionYears: number
} = {
  description:
    'The Sun is the star at the center of the solar system — an enormous ball of hydrogen and helium whose gravity holds every planet, moon, and asteroid in orbit.',
  funFacts: [
    'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
    'The Sun accounts for more than 99.8% of all the mass in the entire solar system.',
    'Its core reaches about 15 million °C, hot enough to fuse hydrogen into helium — the reaction that powers every bit of its light and heat.',
  ],
  diameterKm: 1_392_700,
  massEarths: 333_000,
  surfaceTempK: 5778,
  ageBillionYears: 4.6,
}

export const MOON_CONTENT: SunMoonContent & {
  meanDistanceKm: number
  orbitalPeriodDays: number
} = {
  description:
    "Earth's only natural satellite, the Moon is the fifth-largest moon in the solar system and the closest large body to Earth — close enough that its gravity raises our ocean tides.",
  funFacts: [
    'The Moon is tidally locked to Earth, always showing the same face — which is why no one had seen its far side until spacecraft photographed it in 1959.',
    "It's slowly drifting away from Earth at about 3.8 cm per year, roughly the rate fingernails grow.",
    'Twelve astronauts have walked on the Moon, all during the Apollo missions between 1969 and 1972.',
  ],
  diameterKm: 3474.8,
  meanDistanceKm: 384_400,
  orbitalPeriodDays: 27.32,
}
