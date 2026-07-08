# Attributions

Astra is built on real, open astronomy data and open-source software.
This file tracks every third-party dataset bundled into the app, along
with its license and required credit. Update it in the same phase that
integrates a new dataset — don't let this drift from what's actually
shipped in `public/data/`.

## Data sources

### HYG Database (stars)

- **Source:** [HYG Database](https://codeberg.org/astronexus/hyg), release
  v41 (`hygdata_v41.csv`). The historical GitHub mirror
  (`astronexus/HYG-Database`) is now an archive of the same releases;
  Codeberg is the canonical, actively-updated home going forward.
- **License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
  Attribution required; any redistributed derivative (including the
  processed `public/data/stars-tier*.json` files built by
  `scripts/build-stars.ts`) must remain under the same license.
- **Used for:** star positions (RA/Dec), apparent/absolute magnitude,
  distance, spectral type, B-V color index, luminosity, constellation,
  and proper/Bayer/Flamsteed names — see `scripts/build-stars.ts` for the
  exact field mapping and `src/types/star.ts` for the shape shipped to
  the client.
- **Processing:** filtered to three magnitude tiers (≤4, ≤6.5, ≤8),
  color/temperature derived from B-V (Ballesteros' formula + Tanner
  Helland's blackbody approximation — see `scripts/lib/color.ts`), unit
  conversions (parsecs → light years, radians → degrees) applied at
  build time. The Sun (HYG id 0) is excluded — it isn't a background
  star as seen from Earth.

### d3-celestial (constellation lines and names)

- **Source:** [d3-celestial](https://github.com/ofrohn/d3-celestial) by
  Olaf Frohn — `data/constellations.json` (names/label positions) and
  `data/constellations.lines.json` (line figures).
- **License:** BSD-3-Clause. Copyright notice retained here and in
  `scripts/build-constellations.ts`.
- **Used for:** the 88 IAU constellation figures (as connected line
  segments) and their name label positions. RA is converted from
  d3-celestial's `[-180, 180]` longitude-style convention to this
  project's standard `[0, 360)` degrees (see
  `scripts/build-constellations.ts`).
- **Not from this dataset:** zodiac membership, hemisphere, and "best
  viewing months" are computed (`src/astronomy/constellationFacts.ts`);
  mythology and fun facts are hand-written for a curated subset
  (`src/content/constellations.ts`); "brightest stars" is computed at
  runtime from the HYG catalog already loaded for Phase 3/4.

### GeoNames (world cities, for the manual location picker)

- **Source:** [GeoNames](https://www.geonames.org) `cities15000` export
  — every city with population > 15,000, or a national capital
  regardless of size (~34,000 entries).
- **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  Attribution required.
- **Used for:** `LocationPicker`'s city search fallback when geolocation
  is denied/unavailable (Phase 7) — see `scripts/build-cities.ts`.
  Initially hand-curated to ~130 cities, which turned out to have far
  too little coverage in practice (e.g. only 5 Indian cities, missing
  Pune, Hyderabad, Ahmedabad, Jaipur, and thousands more); replaced with
  this real dataset once that gap surfaced during testing.
- **Processing:** country codes resolved to full English names via
  GeoNames' own `countryInfo.txt`; sorted by population descending so
  search results favor larger, more likely-intended cities within each
  match tier.

### OpenNGC (deep-sky objects)

- **Source:** [OpenNGC](https://github.com/mattiaverga/OpenNGC) by
  Mattia Verga & contributors — `database_files/NGC.csv`.
- **License:** CC-BY-SA-4.0. Attribution required; any redistributed
  derivative (including `public/data/dso.json`, built by
  `scripts/build-dso.ts`) must remain under the same license.
- **Used for:** positions (RA/Dec), type, magnitude, apparent size,
  Messier cross-reference, and common names for galaxies, star clusters,
  and nebulae — see `scripts/build-dso.ts` for the exact field mapping
  and `src/types/deepSkyObject.ts` for the shape shipped to the client.
- **Processing:** the full catalog has ~14,000 entries, the vast
  majority barely-resolved catalog galaxies with no popular relevance to
  an educational atlas. Curated down to ~510 objects: anything with a
  Messier number, a common name, or V-mag/B-mag ≤ 9.5 — the same
  "curate for relevance, not completeness" call already made for star
  tiers and city search coverage. RA/Dec converted from OpenNGC's
  sexagesimal strings to this project's standard decimal-degree
  convention.
- **Known gap:** the Pleiades (M45) isn't in OpenNGC at all — it's
  catalogued under Collinder/Melotte, not NGC/IC. Added by hand with
  real, verified coordinates and data rather than silently shipping an
  atlas missing one of the sky's most recognizable objects (id
  `Mel022` in `dso.json`).

### Planet, Sun, and Moon physical facts (Phase 9; Sun/Moon added in the polish pass)

Unlike every dataset above, `src/content/planets.ts` and
`src/content/sunMoon.ts` aren't built from a processed, redistributed
source file — the physical facts (diameter, mass, gravity, moon count,
orbital/rotation period, mean distance, surface temperature) are
hand-authored, cross-checked against widely-published figures (e.g.
NASA's Planetary Fact Sheets, nssdc.gsfc.nasa.gov), the same way the
hand-written star/constellation prose content is. Planet, Sun, and Moon
_positions_ — including the Moon's real topocentric parallax correction
when an observer is set — are computed at runtime by `astronomy-engine`
(MIT license), not a static dataset either.

Planned sources, to be added (with license details confirmed at
integration time) as their phase lands:

| Dataset                      | Used for                   | Planned in |
| ---------------------------- | -------------------------- | ---------- |
| IAU WGSN official star names | Supplementary proper names | Phase 3+   |

## Software

See `package.json` for the full dependency list and exact versions in
use. All runtime and build dependencies are free and open-source
(MIT/Apache-2.0/similar); none require a paid license or subscription.
