# Attributions

Astra is built on real, open astronomy data and open-source software.
This file tracks every third-party dataset bundled into the app, along
with its license and required credit. Update it in the same phase that
integrates a new dataset — don't let this drift from what's actually
shipped in `public/data/`.

## Data sources

No third-party astronomical catalogs are bundled yet — Phase 1 ships
only a procedural placeholder starfield with no real data.

Planned sources, to be added (with license details confirmed at
integration time) as their phase lands:

| Dataset                                                                                | Used for                                                      | Planned in |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| [HYG Database](https://github.com/astronexus/HYG-Database) (or ATHYG)                  | Star positions, magnitudes, spectral types, proper names      | Phase 3    |
| IAU WGSN official star names                                                           | Supplementary proper names                                    | Phase 3    |
| [d3-celestial](https://github.com/ofrohn/d3-celestial) (or Stellarium skyculture data) | Constellation lines/names/boundaries                          | Phase 5    |
| [OpenNGC](https://github.com/mattiaverga/OpenNGC)                                      | Deep-sky objects (NGC/IC, Messier cross-refs)                 | Phase 10   |
| NASA Planetary Fact Sheets (nssdc.gsfc.nasa.gov)                                       | Planet physical facts (moons, periods, temperature, diameter) | Phase 9    |

Planet, Sun, and Moon _positions_ are computed at runtime by
`astronomy-engine` (MIT license) — not a static dataset.

## Software

See `package.json` for the full dependency list and exact versions in
use. All runtime and build dependencies are free and open-source
(MIT/Apache-2.0/similar); none require a paid license or subscription.
