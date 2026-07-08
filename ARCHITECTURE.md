# Astra — Architecture

This is a living document. Update it whenever a phase introduces a new
architectural decision — don't let it drift from the code.

Astra's product goals, phase plan, and full spec live in the original
build prompt the project was kicked off from; this document tracks the
decisions actually made as it's built, phase by phase.

## Mission

Astra is an interactive, educational sky atlas: a fullscreen, dark,
glassmorphic web planetarium. It's built incrementally, one phase at a
time — see "Phase log" below for what's landed so far.

The product name is a placeholder and is kept in a single constant
(`src/app/constants.ts`) so it's trivial to rename.

## Rendering model

The sky is modeled as a **3D celestial sphere with the camera at its
center, looking out** — not a 2D projected map. This is the key
architectural decision behind the whole scene:

- Every celestial object has a base position in **equatorial J2000 (RA,
  Dec)**, converted at load time to a unit vector placed on the sphere.
- The **camera always sits at the origin** `[0, 0, 0]`. It never moves.
  Panning **rotates the camera's orientation**; zooming **changes its
  FOV**. It does not dolly forward/back or translate.
- This makes free 360° panning feel natural, keeps coordinate transforms
  (equatorial ↔ horizontal) simple, and means a future gyroscope/AR mode
  can just feed the camera a device-orientation quaternion instead of
  pointer input (see "Future seams" below).
- Stars render as a single `Points` cloud driven by a custom GLSL shader
  (`src/scene/shaders/`) so thousands of stars cost one draw call. Point
  size, color, and a subtle twinkle are computed on the GPU; twinkle is
  disabled when `prefers-reduced-motion` is set.

## Folder structure

```
astra/
├─ public/data/       generated catalogs (stars, constellations, DSOs) — Phase 3+
├─ scripts/           build-time data pipeline (raw catalogs → public/data) — Phase 3+
├─ src/
│  ├─ app/            App shell, error boundary, app-level constants
│  ├─ scene/
│  │  ├─ Canvas/       the R3F <Canvas> + camera setup
│  │  ├─ camera/       CameraController (pan/zoom/inertia) — Phase 2
│  │  ├─ layers/       StarsLayer, ConstellationLayer, GridLayer, ... (one per layer)
│  │  ├─ shaders/      GLSL for stars/glow
│  │  └─ picking/      raycasting / selection — Phase 4
│  ├─ ui/
│  │  ├─ primitives/   design-system building blocks (GlassPanel, ...)
│  │  ├─ panels/       InfoPanel + per-object-type variants — Phase 4
│  │  ├─ controls/     toggle dock, time slider, location picker — Phase 7/8/12
│  │  └─ search/       unified search — Phase 11
│  ├─ state/           Zustand stores (see below)
│  ├─ astronomy/       wrappers over astronomy-engine — Phase 6
│  ├─ data/            typed catalog loaders + IndexedDB cache — Phase 3+
│  ├─ hooks/           shared React hooks
│  ├─ lib/             generic utilities (math, easing, ...)
│  ├─ workers/         web workers for heavy transforms/search indexing
│  ├─ content/         authored educational copy — Phase 4+
│  ├─ styles/          tokens.css (design tokens) + globals.css
│  └─ types/           shared domain types (CelestialObject union, etc.)
├─ tests/              Playwright e2e — Phase 13
├─ ARCHITECTURE.md
├─ ATTRIBUTIONS.md
└─ README.md
```

Folders with only a `.gitkeep` right now are placeholders for later
phases — the tree above is the target shape, established up front so the
architecture is visible from the start, per the project's build plan.

## State management

Six focused Zustand stores live in `src/state/`, one per concern:

- **`useSceneStore`** — camera FOV (current/target), hovered object id,
  fly-to target.
- **`useSelectionStore`** — the single currently-selected object
  (type + id), which drives which info panel is open.
- **`useLayersStore`** — one boolean per layer toggle (constellation
  lines/names, star names, grids, deep-sky, planets, labels, mythology).
