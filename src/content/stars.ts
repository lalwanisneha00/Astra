export interface StarContent {
  description: string
  funFacts: string[]
}

/**
 * Hand-written content for a curated set of well-known named stars,
 * keyed by the exact proper name as it appears in the HYG catalog
 * (`star.names[0]`). The vast majority of the ~40,000 catalog stars have
 * no proper name and won't have an entry here — StarPanel falls back to
 * showing only the real catalog data for those (see "Common issues" in
 * the Phase 4 build notes: missing content is expected, not a bug).
 */
export const STAR_CONTENT: Record<string, StarContent> = {
  Sirius: {
    description:
      'The brightest star in Earth’s night sky, Sirius is a close, hot white main-sequence star just 8.6 light-years away — near enough that its light left when today’s headlines were still current events.',
    funFacts: [
      'Sirius has a faint white dwarf companion, Sirius B, first predicted from wobbles in Sirius’s motion before it was ever directly seen.',
      'Ancient Egyptians tracked Sirius’s first pre-dawn appearance of the year to help predict the annual flooding of the Nile.',
    ],
  },
  Canopus: {
    description:
      'The second-brightest star in the night sky, Canopus is a rare, extremely luminous yellow-white supergiant far more distant than Sirius, appearing bright only because it truly is.',
    funFacts: [
      'Canopus is roughly 10,000 times more luminous than the Sun.',
      'It has long been used for spacecraft navigation — many probes orient themselves using a "Canopus tracker" star sensor.',
    ],
  },
  'Rigil Kentaurus': {
    description:
      'Rigil Kentaurus (Alpha Centauri) is the nearest star system to the Sun, a binary pair of Sun-like stars roughly 4.4 light-years away, with the faint red dwarf Proxima Centauri orbiting much further out.',
    funFacts: [
      'At current spacecraft speeds, reaching Alpha Centauri would still take tens of thousands of years.',
      'Its two main stars orbit each other roughly every 80 years — close enough in the sky to appear as one star to the naked eye.',
    ],
  },
  Arcturus: {
    description:
      'Arcturus is an aging orange giant star, the brightest star in the northern celestial hemisphere, cooler and much larger than the Sun as it burns through the final stages of its life.',
    funFacts: [
      'Its name comes from Greek for "guardian of the bear," since it trails the constellation Ursa Major across the sky.',
      'Arcturus is moving unusually fast through the galaxy, suggesting it may not have formed in the Milky Way’s main disk.',
    ],
  },
  Vega: {
    description:
      'Vega is a bright, young, rapidly-spinning blue-white star about 25 light-years away, historically important as the northern pole star roughly 12,000 years ago and again in about 13,700 years.',
    funFacts: [
      'Vega was the first star (other than the Sun) ever photographed, in 1850.',
      'It spins so fast that it bulges outward at its equator, making it noticeably wider than it is tall.',
    ],
  },
  Capella: {
    description:
      'Capella looks like a single bright yellow star but is actually two pairs of stars: two large yellow giants orbiting each other closely, with two faint red dwarfs orbiting far beyond them.',
    funFacts: [
      'Despite being a giant star, Capella’s two main components are only about as massive as the Sun.',
      'It’s one of the few first-magnitude stars visible for observers at nearly every inhabited latitude on Earth.',
    ],
  },
  Rigel: {
    description:
      'Rigel is a blue supergiant marking Orion’s foot — one of the most luminous stars visible to the naked eye, radiating tens of thousands of times the Sun’s light from roughly 860 light-years away.',
    funFacts: [
      'Rigel is so luminous that if it swapped places with the Sun, it would be many times brighter than the full Moon appears at night from Earth—as seen from Rigel’s actual distance, that light still outshines nearly everything else in Orion.',
      'It’s a massive star nearing the end of its life, and is expected to eventually end in a supernova.',
    ],
  },
  Procyon: {
    description:
      'Procyon is a bright, nearby white star in Canis Minor, paired with a faint white dwarf companion in a system only 11.5 light-years from Earth.',
    funFacts: [
      'Its name means "before the dog" in Greek, since it rises just ahead of Sirius, the "Dog Star."',
      'Like Sirius, its motion was found to wobble long before its dim white dwarf companion was directly observed.',
    ],
  },
  Betelgeuse: {
    description:
      'Betelgeuse is a huge, cool red supergiant marking Orion’s shoulder — so large that if placed at the Sun’s position, it would swallow the orbits of the inner planets.',
    funFacts: [
      'Betelgeuse is expected to explode as a supernova sometime in the next 100,000 years — a blink of an eye astronomically.',
      'A dramatic, temporary dimming in 2019–2020 turned out to be caused by a giant cloud of dust the star had ejected.',
    ],
  },
  Achernar: {
    description:
      'Achernar marks the end of the constellation Eridanus, the River, and is one of the fastest-spinning bright stars known.',
    funFacts: [
      'It spins so fast that its equatorial diameter is roughly 50% larger than its polar diameter — the most flattened naked-eye star known.',
      'Its name comes from Arabic for "the end of the river."',
    ],
  },
  Altair: {
    description:
      'Altair is a fast-spinning white star just under 17 light-years away, forming one corner of the Summer Triangle asterism along with Vega and Deneb.',
    funFacts: [
      'Altair completes a full rotation in under 9 hours, compared to about a month for the Sun, flattening it noticeably at the poles.',
      'It is one of the closest naked-eye stars whose surface has actually been directly imaged by interferometry.',
    ],
  },
  Aldebaran: {
    description:
      'Aldebaran is an orange giant marking the fiery eye of Taurus the bull, appearing to sit within the V-shaped Hyades cluster though it’s actually much closer to Earth than the cluster itself.',
    funFacts: [
      'The Pioneer 10 spacecraft is heading roughly in Aldebaran’s direction, though it would take over two million years to arrive.',
      'Its name comes from Arabic for "the follower," since it appears to follow the Pleiades cluster across the sky.',
    ],
  },
  Antares: {
    description:
      'Antares is a vast red supergiant marking the heart of Scorpius, so large that its diameter would extend past the orbit of Mars if it replaced the Sun.',
    funFacts: [
      'Its name means "rival of Mars," since its distinct red color and brightness are often compared to the planet.',
      'It has a hot blue companion star that is difficult to see next to its much brighter red primary.',
    ],
  },
  Spica: {
    description:
      'Spica is actually two massive, hot blue stars orbiting so closely they distort each other into egg shapes, appearing to the eye as the single brightest star in Virgo.',
    funFacts: [
      'The two stars in the Spica system orbit each other in just about four days.',
      'Ancient astronomers’ records of Spica’s position helped establish the precession of the equinoxes.',
    ],
  },
  Pollux: {
    description:
      'Pollux is an orange giant star in Gemini, the nearest giant star to the Sun, marking one of the twins alongside the fainter star Castor.',
    funFacts: [
      'Pollux hosts a confirmed giant exoplanet, one of the first ever found around a giant star.',
      'Despite the myth of Castor and Pollux as twins, Pollux is noticeably brighter and physically very different from Castor.',
    ],
  },
  Deneb: {
    description:
      'Deneb is an extraordinarily luminous blue-white supergiant marking the tail of Cygnus the swan, and the most distant of the three Summer Triangle stars by far.',
    funFacts: [
      'Despite being hundreds of times farther away than Vega or Altair, Deneb still shines as one of the brightest stars in the sky — a sign of its immense true luminosity.',
      'It’s one of the most luminous stars known in the Milky Way, tens of thousands of times brighter than the Sun.',
    ],
  },
  Regulus: {
    description:
      'Regulus marks the heart of Leo the lion, a fast-spinning blue-white star so flattened by its own rotation that it bulges noticeably at the equator.',
    funFacts: [
      'Regulus spins so quickly that if it rotated only slightly faster, it could potentially begin tearing itself apart.',
      'Its name is Latin for "little king," and it’s actually part of a four-star system.',
    ],
  },
  Polaris: {
    description:
      'Polaris, the current North Star, sits within about a degree of the north celestial pole, making it an anchor point for navigation as Earth rotates beneath it.',
    funFacts: [
      'Polaris is a Cepheid variable star, subtly brightening and dimming over a roughly four-day cycle.',
      'Because of Earth’s slow axial precession, Polaris hasn’t always been — and won’t always be — the North Star.',
    ],
  },
  Dubhe: {
    description:
      'Dubhe is an aging orange giant marking the outer lip of the Big Dipper’s bowl, one of the two "pointer stars" used to find Polaris.',
    funFacts: [
      'A line drawn through Dubhe and Merak, extended about five times, leads almost directly to Polaris.',
      'Dubhe is actually a multiple star system, though its companions are too faint and close to see without a telescope.',
    ],
  },
  Merak: {
    description:
      'Merak marks the other outer corner of the Big Dipper’s bowl, forming the classic "pointer" pair with Dubhe that generations of skywatchers have used to find true north.',
    funFacts: [
      'Merak is a white main-sequence star, physically quite different from its giant-star pointer partner Dubhe.',
      'Along with several other Big Dipper stars, Merak belongs to a loose group of stars moving through space together.',
    ],
  },
  Alkaid: {
    description:
      'Alkaid marks the end of the Big Dipper’s handle, a young, hot blue-white star noticeably different in age and motion from most of the rest of the Dipper.',
    funFacts: [
      'Unlike most of the other Big Dipper stars, Alkaid is not part of the Ursa Major moving group, and just happens to appear nearby.',
      'Its name comes from an Arabic phrase referring to the "leader" of the daughters of the bier, an old Arabic name for the Dipper asterism.',
    ],
  },
  Mizar: {
    description:
      'Mizar, in the bend of the Big Dipper’s handle, forms a famous naked-eye double star with the fainter Alcor, long used as an informal eyesight test.',
    funFacts: [
      'Mizar was the first double star ever discovered telescopically, in 1617.',
      'Mizar itself is actually a system of four stars, two pairs orbiting each other too closely to separate visually.',
    ],
  },
  Alnilam: {
    description:
      'Alnilam is the middle star of Orion’s belt, a blue supergiant far more distant than its belt neighbors yet still one of the brightest stars in the sky.',
    funFacts: [
      'Alnilam is losing mass rapidly through a powerful stellar wind as it nears the end of its life.',
      'Its name comes from Arabic for "string of pearls," describing the belt the three stars form together.',
    ],
  },
  Alnitak: {
    description:
      'Alnitak is the easternmost star of Orion’s belt, a hot blue supergiant that helps illuminate the nearby Flame Nebula.',
    funFacts: [
      'Alnitak is actually a multiple star system, with two close companion stars beyond the naked-eye view.',
      'Its intense ultraviolet light helps energize the glow of several nearby nebulae, including the Flame Nebula.',
    ],
  },
  Bellatrix: {
    description:
      'Bellatrix marks Orion’s other shoulder, a hot blue giant star whose name means "female warrior" in Latin.',
    funFacts: [
      'Bellatrix is sometimes called the "Amazon Star" after its warrior namesake.',
      'Despite looking similar in brightness to many belt stars, Bellatrix is a giant star rather than a supergiant like its neighbors.',
    ],
  },
}
