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

**Phase 1 of 13**: project scaffold, design tokens, and a fullscreen
procedural starfield placeholder. No real star data, camera controls, or
interactivity yet — those come in later phases.

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically http://localhost:5173).

## Scripts

| Script                 | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start the Vite dev server                     |
| `npm run build`        | Typecheck (`tsc -b`) and build for production |
| `npm run preview`      | Preview the production build locally          |
| `npm run typecheck`    | Typecheck only, no build                      |
| `npm run lint`         | Lint with ESLint                              |
| `npm run format`       | Format the codebase with Prettier             |
| `npm run format:check` | Check formatting without writing              |
| `npm run test`         | Run the Vitest suite once                     |
| `npm run test:watch`   | Run Vitest in watch mode                      |

## Tech stack

TypeScript (strict) · Vite · React 19 · Three.js / React Three Fiber ·
Zustand · Tailwind CSS v4 · ESLint + Prettier · Vitest.

All dependencies are free and open-source, and any future hosting target
is chosen to stay on a free tier — see the "Cost constraint" note in
[ARCHITECTURE.md](./ARCHITECTURE.md).

Later phases add: `astronomy-engine` (real astronomical positions),
`@react-three/drei`, `framer-motion`, `react-router-dom`, and testing
tools (`@testing-library/react`, Playwright) — installed when the phase
that needs them arrives, not before.
