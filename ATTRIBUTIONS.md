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

Planned sources, to be added (with license details confirmed at
integration time) as their phase lands:

| Dataset                                                                                | Used for                                                      | Planned in |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| IAU WGSN official star names                                                           | Supplementary proper names                                    | Phase 3+   |
| [d3-celestial](https://github.com/ofrohn/d3-celestial) (or Stellarium skyculture data) | Constellation lines/names/boundaries                          | Phase 5    |
| [OpenNGC](https://github.com/mattiaverga/OpenNGC)                                      | Deep-sky objects (NGC/IC, Messier cross-refs)                 | Phase 10   |
| NASA Planetary Fact Sheets (nssdc.gsfc.nasa.gov)                                       | Planet physical facts (moons, periods, temperature, diameter) | Phase 9    |

Planet, Sun, and Moon _positions_ are computed at runtime by
`astronomy-engine` (MIT license) — not a static dataset.

## Software

See `package.json` for the full dependency list and exact versions in
use. All runtime and build dependencies are free and open-source
(MIT/Apache-2.0/similar); none require a paid license or subscription.
