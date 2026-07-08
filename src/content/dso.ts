export interface DsoContent {
  description: string
  funFacts: string[]
}

/**
 * Hand-written content for a curated set of the most famous deep-sky
 * objects, keyed by catalog id (the `id` field in dso.json — NGC/IC
 * designation, or the hand-added id for the one object missing from
 * OpenNGC). The other ~500 curated objects have no entry here and fall
 * back to showing only their real catalog data — the same graceful-
 * degradation pattern as STAR_CONTENT.
 */
export const DSO_CONTENT: Record<string, DsoContent> = {
  NGC0224: {
    description:
      'The nearest large galaxy to the Milky Way, Andromeda is on a slow collision course with our own galaxy — a merger due in roughly 4-5 billion years.',
    funFacts: [
      'Andromeda is visible to the naked eye under dark skies, despite being about 2.5 million light-years away — the most distant object most people will ever see unaided.',
      "It's larger on the sky than the full Moon; its faint outer regions are simply too dim to notice without long-exposure photography.",
    ],
  },
  NGC1976: {
    description:
      'The Orion Nebula is a vast stellar nursery where new stars are actively forming, visible to the naked eye as the fuzzy "star" in Orion\'s sword.',
    funFacts: [
      "At roughly 1,344 light-years away, it's one of the closest large star-forming regions to Earth.",
      'The four bright young stars at its heart, the Trapezium, light up the surrounding gas and make the nebula glow.',
    ],
  },
  NGC1952: {
    description:
      'The Crab Nebula is the wreckage of a star that exploded as a supernova — an event bright enough that observers on Earth recorded it in the year 1054.',
    funFacts: [
      'At its center spins the Crab Pulsar, a neutron star rotating about 30 times per second.',
      'Chinese and Arab astronomers documented the original supernova as a "guest star" visible in daylight for weeks.',
    ],
  },
  NGC6720: {
    description:
      'The Ring Nebula is the glowing shell of gas shed by a dying, Sun-like star — a preview of what our own Sun will look like in its final act, billions of years from now.',
    funFacts: [
      'What looks like a simple ring is really a barrel-shaped shell of gas seen end-on.',
      'The faint white dwarf at its center is the exposed core of the star that shed this shell.',
    ],
  },
  NGC5194: {
    description:
      'The Whirlpool Galaxy is a textbook spiral galaxy, its arms stretched and sharpened by gravitational interaction with a smaller companion galaxy behind it.',
    funFacts: [
      'It was the first galaxy in which spiral structure was ever observed, by Lord Rosse in 1845.',
      "Its companion, NGC 5195, is slowly being torn apart and pulled through the Whirlpool's spiral arms.",
    ],
  },
  NGC0598: {
    description:
      'The Triangulum Galaxy is the third-largest member of our Local Group of galaxies, after Andromeda and the Milky Way.',
    funFacts: [
      "Under excellent dark skies, it's one of the most distant objects visible to the naked eye, alongside Andromeda.",
      'It may be a satellite galaxy of Andromeda, gravitationally bound in a long, slow orbit around it.',
    ],
  },
  Mel022: {
    description:
      'The Pleiades is a bright, young open star cluster — one of the closest and most easily recognized to the naked eye, often mistaken for a tiny dipper.',
    funFacts: [
      "The cluster's hot young stars are still wrapped in wisps of the reflection nebula they formed from, faintly visible in long-exposure photos.",
      'Nearly every culture in recorded history has its own name and mythology for this cluster — from the Seven Sisters of Greek myth to Subaru in Japan.',
    ],
  },
  NGC6205: {
    description:
      'One of the brightest globular clusters visible from the northern hemisphere, Messier 13 is a dense ball of several hundred thousand stars bound together by gravity.',
    funFacts: [
      "It's roughly 22,000-25,000 light-years away, yet bright enough to glimpse with the naked eye under dark skies.",
      "In 1974, a symbolic radio message aimed at M13 was broadcast from the Arecibo Observatory — humanity's first deliberate interstellar transmission.",
    ],
  },
  NGC2632: {
    description:
      'The Beehive Cluster is one of the closest open star clusters to Earth, a loose swarm of stars faintly visible to the naked eye as a small misty patch.',
    funFacts: [
      'Galileo was the first to resolve it into individual stars through a telescope in 1609.',
      'Ancient Greek and Chinese astronomers both recorded it as a small cloudy patch long before telescopes existed.',
    ],
  },
  NGC6853: {
    description:
      'The Dumbbell Nebula was the first planetary nebula ever discovered, its double-lobed shape formed as a dying star cast off its outer layers.',
    funFacts: [
      'Despite the name, planetary nebulae have nothing to do with planets — early astronomers just thought they looked like planetary discs through small telescopes.',
      'It spans roughly 3 light-years and continues to expand outward from its central star.',
    ],
  },
}
