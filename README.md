# Astra

An educational, visually immersive, interactive sky atlas — pan and zoom
across a realistic night sky, backed by real star catalogs and real
astronomy math. ("Astra" is a placeholder name, kept in a single constant
at `src/app/constants.ts` so it's trivial to change.)

Built incrementally, one phase at a time. See [ARCHITECTURE.md](./ARCHITECTURE.md)
for the rendering model, folder structure, and the phase log of what's
landed so far. See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for third-party
data credits (populated as real catalogs are integrated, starting Phase 3).

## Status

**Phase 11 of 13**: a unified search bar (top-center) finds stars,
constellations, planets, and deep-sky objects by name — picking a
result flies the camera there and opens its facts panel. ~510 real
galaxies, star clusters, and nebulae (Andromeda, the Orion Nebula, the
Pleiades, and hundreds more from the OpenNGC catalog) and Mercury
through Neptune all render at their real positions (Phases 9-10), each
clickable for a facts panel. The rest of the phase plan is still ahead —
see `ARCHITECTURE.md`'s phase log.

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically http://localhost:5173).

## Scripts

| Script                         | What it does                                                           |
| ------------------------------ | ---------------------------------------------------------------------- |
| `npm run dev`                  | Start the Vite dev server                                              |
| `npm run build`                | Typecheck (`tsc -b`) and build for production                          |
| `npm run preview`              | Preview the production build locally                                   |
| `npm run typecheck`            | Typecheck only, no build                                               |
| `npm run lint`                 | Lint with ESLint                                                       |
| `npm run format`               | Format the codebase with Prettier                                      |
| `npm run format:check`         | Check formatting without writing                                       |
| `npm run test`                 | Run the Vitest suite once                                              |
| `npm run test:watch`           | Run Vitest in watch mode                                               |
| `npm run build:stars`          | Re-fetch HYG and regenerate `public/data/stars-tier*.json`             |
| `npm run build:constellations` | Re-fetch d3-celestial and regenerate `public/data/constellations.json` |
| `npm run build:cities`         | Re-fetch GeoNames and regenerate `public/data/cities.json`             |
| `npm run build:dso`            | Re-fetch OpenNGC and regenerate `public/data/dso.json`                 |

## Tech stack

TypeScript (strict) · Vite · React 19 · Three.js / React Three Fiber ·
Zustand · Tailwind CSS v4 · `idb` (IndexedDB caching) · ESLint + Prettier
· Vitest · `tsx` + `csv-parse` (offline data pipeline only).

All dependencies are free and open-source, and any future hosting target
is chosen to stay on a free tier — see the "Cost constraint" note in
[ARCHITECTURE.md](./ARCHITECTURE.md).

Later phases add: `astronomy-engine` (real astronomical positions),
`@react-three/drei`, `framer-motion`, `react-router-dom`, and testing
tools (`@testing-library/react`, Playwright) — installed when the phase
that needs them arrives, not before.