- **`useTimeStore`** — explore vs. observer mode, the simulated
  `Date`, play/scrub state, speed.
- **`useLocationStore`** — observer lat/lon, permission state, source.
- **`useDataStore`** — per-catalog load status/errors.

**Rule:** scene layers must not re-render React on every frame. High-
frequency updates (camera orientation, per-frame shader uniforms) are
read/written imperatively via refs and `useFrame`, not through reactive
store subscriptions. `StarsLayer`'s `uTime` uniform is the first example
of this pattern — it's mutated directly in `useFrame`, never through
`setState`.

## Tech stack

Versions are whatever was current-stable at scaffold time (2026-07);
see `package.json` for exact numbers, don't trust hardcoded versions in
prose docs.

| Concern      | Choice                                                     | Why                                                                                                                        |
| ------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Language     | TypeScript (strict)                                        | Data/math-heavy app; types prevent whole classes of coordinate/data bugs                                                   |
| Build tool   | Vite                                                       | Fast dev loop, lean static output                                                                                          |
| UI framework | React                                                      | Component model fits the panel/overlay-heavy UI                                                                            |
| 3D rendering | Three.js via React Three Fiber                             | Declarative scene graph over Three's imperative API; hot paths (star points, camera loop) still drop to refs/`useFrame`    |
| State        | Zustand                                                    | Minimal boilerplate; lets the render loop read state without forcing React re-renders                                      |
| Styling      | Tailwind CSS v4 (CSS-first `@theme`) + a little custom CSS | Utility-first for speed and consistency; `@theme` in `tokens.css` centralizes the design tokens as real Tailwind utilities |
| Testing      | Vitest (+ Testing Library, Playwright later)               | Fast, Vite-native                                                                                                          |
| Tooling      | ESLint (flat config) + Prettier + strict TypeScript        | Explicit project choice — see "Tooling notes" below                                                                        |

