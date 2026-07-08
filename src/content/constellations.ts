export interface ConstellationContent {
  pronunciation: string
  mythology: string
  funFacts: string[]
}

/**
 * Hand-written content for a curated set of well-known constellations,
 * keyed by IAU 3-letter abbreviation. Less prominent constellations still
 * get real computed facts (zodiac, hemisphere, viewing months, brightest
 * stars) — they just don't have mythology/fun-fact prose here yet.
 */
export const CONSTELLATION_CONTENT: Record<string, ConstellationContent> = {
  Ori: {
    pronunciation: 'oh-RYE-on',
    mythology:
      'Orion represents a great hunter of Greek myth, often shown facing the charging bull Taurus with his club and shield raised, his belt of three bright stars among the most recognizable patterns in the sky.',
    funFacts: [
      'The three stars of Orion’s Belt — Alnitak, Alnilam, and Mintaka — are unrelated in distance but happen to line up almost perfectly from Earth’s viewpoint.',
      'The Orion Nebula (M42), visible to the naked eye as a fuzzy "star" in Orion’s sword, is one of the closest and most active star-forming regions to Earth.',
    ],
  },
  UMa: {
    pronunciation: 'OOH-sa MAY-jer',
    mythology:
      'Ursa Major, the Great Bear, contains the seven bright stars of the Big Dipper (or Plough) as its most famous asterism, and appears in bear-related legends across many cultures independently.',
    funFacts: [
      'The Big Dipper isn’t a constellation itself — it’s an asterism, a recognizable star pattern within the much larger official constellation of Ursa Major.',
      'Most of the Big Dipper’s stars share a common motion through space as part of the Ursa Major Moving Group — except for the two end stars, Dubhe and Alkaid.',
    ],
  },
  UMi: {
    pronunciation: 'OOH-sa MY-ner',
    mythology:
      'Ursa Minor, the Little Bear, is anchored by Polaris, the North Star, at the end of its tail — a fixed point in the sky that has guided navigators for millennia.',
    funFacts: [
      'Polaris hasn’t always been the North Star and won’t always be — Earth’s axis slowly wobbles over about 26,000 years, a cycle called precession.',
      'Despite its fame, Polaris is only the 48th-brightest star in the sky — its usefulness comes from its position, not its brightness.',
    ],
  },
  Cas: {
    pronunciation: 'kass-ee-oh-PEE-uh',
    mythology:
      'Cassiopeia represents a vain queen from Greek myth, condemned to circle the celestial pole in her throne — appearing upside-down for half of every night as a punishment.',
    funFacts: [
      'Cassiopeia’s five brightest stars form a distinctive "W" (or "M") shape that makes it one of the easiest constellations to spot.',
      'Because it’s so close to the north celestial pole, Cassiopeia never sets for most observers north of the equator.',
    ],
  },
  Cyg: {
    pronunciation: 'SIG-nus',
    mythology:
      'Cygnus, the Swan, flies south along the Milky Way, its long neck and outstretched wings traced by a pattern of stars also known as the Northern Cross.',
    funFacts: [
      'Deneb, Cygnus’s brightest star, is one of the most luminous stars known — its light left the star many centuries before reaching Earth.',
      'Cygnus sits directly in the plane of the Milky Way, making it a rich hunting ground for star clusters and nebulae.',
    ],
  },
  Leo: {
    pronunciation: 'LEE-oh',
    mythology:
      'Leo represents the Nemean Lion slain by Hercules in Greek myth, its distinctive sickle-shaped head and mane still recognizable as one of the few constellations that actually resembles its namesake.',
    funFacts: [
      'Leo is one of the easiest zodiac constellations to recognize, thanks to the backward-question-mark "sickle" outlining the lion’s head and mane.',
      'The Leonid meteor shower, visible each November, appears to radiate from within this constellation.',
    ],
  },
  Sco: {
    pronunciation: 'SKOR-pee-us',
    mythology:
      'Scorpius represents the scorpion that, in Greek myth, killed the hunter Orion — the two are placed on opposite sides of the sky so they are never visible at the same time.',
    funFacts: [
      'Scorpius is one of the few constellations that genuinely looks like its namesake, with a long curving tail of stars ending in a "stinger."',
      'Its brightest star, Antares, marks the scorpion’s fiery red heart and is sometimes mistaken for Mars because of its similar color.',
    ],
  },
  Tau: {
    pronunciation: 'TOR-us',
    mythology:
      'Taurus represents a bull in Greek myth — often depicted as only the front half, charging toward the hunter Orion, with the bright red star Aldebaran marking its eye.',
    funFacts: [
      'The Pleiades and Hyades, two of the closest and most famous star clusters to Earth, both sit within Taurus.',
      'Aldebaran only appears to be part of the V-shaped Hyades cluster — it’s actually much closer to Earth and unrelated to it.',
    ],
  },
  Gem: {
    pronunciation: 'JEM-in-eye',
    mythology:
      'Gemini represents the mythological twins Castor and Pollux, marked by the two bright stars of the same names at the "heads" of the twin figures.',
    funFacts: [
      'Despite the twin mythology, Castor and Pollux are physically very different stars — Castor is a multiple star system, Pollux a single orange giant.',
      'The Geminid meteor shower, one of the most reliable annual showers, appears to radiate from this constellation each December.',
    ],
  },
  And: {
    pronunciation: 'an-DROM-eh-duh',
    mythology:
      'Andromeda represents a princess of Greek myth, chained to a rock as a sacrifice to a sea monster before being rescued by the hero Perseus — whose constellation lies right beside hers.',
    funFacts: [
      'The Andromeda Galaxy (M31), visible to the naked eye as a faint smudge, is the most distant object most people will ever see without a telescope.',
      'Andromeda and the Milky Way are on a slow collision course, expected to merge in a few billion years.',
    ],
  },
  Per: {
    pronunciation: 'PUR-see-us',
    mythology:
      'Perseus represents the hero who slew the gorgon Medusa, often depicted holding her severed head — marked by the star Algol, the "Demon Star."',
    funFacts: [
      'Algol is a famous eclipsing binary star that visibly dims every few days as one star passes in front of the other — early astronomers found its "wink" unsettling.',
      'The Perseid meteor shower, one of the most popular annual showers, appears to radiate from this constellation each August.',
    ],
  },
  Peg: {
    pronunciation: 'PEG-uh-sus',
    mythology:
      'Pegasus represents the winged horse of Greek myth, marked in the sky by the Great Square — four stars forming the horse’s body (one of which is technically shared with neighboring Andromeda).',
    funFacts: [
      'The famous "Great Square of Pegasus" is a large, mostly empty asterism useful for star-hopping to fainter neighboring constellations.',
      'Pegasus 51, a star in this constellation, hosted the first exoplanet ever confirmed around a Sun-like star.',
    ],
  },
  Aql: {
    pronunciation: 'AK-will-uh',
    mythology:
      'Aquila represents an eagle in Greek myth, often described as carrying Zeus’s thunderbolts, marked by its brightest star Altair at the eagle’s body.',
    funFacts: [
      'Altair is one of the closest naked-eye stars to Earth and spins so quickly it’s noticeably flattened at its poles.',
      'Aquila forms one corner of the Summer Triangle, along with Vega in Lyra and Deneb in Cygnus.',
    ],
  },
  Lyr: {
    pronunciation: 'LYE-ruh',
    mythology:
      'Lyra represents the lyre of Orpheus, the legendary musician of Greek myth whose playing was said to charm even stones — marked by the brilliant star Vega.',
    funFacts: [
      'Vega was the northern pole star around 12,000 BCE and will be again in about 13,700 years, due to Earth’s slow axial precession.',
      'Lyra is small but rich, also home to the Ring Nebula, a glowing shell of gas shed by a dying star.',
    ],
  },
  Dra: {
    pronunciation: 'DRAY-co',
    mythology:
      'Draco, the Dragon, winds a long trail of stars between the Great and Little Bears — in Greek myth, the dragon that guarded the golden apples of the Hesperides.',
    funFacts: [
      'Draco is large but faint, snaking across a huge area of sky without a single first-magnitude star.',
      'Thuban, a modest star in Draco’s tail, was the north pole star around 3000 BCE when Egypt’s pyramids were built.',
    ],
  },
  Sgr: {
    pronunciation: 'saj-ih-TARE-ee-us',
    mythology:
      'Sagittarius represents an archer, usually depicted as a centaur drawing a bow — its brightest stars form a distinctive "Teapot" asterism pointed toward the center of the Milky Way.',
    funFacts: [
      'The center of our own galaxy lies in the direction of Sagittarius, hidden behind thick clouds of dust.',
      'Sagittarius is rich with star clusters and nebulae, since looking through it means looking toward the crowded galactic core.',
    ],
  },
  Ari: {
    pronunciation: 'AIR-eez',
    mythology:
      'Aries represents the ram with the golden fleece from Greek myth, sought by Jason and the Argonauts — a modest constellation of faint stars for such a famous story.',
    funFacts: [
      'Aries once marked the Sun’s position at the spring equinox — the reason that point is still called the "First Point of Aries," even though precession has since shifted it into Pisces.',
      'Despite its fame in mythology and astrology, Aries has no stars brighter than second magnitude.',
    ],
  },
  Vir: {
    pronunciation: 'VUR-go',
    mythology:
      'Virgo, the maiden, is often associated with Greek harvest goddesses and is marked by its brightest star Spica — traditionally depicted as an ear of wheat in her hand.',
    funFacts: [
      'Virgo is the second-largest constellation in the sky by area, after Hydra.',
      'The Virgo Cluster, a vast collection of thousands of galaxies, lies within this constellation and anchors the larger Virgo Supercluster that includes our own Milky Way.',
    ],
  },
  Cen: {
    pronunciation: 'sen-TOR-us',
    mythology:
      'Centaurus represents a centaur, half-man and half-horse, and hosts Rigil Kentaurus (Alpha Centauri) — the closest star system to our own.',
    funFacts: [
      'Omega Centauri, within this constellation, is the largest and brightest globular star cluster visible from Earth, containing millions of stars.',
      'Centaurus is a far-southern constellation, invisible for much of the northern hemisphere.',
    ],
  },
  Cru: {
    pronunciation: 'KROOKS',
    mythology:
      'Crux, the Southern Cross, is the smallest constellation in the sky, but among the most culturally significant in the southern hemisphere, appearing on several national flags.',
    funFacts: [
      'Crux is so far south that it isn’t visible at all from most of the continental United States or Europe.',
      'Despite being the smallest constellation by area, Crux is one of the most recognizable, thanks to its four bright, tightly-arranged stars.',
    ],
  },
}