Not yet installed (added when their phase needs them, per the "touch
only what the phase needs" rule): `@react-three/drei`, `framer-motion`,
`react-router-dom`, `astronomy-engine`, `@testing-library/react`,
`playwright`, `vite-react-ssg`.

**Cost constraint:** every dependency and planned deploy target must be
free/open-source with no paid tier required. All datasets planned in the
spec (HYG, d3-celestial, OpenNGC, NASA fact sheets) are open. Hosting
(Vercel/Netlify/Cloudflare Pages, decided in Phase 13) must stay on a
free tier.

### Tooling notes

The Vite scaffolder's current default lint tool is `oxlint`, not ESLint.
This project explicitly uses **ESLint + Prettier** instead (per the
project spec's tooling section) — `oxlint` and its config were removed
right after scaffolding. Revisit if that turns out to be the wrong call;
oxlint is faster and could replace this later.

A `@/*` → `./src/*` path alias is configured in both `tsconfig.app.json`
and `vite.config.ts`, since the folder tree above is deep enough that
relative imports (`../../state/useLayersStore`) would get unwieldy fast.

## Future-proofing seams

These are architected for now, not built:

- **Camera** is already orientation-driven (rotate, don't translate), so
  gyroscope/compass/AR later just feeds it a device-orientation
  quaternion instead of pointer input.
- **`src/data/services/`** (not yet created) is reserved for future live
  APIs (ISS/TLE, exoplanets, space missions) — kept empty and separate
  from the static-catalog loaders.
- **Layers are pluggable**: a new layer is a new component under
  `scene/layers/` plus a boolean in `useLayersStore`. Meteor showers,
  eclipses, satellites, exoplanets each become a layer later without
  touching the others.
- **`useTimeStore`** is already the single source of truth for "what
  time is it in the sky," so future eclipse/meteor/mission timelines can
  hook into it directly.
- **Object model**: a future `CelestialObject` discriminated union
  (`src/types/`) will let stars/constellations/planets/DSOs share one
  `InfoPanel`, one search index, and one selection mechanism.

## Phase log

### Phase 1 — Project scaffold, design system seed, fullscreen scene shell

- Scaffolded with Vite + React 19 + TypeScript (strict).
- Swapped the scaffolder's default `oxlint` for ESLint (flat config) +
  Prettier, per spec.
- Tailwind v4 wired via `@tailwindcss/vite`; design tokens defined in
  `src/styles/tokens.css` via `@theme` (near-black/blue backgrounds, a
  soft blue accent, and glass-panel surface tokens).
- Fullscreen R3F `<Canvas>` (`src/scene/Canvas/SceneCanvas.tsx`) with a
  procedural starfield placeholder (`src/scene/layers/StarsLayer.tsx`):
  8,000 points on a Fibonacci sphere, custom shader for soft circular
  points + per-star twinkle (disabled under `prefers-reduced-motion`).
- All six Zustand stores created with real (if not yet fully consumed)
  state shapes matching the spec.
- `GlassPanel` primitive proves the frosted-glass aesthetic, used for a
  simple app-title header.
- `ErrorBoundary` wraps the app shell.
- One Vitest suite (`src/lib/math.test.ts`) proves the test harness.

### Phase 2 — Camera controls: pan, zoom, inertia, touch

- `src/scene/camera/CameraController.tsx`: owns all pointer/wheel/touch
  input. Drag rotates the camera via yaw/pitch (Euler `'YXZ'` order, no
  roll); pitch is clamped to ±85° so you can't flip past the poles.
  Wheel and two-finger pinch both adjust `useSceneStore`'s `targetFov`
  within a 20°–100° clamp.
- Release-to-glide inertia and FOV changes are both eased via
  `src/lib/easing.ts`'s `damp()` — a dependency-free, frame-rate
  independent exponential damp — applied every frame in `useFrame`.
  Nothing here touches React state per frame; `targetFov`/`fov` in the
  store are the only Zustand writes, and only when they actually change.
- `prefers-reduced-motion` disables inertia (velocity is zeroed instead
  of decayed) and FOV easing snaps straight to the target. The check
  moved to `src/lib/motion.ts` so `StarsLayer` and `CameraController`
  share one implementation.
- `eslint-plugin-react-hooks`'s new `immutability` rule (aimed at
  React-Compiler-style code) flags direct mutation of `useThree()`'s
  `camera` — which is the correct, standard R3F pattern this project's
  rendering model depends on. Scoped that rule off for `src/scene/**`
  rather than contorting the code (see `eslint.config.js`).

### Phase 3 — Real star catalog: build pipeline + accurate rendering

- **Data pipeline** (`scripts/build-stars.ts`, run manually via
  `npm run build:stars`, not part of `npm run build`): fetches the HYG
  Database (v41, CC BY-SA 4.0 — see `ATTRIBUTIONS.md`), parses ~120k
  rows, excludes the Sun (HYG id 0 — not a background star), and writes
  three magnitude tiers (≤4, ≤6.5, ≤8) as compact **columnar** JSON
  (`public/data/stars-tier{0,1,2}.json` — one array per field, not an
  array of objects) — this is a deliberate, committed build artifact;
  the app never fetches HYG or runs this script itself.
- **Color** is derived at build time from each star's B-V index:
  Ballesteros' formula (B-V → effective temperature) feeds Tanner
  Helland's blackbody approximation (temperature → RGB). Both live in
  `scripts/lib/color.ts` and are unit-tested directly against known
  values (the Sun's ~5778K; blue-white vs. orange output for
  Rigel/Betelgeuse-like B-V). The pipeline's actual output was spot
  checked against Sirius, Rigel, Betelgeuse, Vega, and Polaris —
  position, distance, constellation, and color all matched known values.
- **Position and size**, by contrast, are computed **client-side**, once
  per star when a tier loads (not per frame): `src/astronomy/
coordinates.ts`'s `equatorialToCartesian` turns each shipped RA/Dec
  (degrees — the one place RA units are standardized, see
  `src/types/coordinates.ts`) into a unit vector, and magnitude maps
  linearly to point size. Keeping these client-side (rather than also
  precomputing them at build time) avoids a redundant second source of
  truth and keeps the JSON smaller; the trig cost is trivial done once
  per star at load time.
- **Loading**: `src/data/loaders/starLoader.ts` fetches each tier and
  caches it in IndexedDB (via `idb`) behind a version-stamped key, so a
  future reprocessing of the catalog just needs a key bump, not real
  invalidation logic. `src/hooks/useStarCatalog.ts` loads tier0 → tier1
  → tier2 in order (brightest first, for instant first paint) and merges
  each newly-arrived tier's buffers into one growing set — this is
  plain React state, not a `useFrame`-driven value, since it only
  changes a handful of times per session rather than every frame.
- `StarsLayer`'s shader and geometry setup are **unchanged** from
  Phase 1/2 — real data slots into the exact same `position`/`aSize`/
  `aColor`/`aTwinklePhase` attributes the procedural placeholder used.
- Node's native TypeScript execution (via `tsx`, since `scripts/` needs
  relative-import extensions like `./lib/color.ts` under `module:
nodenext` — see `tsconfig.node.json`, now covering `scripts/**` too)
  keeps the data pipeline in the same language as the app without
  needing a bundler for one-off scripts.

### Phase 4 — Selection system + reusable star info panel

- **Picking** (`src/scene/picking/`): stars are raycast-picked using
  Three's built-in `Points` intersection (via R3F's `onPointerMove`/
  `onClick` on the `<points>` object, which reports `event.index` — the
  hit vertex's index into the buffers). `fovScaledPointThreshold` keeps
  the clickable radius around a star visually consistent as FOV changes
  with zoom, updated every frame in `StarsLayer`'s existing `useFrame`.
  GPU picking was the spec's alternative option, but raycasting is
  simpler and plenty fast at this star count; revisit if a future,
  denser layer (DSOs?) makes it a bottleneck.
- **Hover highlight is shader-only** — no React state in the loop. The
  hovered index is written straight into a ref and a `uHoveredIndex`
  uniform (`StarsLayer`); the shaders (`starField.vert/frag.glsl`)
  compare each point's own `aIndex` attribute against it to boost that
  one point's size/brightness. `useSceneStore.hoveredObjectId` is also
  updated, but guarded to only write on an actual change — there's no
  reactive consumer of it yet, but it's cheap insurance for one that
  shows up later (e.g. a search-result hover preview).
- **Selection is plain Zustand + React** (`useSelectionStore`), correctly
  low-frequency (user clicks, not per-frame) — this is the deliberate
  contrast with hover, which stays fully imperative.
- **Star catalog is now loaded once, in `App.tsx`**, and passed down as
  a prop — to `SceneCanvas` → `StarsLayer` for rendering, and used
  directly in `App.tsx` to resolve the selected star for the panel.
  `StarsLayer` no longer calls `useStarCatalog()` itself. This was a
  deliberate, minimal fix over introducing Context or a new store: the
  prop path is only two components deep, so plain props are simpler and
  more consistent with how `App.tsx` already composes things.
- **`InfoPanel`** (`src/ui/panels/InfoPanel.tsx`) is the generic,
  reusable panel shell every object type's panel will render through:
  title, key/value facts, description, "Did you know?", related items.
  Non-modal by design (`aria-modal="false"` — the sky stays interactive
  behind it), so it deliberately does **not** trap Tab focus, but it does
  move focus in on open, restore it on close, close on Esc, and close on
  outside click. `StarPanel` is its first, star-specific variant.
- **Content** (`src/content/stars.ts`): hand-written description/fun-fact
  content only exists for ~25 well-known named stars, each verified to
  match the catalog's exact name string before writing a word — the
  other ~40,000+ catalog stars have no proper name or authored content
  and simply render without those two sections. Missing numeric fields
  (HYG has no radius/mass) show "—" rather than being fabricated or
  hidden — both explicitly the spec's own guidance for this situation.
