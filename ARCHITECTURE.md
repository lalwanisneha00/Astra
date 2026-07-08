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
├─ public/data/       generated catalogs: stars (Phase 3), constellations (Phase 5)
├─ scripts/           build-time data pipeline (raw catalogs → public/data)
├─ src/
│  ├─ app/            App shell, error boundary, app-level constants
│  ├─ scene/
│  │  ├─ Canvas/       the R3F <Canvas> + camera setup
│  │  ├─ camera/       CameraController (pan/zoom/inertia)
│  │  ├─ layers/       StarsLayer, ConstellationLayer, GridLayer, HorizonLayer, LabelsLayer
│  │  ├─ shaders/      GLSL for stars/glow
│  │  └─ picking/      raycasting helpers (FOV-scaled thresholds)
│  ├─ ui/
│  │  ├─ primitives/   design-system building blocks (GlassPanel, ...)
│  │  ├─ panels/       InfoPanel + per-object-type variants (Star, Constellation, ...)
│  │  ├─ controls/     TodayButton, LocationPicker, TimeSlider; toggle dock — Phase 12
│  │  └─ search/       SearchBar — unified search across stars/constellations/planets/DSOs (Phase 11)
│  ├─ state/           Zustand stores (see below)
│  ├─ astronomy/       coordinate transforms, sidereal time, formatting — real math, no UI
│  ├─ data/            typed catalog loaders + IndexedDB cache (stars only — see Phase 5 log)
│  ├─ hooks/           shared React hooks
│  ├─ lib/             generic utilities (math, easing, motion); search.ts is here, not workers/
│  │                   — see Phase 11 log for why a worker turned out unnecessary
│  ├─ workers/         web workers for heavy transforms (horizon culling)
│  ├─ content/         authored educational copy (stars, constellations)
│  ├─ styles/          tokens.css (design tokens) + globals.css
│  └─ types/           shared domain types (Star, Constellation, coordinates, ...)
├─ tests/              Playwright e2e — Phase 13
├─ ARCHITECTURE.md
├─ ATTRIBUTIONS.md
└─ README.md
```

Folders still holding only a `.gitkeep` (`tests`) are placeholders for
phases that haven't landed yet — the tree above is the
target shape, established up front in Phase 1 so the architecture was
visible from the start.

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

Added since, each when its phase first needed it (per the "touch only
what the phase needs" rule): `framer-motion` (Phase 4), `@react-three/
drei` (Phase 5), `astronomy-engine` (Phase 6). Still not yet installed:
`react-router-dom`, `@testing-library/react`, `playwright`,
`vite-react-ssg`.

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

### Phase 5 — Constellations: lines, names, highlight glow, info panel

- **Data**: `scripts/build-constellations.ts` fetches d3-celestial's
  constellation names/label-positions and line figures (BSD-3-Clause —
  see `ATTRIBUTIONS.md`), normalizes RA from d3-celestial's `[-180,180]`
  longitude convention to this project's standard `[0,360)`, merges
  Serpens's two disconnected regions (Caput/Cauda) into one figure since
  they share one id, and writes all 88 as one small (~33KB) JSON file —
  unlike the star catalog, small enough that it doesn't need magnitude
  tiering or IndexedDB caching (`src/data/loaders/constellationLoader.ts`
  is a plain fetch).
- **Rendering is per-constellation, not one shared buffer**: 88 separate
  `<lineSegments>` objects (`ConstellationFigure`), each independently
  clickable and independently reactive to `useSelectionStore`. This is a
  deliberate contrast with `StarsLayer`'s single-buffer/index-uniform
  approach — at only 88 objects, separate objects are simpler and still
  trivially cheap, whereas that approach would fall over at 40,000 stars.
  Selection changes are low-frequency (user clicks), so plain reactive
  Zustand + React re-renders per-figure is fine here, unlike stars' hover
  (which stays fully imperative/shader-driven because it's high-frequency).
- **"Glow"** is brightness + additive blending on the selected figure's
  `lineBasicMaterial`, not a true post-processing bloom pass — no
  EffectComposer/bloom dependency needed for a "soft glow" read at this
  scale.
- **Hit-testing** uses Three's built-in `Line` raycasting with a
  FOV-scaled threshold (reusing `fovScaledPointThreshold` from Phase 4),
  not the official IAU boundary polygons the spec suggested as an
  alternative — simpler to implement, and "click near a line" is a
  reasonable trade against "click anywhere in the constellation's
  official territory." Revisit with `constellations.bounds.json` if this
  ever feels too finicky in practice.
- **Labels**: `@react-three/drei`'s `<Html>`, one real DOM node per
  constellation (88 total) — no custom screen-space projection needed at
  this scale, unlike what per-star labels would require.
- **Facts are computed, not authored, where they can be**: zodiac
  membership is a fixed set of 12; hemisphere is derived from the label
  declination; "best viewing months" is a documented rough estimate from
  RA (a well-known amateur-astronomy rule of thumb, not a precise
  ephemeris calculation — that's what Phase 6+'s real astronomy-engine
  integration is for); "brightest stars" is computed live by filtering
  the already-loaded HYG catalog by constellation and sorting by
  magnitude, and is clickable straight through to `StarPanel`. Only
  mythology and fun facts are hand-written, for ~20 well-known
  constellations (`src/content/constellations.ts`) — "Area" was
  considered and deliberately dropped rather than fabricate imprecise
  IAU sq-degree figures without a verified source.
- `CELESTIAL_SPHERE_RADIUS` moved to `src/scene/constants.ts` now that
  two layers (stars, constellations) need to agree on it — the point
  where a previously-fine local constant becomes worth sharing.

### Phase 6 — Astronomy core: time/location state, EQ↔HOR transforms, grids, cardinals

- **`astronomy-engine`** finally installed (deferred since Phase 1's
  stack list). `src/astronomy/horizontal.ts`:
  - `equatorialToHorizontal` wraps its `Horizon()` function directly.
    The one real gotcha: `Horizon()` wants RA in **sidereal hours**, not
    degrees — converted right at the call site, specifically to avoid
    the hours/degrees bug class this project has been deliberately
    designing around since Phase 3. Precession/nutation are handled
    internally by `Horizon()`, so "far dates" aren't a separate concern.
  - `horizontalToEquatorial` (the inverse) has no direct library
    function, so it's a hand-implemented standard spherical-astronomy
    formula, using `SiderealTime()` (Greenwich) + observer longitude for
    local sidereal time. Validated with round-trip tests across 6 stars
    _and_ two special cases independently checkable from first
    principles (a star at Dec = observer latitude with hour angle 0 sits
    at the zenith; a celestial-equator star rises due east for a
    mid-latitude observer) — round-trip consistency alone can't catch a
    self-consistent-but-wrong sign convention, these can.
- **Horizon culling**: `src/workers/horizonCulling.worker.ts` computes
  every star's altitude for the current observer/time in one batched
  message (not one round trip per star — the whole reason this needs a
  worker at 40,000+ stars). `useHorizonCulling` owns the worker's
  lifecycle (created once, reused across recomputes) and derives its
  return value from `enabled`/`observer` rather than resetting state
  inside the effect body — sidesteps `eslint-plugin-react-hooks`'
  `set-state-in-effect` rule entirely instead of suppressing it.
  `useVisibleStarCatalog` then filters the catalog's buffers _and_
  domain objects together, renumbering indices so hover-picking (which
  reports indices relative to what's actually drawn) stays correct.
  `StarsLayer` itself needed zero changes — it just renders whatever
  catalog it's handed, filtered or not.
- **`GridLayer`** (equatorial + horizontal grids) and **`HorizonLayer`**
  (horizon ring + N/S/E/W labels) reuse the exact same
  `equatorialToCartesian` pipeline as stars/constellations. The
  equatorial grid is fixed relative to the stars (computed once); the
  horizontal grid/ring/cardinals depend on observer + time, recomputed
  via `useMemo` when those change — not per-frame, since nothing animates
  time continuously yet (that's Phase 8).
- **Temporary dev control**: `src/app/DevObserverToggle.tsx`, explicitly
  flagged `TODO(Phase 7)` for removal once the real "Today's Night Sky"
  geolocation/manual-entry UI exists. This is what the phase's own
  acceptance criteria asks for — a way to exercise observer mode before
  the real trigger UI is built. It also flips on the `horizontalGrid`
  layer flag when entering observer mode, since that flag defaults to
  off (set in Phase 1, before this feature existed) and has no real
  toggle UI until Phase 12.
- **Fixed after initial testing**: horizon culling only hid individual
  star points at first — `ConstellationLayer`/`LabelsLayer` never
  received observer/date at all, so constellations entirely below the
  horizon (e.g. Hydrus, Toucan, Indian, viewed from New York) kept
  rendering their lines and name labels even with every star they
  connect culled. `useVisibleConstellations` fixes this by checking
  every constellation's line vertices, not just its label point —
  showing it if _any_ vertex is above the horizon, since a 30°+-wide
  figure can be genuinely half-risen (this doesn't clip the below-
  horizon half of a partial figure, just decides whether to draw the
  whole thing).

### Phase 7 — Today's Night Sky: geolocation + manual fallback + orientation

- **`TodayButton`** requests real geolocation and, on success, switches
  straight into observer mode using the device's actual coordinates and
  the current time. Denied, unavailable, or timed-out geolocation opens
  **`LocationPicker`** instead of dead-ending, per the spec's explicit
  requirement — city search or manual lat/lon with range validation.
- **City search data** (`scripts/build-cities.ts` → `public/data/cities.json`):
  ~34,000 cities from GeoNames' `cities15000` export (every city with
  population > 15,000, or a national capital regardless of size). See
  "Fixed after initial testing" below for how this replaced a first
  attempt at hand-compiling a smaller list.
- **Elegant transition** (the spec's own phrase, and a named "common
  issue" if skipped): entering observer mode now eases the camera to
  look roughly south, partway up the sky, rather than leaving it
  pointed wherever explore mode happened to be facing.
  `CameraController` eases toward `useSceneStore.flyToTarget` — Phase
  1's placeholder field for Phase 11's search, now with its first real
  consumer. Reaching it required inverting the camera's own yaw/pitch →
  forward-vector formula (`src/scene/camera/orientation.ts`); validated
  by round-tripping through that _same_ forward-vector formula in the
  test, not just asserting the inverse looks right.
- **`DevObserverToggle`** (Phase 6) is gone — replaced by the real
  trigger it was always meant to be temporary scaffolding for.
- **`useDismissablePanel`** extracted out of `InfoPanel` (focus-on-open,
  restore-on-close, Esc, outside-click) now that `LocationPicker` is a
  second, independent consumer of the exact same behavior.
- **Fixed after initial testing (two issues)**:
  1. Constellation name labels (drei `<Html>`, rendered inside the R3F
     canvas tree) were visually bleeding through/over `LocationPicker`
     and other DOM overlay panels — a real stacking-order bug, not the
     intended "frosted glass shows blurred stars behind it" look.
     Fixed with explicit `z-index` layering: the scene canvas at `z-0`,
     the header/`TodayButton` at `z-10`, `InfoPanel`/`ConstellationPanel`/
     `StarPanel` at `z-10`, and `LocationPicker` at `z-20` (it can appear
     over an already-open info panel).
  2. The original hand-compiled `src/data/cities.ts` (~130 cities) had
     far too little coverage in practice — caught when testing showed it
     recognized only 5 Indian cities, missing Pune, Hyderabad,
     Ahmedabad, Jaipur, and thousands of others, despite India alone
     having a population of 1.4 billion. Replaced with a proper data
     pipeline (`scripts/build-cities.ts`) pulling GeoNames'
     `cities15000` export — the same fetch-and-process pattern already
     used for HYG/d3-celestial, which in hindsight was the right call
     here too; the earlier size-based judgment call (see the removed
     paragraph this replaced) was wrong. The dataset is CC BY 4.0, ~34,000
     entries, ~3.3MB raw / ~765KB gzipped, loaded lazily (only when
     `LocationPicker` actually mounts, i.e. only for the fraction of
     sessions where geolocation fails) and cached in a dedicated
     IndexedDB database (`src/data/loaders/cityLoader.ts`) rather than
     the star catalog's, since sharing one database name across
     independent loader modules would require them to coordinate a
     single schema-version/upgrade path.

### Phase 8 — Time Travel

- **Most of the mechanism already existed.** Equatorial star/
  constellation positions are fixed; what actually changes as time
  passes is the _observer's_ relationship to them (horizon culling, the
  horizontal grid/ring/cardinals) — all of which already reacted to
  `useTimeStore.currentDate` since Phase 6/7. Phase 8 is mostly the UI
  (`TimeSlider`) plus making rapid date changes not overwhelm what's
  already downstream of `currentDate`.
- **One throttle, one source**: both scrubbing and continuous playback
  route through the _same_ `throttle(setCurrentDate, 120ms)` instance,
  rather than throttling separately inside `useHorizonCulling` or
  `GridLayer`. Protecting every consumer at the one place `currentDate`
  actually changes is simpler than duplicating throttling logic at each
  place that reacts to it — and it means playback (which would otherwise
  call `setCurrentDate` every animation frame, ~60/sec) is covered by the
  exact same mechanism as slider dragging, for free.
- **`src/lib/throttle.ts`** is leading+trailing: fires immediately, then
  guarantees the _last_ pending call still lands once the window ends —
  the scrubbed-to date can never be silently dropped, which a simpler
  "sample every N ms" throttle could do.
- **`src/astronomy/dateArithmetic.ts`** works in UTC throughout
  (`setUTCHours`/`setUTCMonth`/etc.), sidestepping local-timezone/DST
  ambiguity entirely — UTC never observes DST, so "add 24 hours" and
  "add 1 day" are always identical, exactly the equivalence the tests
  check. Month/year arithmetic relies on native `Date` rollover for
  out-of-range days (e.g. Jan 31 + 1 month lands in early March); that's
  documented, expected behavior, not patched around.
- **Segmented slider scale**, per the spec's own suggested fix for
  "precision over huge ranges": four independent granularities (Hour
  ±24, Day ±30, Month ±12, Year ±50), each its own bounded range, rather
  than one linear scale trying to span both hours and centuries.
  Switching granularity re-anchors the offset to the current date so it
  never jumps to a stale value reinterpreted in new units.
- Continuous playback approximates month/year as fixed durations (30.44
  / 365.25 days) purely for smooth animation speed — discrete jumps
  (dragging, or a future "+1 month" step button) always use
  `addGranularity`'s exact calendar arithmetic instead.
- **Fixed after initial testing**: scrubbing the slider made the whole
  page hang. Direct Node benchmarking of every suspect (`Horizon()`
  itself, the full 41,500-star batch, the CPU-side filter, constellation
  visibility) showed no single computation was individually slow enough
  to explain it — the real cost was architectural. Phase 6's
  `useVisibleStarCatalog` filtered the star buffers on the CPU on every
  horizon recompute, and `StarsLayer`'s `<bufferGeometry key={count}>`
  keyed on the resulting (almost-always-changing) count, so React/Three
  fully disposed and recreated the geometry — a full GPU re-upload of
  tens of thousands of points — on nearly every throttled tick while
  dragging or playing back. Replaced with GPU-side discard: stars keep a
  stable per-star `aAltitude` buffer attribute, updated in place
  (`bufferAttribute.set()` + `needsUpdate`) whenever the worker returns
  new altitudes, and the vertex/fragment shaders (`starField.vert.glsl`/
  `starField.frag.glsl`) discard below-horizon fragments via a
  `uHorizonCullingEnabled` uniform and `vBelowHorizon` varying. The
  geometry itself is now keyed only on star count from catalog tier
  loading, never touched by horizon recomputes. `useVisibleStarCatalog`
  is deleted; `StarsLayer` renders the full, unfiltered catalog always,
  and picking (`handlePointerMove`/`handleClick`) separately guards
  against culled indices via the same altitude buffer so below-horizon
  stars stay unhoverable/unclickable despite still being in the draw
  call.

### Phase 9 — Planets: positions, orbits, info

- **`src/astronomy/planets.ts`** is the first place `astronomy-engine`'s
  `Body`/`GeoVector`/`EquatorFromVector` get used (previously only
  `Horizon`/`Observer`/`SiderealTime`, for stars). `GeoVector` returns
  geocentric J2000 equatorial Cartesian coordinates — deliberately the
  _same_ frame the HYG star catalog is already in, so planets place via
  the exact same `equatorialToCartesian` pipeline and cull via the exact
  same `equatorialToHorizontal`/`Horizon()` call stars use, rather than
  needing separate "of-date"/topocentric handling. No parallax
  correction: at this rendering scale (a fixed-radius celestial sphere,
  not true distances) it would be imperceptible even for Mercury/Venus.
- **Only 7 bodies** (Mercury–Neptune; Earth excluded, Sun/Moon deferred
  to a later phase), recomputed via a plain `useMemo` keyed on date
  (`usePlanetPositions`) — no worker, no GPU-side discard. That machinery
  in `StarsLayer` (Phase 8's fix) exists specifically because 40,000+
  stars made CPU filtering and geometry remounts too expensive; at 7
  objects, a plain per-frame-independent CPU altitude check
  (`PlanetsLayer`, using the same `equatorialToHorizontal` stars use) is
  trivial and doesn't need that treatment.
- **One mesh per planet** (`PlanetMarker`): a small colored sphere plus a
  drei `<Html>` name label, each independently reading/writing
  `useSelectionStore` — the same per-object pattern `ConstellationFigure`
  established (as opposed to `StarsLayer`'s single-buffer approach, which
  only makes sense at star-catalog scale). A plain sphere (not a
  billboarded sprite) looks like a circle from any angle for free, so no
  camera-facing plane/texture was needed.
- **"Orbits" reinterpreted for this rendering model**: the app has no 3D
  solar-system view — only the observer-centered celestial sphere (see
  "Rendering model" above) — so a true heliocentric ellipse has no direct
  on-sky representation. `PlanetOrbitTrail` instead samples each planet's
  own apparent position across ±90 days (`computePlanetPath`, 4-day
  steps) and draws it as a faint line, showing the real thing this model
  _can_ show: apparent sky motion, including retrograde loops for the
  outer planets. Recomputed on date change same as `GridLayer`, cheap
  enough (a few dozen `GeoVector` calls) not to need any special
  treatment either.
- **`src/content/planets.ts`** doubles as both structured facts _and_
  prose, unlike `STAR_CONTENT`/`CONSTELLATION_CONTENT`: every planet's
  diameter, mass, gravity, moon count, orbital/rotation period, and mean
  distance are always precisely known (unlike most catalog stars), so
  `PlanetPanel` reads them directly rather than falling back to a
  placeholder. Jupiter/Saturn's moon counts are presented as lower bounds
  in the prose, since new small irregular moons are still being
  discovered.
- **Selection/panel wiring required zero new architecture**: `'planet'`
  was already a valid `SelectableObjectType` (from Phase 4) and
  `useLayersStore.planets` already existed (from Phase 1) — both were
  placeholders for exactly this phase. `PlanetPanel` follows
  `StarPanel`/`ConstellationPanel`'s exact recipe, rendering entirely
  through the shared `InfoPanel` shell.
- **Fixed after initial testing**: the first version of `PlanetMarker`
  used a true 3D `sphereGeometry` mesh, which read as "flat, oval balls"
  rather than planets — a real (not imagined) artifact of perspective
  projection: an off-axis sphere renders as a visible ellipse once the
  camera's FOV gets wide, and this app's zoom range is 20-100° (see
  `CameraController`'s `MIN_FOV`/`MAX_FOV`). Replaced with a drei
  `<Billboard>` (always camera-facing) textured plane, using a single
  shared, pre-shaded circular sprite (`scene/textures/planetTexture.ts`
  — an off-center highlight plus limb darkening baked into a grayscale
  canvas texture, tinted per planet via the material's `color`, which
  multiplies the texture's RGB) rather than per-planet textures. This is
  a deliberate scope boundary, not a placeholder: the Sun, Moon, and
  deep-sky objects (nebulae/galaxies/clusters) are separate, later
  phases in the original plan and were intentionally kept out of Phase 9.
- **Fixed after further testing**: even with the billboard fix above, a
  single plain shaded circle for every planet still didn't read as
  "real" — no visual distinction between a rocky planet and a gas giant,
  and Saturn (the one planet everyone expects to recognize by its rings)
  looked identical to the rest. `getPlanetTexture` now generates one
  sprite per `PlanetContent.visualStyle`: `rocky` (Mercury/Venus/Mars,
  plain shaded disc), `gasGiant` (Jupiter/Uranus/Neptune, the same disc
  with alternating multiply-blended horizontal cloud bands), and
  `ringed` (Saturn only — a tilted flattened annulus drawn _behind_ the
  disc so only its two side "ears" show past the body, the standard
  simplified ringed-planet icon look, consistent with this scene's
  already-stylized rendering rather than true 3D ring geometry). Added
  `PlanetContent.relativeSize` (a deliberately compressed, visually-
  legible stand-in for "bigger vs. smaller" — true diameter ratios would
  make Mercury an invisible speck next to Jupiter at this fixed-radius
  rendering scale) and a soft additive glow sprite behind every body for
  an atmospheric-halo feel.

### Phase 10 — Deep-sky objects: galaxies, star clusters, nebulae

- **`scripts/build-dso.ts`** fetches OpenNGC's combined NGC/IC CSV via
  `csv-parse/sync` (the same library `build-stars.ts` already uses,
  configured with `delimiter: ';'` since OpenNGC isn't comma-delimited)
  and curates the ~14,000-entry catalog down to ~510 objects: anything
  with a Messier number, a common name, or magnitude ≤ 9.5. The full
  catalog is overwhelmingly faint, barely-resolved background galaxies
  with no popular relevance — the same "curate for relevance" judgment
  call already made for star tiers (Phase 3) and city search coverage
  (Phase 7), not an attempt to ship "every known object."
- **Fixed positions, unlike planets**: DSOs sit at fixed equatorial J2000
  coordinates like stars/constellations — `DsoMarker` has no per-date
  recomputation and no orbit trail, unlike `PlanetMarker`. The only
  thing that changes with time is horizon visibility in observer mode.
- **`DeepSkyLayer`** applies that horizon check with a plain CPU
  `equatorialToHorizontal` call per object (memoized on
  `[objects, observer, date]`), same reasoning as `PlanetsLayer`: ~510
  objects is nowhere near the scale that made `StarsLayer`'s GPU-side
  discard (Phase 8) necessary.
- **`DsoMarker`** reuses `PlanetMarker`'s billboard-sprite technique
  (immune to true-sphere perspective distortion at wide FOV) but with a
  different texture per `DsoTypeMeta.icon` kind
  (`scene/textures/dsoTexture.ts`): a dense round glow for globular
  clusters, a scatter of small bright points for open clusters, an
  elongated squashed smudge for galaxies, a glowing ring (not a filled
  disc) for planetary nebulae, and an irregular blotchy cloud — several
  overlapping soft blobs rather than one perfect circle — for every
  other nebula type. Several raw OpenNGC type codes (`Neb`, `SNR`,
  `HII`, `RfN`) intentionally share the generic nebula texture,
  distinguished only by tint and the info panel's type label, rather
  than each getting a bespoke shape — keeps the texture set legible at
  small marker sizes instead of over-differentiating types that would
  look identical at a glance anyway. Marker size scales with
  `sizeArcmin` (compressed through a sqrt, same reasoning as
  `PlanetContent.relativeSize`) so Andromeda reads as visibly bigger
  than a barely-resolved planetary nebula.
- **No always-on labels**: unlike constellation names (88, shown by
  default) or planet names (7, always shown), ~510 DSO labels rendered
  simultaneously as drei `<Html>` DOM nodes would clutter the sky badly
  and cost real DOM overhead — `DsoMarker` only renders its label when
  selected, relying on the info panel otherwise. This mirrors why
  `starNames` already defaults to off in `useLayersStore`.
- **Curated content** (`src/content/dso.ts`) follows `STAR_CONTENT`'s
  graceful-degradation pattern exactly: ten of the most iconic objects
  (Andromeda, Orion Nebula, Crab Nebula, Ring Nebula, Whirlpool Galaxy,
  Triangulum Galaxy, Pleiades, M13, Beehive Cluster, Dumbbell Nebula)
  get hand-written descriptions/fun facts; the rest show only their
  real catalog data.
- **Known gap, deliberately patched**: the Pleiades (M45) isn't in
  OpenNGC at all — catalogued under Collinder/Melotte, not NGC/IC — so
  `build-dso.ts` adds it by hand with real, verified coordinates (id
  `Mel022`) rather than silently shipping an atlas missing one of the
  most recognizable objects in the sky. See ATTRIBUTIONS.md.
- **Fixed after initial testing**: the app crashed to the `ErrorBoundary`
  fallback immediately on load. Root cause was a data-shape mismatch,
  not a stale build: `build-dso.ts` writes flat `ra`/`dec` fields per
  object, but `dsoLoader.ts` originally fetched the JSON and force-cast
  it straight to `DeepSkyObject[]` (which expects a nested
  `equatorial: {ra, dec}`) via `as DsoFile` — a compile-time-only
  assertion with no runtime check, so TypeScript happily believed
  `dso.equatorial` existed when it didn't. Every `DsoMarker` then threw
  immediately trying to read `dso.equatorial.ra`. Fixed by following
  `constellationLoader.ts`'s existing convention properly instead of
  half-copying it: the loader now returns the file's actual flat-field
  shape (a `DsoRecord`, matching `ConstellationRecord`), and
  `useDeepSkyObjects` assembles the nested `equatorial` domain field —
  the same split `useConstellations` already uses for its own
  `labelPosition`. (Also worth noting: a long dev session that never
  restarts its Vite server accumulates one stale instance per phase's
  smoke test, each holding its own port — if the sky ever looks
  frozen/broken in a way a hard refresh doesn't fix, check for and kill
  stale `vite` processes before assuming it's a code bug.)

### Phase 11 — Unified search

- **`src/ui/search/SearchBar.tsx`** is the first thing to land in the
  `ui/search/` folder reserved since Phase 1, and `useSceneStore.flyToTarget`
  (also a Phase 1 placeholder, first used by Phase 7's "elegant
  transition") now has its second consumer — selecting a search result
  sets the exact same field `CameraController` already eases toward, so
  no new camera-navigation code was needed at all.
- **One index, four object types**: `useSearchIndex` (stars,
  constellations, deep-sky objects) plus a static `PLANET_IDS` list
  (planets don't need to be passed in — see below) flattens everything
  into one `SearchResult[]` with a common shape (`type`, `id`, `label`,
  `subtitle`, `rank`, `keywords`). Only _named_ stars are indexed — the
  ~40,000 unnamed catalog entries have no string a user could type to
  find them.
- **No coordinates baked into the index — resolved live at pick time
  instead.** `SearchResult` deliberately carries no `equatorial` field.
  Planet positions change with simulated time (Phase 9); if the index
  cached a planet's equatorial coordinate at build time, it would go
  stale the moment the time slider moves. Since `useSearchIndex`'s
  `useMemo` only depends on the (stable, load-once) stars/
  constellations/DSOs arrays — never the per-date-tick `planets` array —
  it also never rebuilds while scrubbing time, avoiding the exact class
  of "expensive recompute on every tick" problem Phase 8's fix
  eliminated for the star catalog. `App.tsx`'s `handleSearchSelect`
  looks the picked result up in the live catalogs (the same
  `.find((x) => x.id === ...)` pattern already used for
  `selectedStar`/`selectedConstellation`/`selectedPlanet`/`selectedDso`)
  and flies to _that_ object's current position.
- **Ranking**: matches are tiered (exact label match beats prefix beats
  substring beats keyword-blob-only, the last covering a DSO's Messier
  number or a star's alternate designations), then sorted within a tier
  by `rank` — real apparent magnitude for stars/DSOs, a fixed low value
  for constellations/planets so these prominent, small-count object
  types don't lose to an incidentally-matching dim background star.
  Pure function (`src/lib/search.ts`), unit-tested directly.
- **Always-visible bar, not a hidden dialog**: the spec's own wording
  ("a search bar") ruled out an icon-triggered modal. Positioned
  top-center at `z-20`, same layer as `LocationPicker` — both are
  interactive overlays that need to sit above constellation labels and
  info panels, the exact stacking bug Phase 7 had to fix once already.
- Selecting a result both flies the camera there _and_ opens that
  object's info panel (`select({ type, id })`), matching what clicking
  the object directly in the sky already does — search is a shortcut to
  the same interaction, not a separate one.

### Phase 12 — Layer toggle dock

- **`LayerToggleDock`** (`ui/controls/`) is the dock every
  `useLayersStore` flag was added for back in Phase 1. Expands upward
  from a bottom-left button — the one screen corner not already claimed
  by the header (top-left), search bar (top-center), info panels
  (top-right), or time slider (bottom-center). Reuses
  `useDismissablePanel` (Esc/outside-click) like every other overlay.
- **Two flags existed but had never been wired to anything**:
  `starNames` and `mythology`. Rather than leave them as dead checkboxes
  once the dock made them visible and clickable, this phase gave both a
  real effect:
  - `starNames` gates a new `StarLabelsLayer` (mirrors `LabelsLayer`'s
    constellation-name approach) — off by default, since up to ~3,400
    named stars across all three catalog tiers is enough `<Html>` nodes
    to clutter the sky badly, unlike the 88 always-on constellation
    names.
  - `mythology` gates `ConstellationPanel`'s mythology/fun-facts text
    (structured facts always show regardless). Its Phase 1 placeholder
    default was `false` — flipped to `true` here, since defaulting it
    off would have made already-shipped curated content disappear the
    instant the flag started actually doing something, a regression
    nobody asked for.
- **`labels` (planet/DSO name labels)**: previously `PlanetMarker`
  always rendered its name label and `DsoMarker` rendered its label
  whenever selected, both unconditionally. Both now also check
  `useLayersStore.labels` (default `true`, so behavior is unchanged
  until someone actually toggles it off) — the flag's original intent,
  now that constellation names and star names each have their own
  dedicated toggle.
- Every flag in `LayerVisibility` now has a real, visible effect and
  appears in the dock — nothing left inert.

## Polish pass

With all 12 phases shipped, the app was declared feature-complete. This
section logs a sustained accuracy/visual-quality/navigation/usability
pass across the existing implementation — batched and verified exactly
like the numbered phases above, but not adding new object types or
layers except where explicitly called out (Sun/Moon is the one approved
exception — see Batch B below).

### Batch A — Astronomical accuracy audit

- Full read-through of every coordinate transform
  (`astronomy/coordinates.ts`, `astronomy/horizontal.ts`,
  `astronomy/planets.ts`), every RA/Dec ↔ Alt/Az call site, and the
  camera's own yaw/pitch orientation math (`scene/camera/orientation.ts`)
  found **no correctness bugs** — the round-trip and special-case tests
  already in place since Phase 6/7 hold up, and this pass added more:
  a mirrored south-pole case for `equatorialToCartesian` (only the north
  pole had a test), a near-polar-observer round trip (the
  `horizontalToEquatorial` hour-angle formula divides by `cos(lat)`,
  the one place a latitude close to ±90° is mathematically the risky
  case), and an explicit RA-0/360-seam round trip.
- `coordinates.ts`'s long-standing "not yet externally validated"
  comment about east/west handedness was stale — Phase 6/7's observer
  mode has matched real sky orientation in practice ever since it
  shipped. Updated to say so instead of carrying open-ended doubt
  forward indefinitely.
- **Real gap found, deliberately deferred to Batch C, not fixed here**:
  `equatorialToHorizontal`'s call to `Astronomy.Horizon()` never passes
  the `refraction` argument, so atmospheric refraction (~34′ of lift
  right at the horizon) isn't applied anywhere. Fixing this by shifting
  rendered object _positions_ would be invasive — every layer places
  objects at their true, unrefracted equatorial position by design (see
  "Rendering model" above), and refraction only ever matters in a thin
  band within a degree or two of the horizon. Batch C's horizon fade
  band is the right, contained place to apply a refraction-adjusted
  _visibility_ threshold instead of touching every layer's placement
  math for a sub-degree effect.
- **Considered and correctly ruled out**: a "DST-adjacent date" test.
  Every date/time value in this app flows through JS `Date` (always a
  UTC instant internally) and `astronomy-engine` (UTC/TT internally) —
  DST is a local-clock-display concept that never enters the actual
  calculation, so there's nothing for such a test to catch.

### Batch B — Sun and Moon

- **`src/astronomy/sunMoon.ts`**: the Sun uses the same geocentric J2000
  `GeoVector`/`EquatorFromVector` treatment as `computePlanetPositions`
  (its own parallax, ~8.8″, is imperceptible at this rendering scale).
  The Moon is different: its parallax is up to ~1°, large enough to
  matter, so `computeMoonPosition` uses `Astronomy.Equator(..., ofdate:
false, ...)` with a real `Observer` whenever one exists — that call
  still applies the full topocentric shift (it subtracts the observer's
  own geocentric position vector internally), just expressed in the same
  J2000 frame everything else already uses — falling back to the
  geocentric position in explore mode, where there's no real observer to
  correct for. A new test confirms the geocentric/topocentric positions
  measurably differ (proving the parallax correction is actually doing
  something) while illumination/phase stay identical either way (pure
  Earth-Sun-Moon geometry, not parallax-dependent).
- **The Moon is the one object in this app whose own appearance changes
  night to night.** Every other sprite texture is generated once and
  cached per category (`getPlanetTexture(style)`, `getDsoTexture(icon)`);
  `createMoonPhaseTexture(illumination, waxing)` is deliberately _not_
  cached, since the phase genuinely changes with date. Regenerating a
  128×128 canvas (a few 2D fill calls) is cheap enough to do on every
  recompute for a single object — nowhere near the scale that ever
  required a worker or GPU-side approach elsewhere in this app.
  Illumination is rounded to 2% steps before it's used as a `useMemo`
  dependency, so trivial float differences between adjacent throttled
  date ticks don't force a redraw for a visually-identical disc.
- **Phase rendering uses the standard "half-plane plus ellipse"
  technique**: fill the lit half (right when waxing, left when waning),
  then either carve it down with a dark ellipse (crescent) or extend it
  with a light ellipse (gibbous) — so the terminator is always a true
  ellipse arc. The waxing-is-right-lit convention is the common
  simplification (a real position-angle-correct terminator needs the
  Moon's parallactic angle relative to the observer's zenith, which
  flips for southern-hemisphere observers) — labeled as such in the
  code, the same honest-approximation pattern `constellationFacts.ts`'s
  viewing-month estimate already uses.
- The Sun renders with no shading gradient at all (unlike a planet's
  off-center-highlight disc) — it's self-luminous, so there's no
  terminator to show; just a bright, symmetric radiant disc plus a much
  stronger version of the existing glow-sprite technique.
- `'sun' | 'moon'` added to `SelectableObjectType`; both have fixed ids
  (`'sun'`/`'moon'`, only one of each ever exists) rather than the
  array-of-many pattern planets/DSOs use. Added to `useSearchIndex` with
  a fixed low `rank` (more prominent than anything else in the sky) and
  no baked-in coordinates, same reasoning as planets — resolved live at
  pick time.
- Both respect horizon culling in observer mode exactly like every other
  object type (a plain `equatorialToHorizontal` check in `SceneCanvas`,
  the same cost class as the per-object checks `PlanetsLayer`/
  `DeepSkyLayer` already do).

### Search: common-name aliases

- **`src/content/aliases.ts`**: `STAR_ALIASES` covers well-known
  nicknames for the already-curated famous stars (Polaris → "North
  Star"/"Pole Star"/"Lodestar", Sirius → "Dog Star", ...) — not an
  attempt to invent a nickname for every named star, since most
  genuinely don't have one; `CONSTELLATION_ALIASES` covers all 88
  constellations with their standard English translation, plus a
  well-known informal nickname where one actually exists (Ursa Major →
  "Big Dipper"/"The Plough", Crux → "Southern Cross", Cygnus → "Northern
  Cross"). Folded into `useSearchIndex`'s `keywords` blob, so these
  match at the same "keyword-only" tier DSO common names/Messier numbers
  already use.
- **`useSearchIndex.ts` split into a pure `buildSearchIndex` function
  plus a thin hook wrapper** — the same pattern `computePlanetPositions`/
  `usePlanetPositions` already established — specifically so the alias
  behavior itself could be unit-tested directly
  (`useSearchIndex.test.ts`: confirms Polaris is findable by each of its
  three nicknames, Ursa Major by "Big Dipper," and that even a
  constellation with no special nickname — Aquarius — is still findable
  by its plain translation, proving every one of the 88 got an entry,
  not just the famous handful) without needing a component-rendering
  test harness this project doesn't have.

## UX/navigation redesign

A second round of user-requested refinements, tracked the same
batch-by-batch way as the polish pass above. The prior polish pass's
remaining batches (Today's Night Sky horizon fade, navigation tuning,
orbit-trail fix, info-panel typography, perf/a11y review) are paused,
not abandoned, in favor of this explicitly-reprioritized work; decluttering
from that plan is folded into this one instead of being done twice.

### Batch 1 — Compact UI chrome

- **`SearchBar`** now collapses behind a small 🔎 trigger button instead
  of permanently occupying top-center — structurally the same
  icon-button-expands-panel pattern `LayerToggleDock` established
  (`useState` open/close + `useDismissablePanel` for Esc/outside-click +
  `AnimatePresence`/spring transition), with every bit of internal query/
  keyboard-nav/results logic carried over unchanged. Its own bespoke
  outside-click listener (which only ever closed the results dropdown,
  not the whole bar) is gone, replaced by `useDismissablePanel` closing
  the whole thing — simpler code, and now Escape closes it too, which it
  didn't fully do before. Moved into the top-left header cluster
  (alongside the `Astra` title and `TodayButton`) per the explicit ask;
  the header's `z-index` bumped from 10 to 20 to preserve the search
  panel's original "always on top of every other overlay" guarantee.
- **`TimeTravelDock`** (new): identical structure to `LayerToggleDock`,
  wrapping the existing `TimeSlider` completely unmodified as its panel
  content. Sits beside `LayerToggleDock` at bottom-left (the two share a
  row, each independently expanding upward above its own trigger).
- **`UtcClock`** (new): a tiny always-visible `GlassPanel` at bottom-
  center (the spot the permanent `TimeSlider` vacated) showing real
  `Date.now()` in UTC, `YYYY-MM-DD` / `HH:MM:SS UTC`, `setInterval`-
  updated every second. Deliberately **not** derived from
  `useTimeStore.currentDate` — that's the simulated, scrubbable sky
  date, which only changes when the (now-hidden-behind-an-icon) Time
  Travel panel is actively scrubbing/playing, so it can't satisfy an
  always-ticking-every-second requirement on its own. This is a
  genuinely separate "what time is it, really, right now" reference,
  independent of whatever date the sky is currently depicting.

### Batch 2 — Infinite rotation

- **Investigated a reported bug ("rotation stops after one full turn")
  before touching any code**: traced every read/write of `yawRef` in
  `CameraController.tsx` and confirmed it was always a plain unbounded
  accumulator — never clamped, never wrapped. The math was never the
  problem. The real cause: mouse-drag rotation was tracked via absolute
  screen coordinates (`event.clientX`/`clientY`), so a continuous drag
  runs out of physical screen to cross well before completing even one
  360° turn, forcing a release-and-regrab that reads as "stopping."
- **Fixed with the Pointer Lock API**, the standard solution for exactly
  this class of interface: on mouse `pointerdown`,
  `canvas.requestPointerLock()` (best-effort — if denied/unsupported,
  dragging still works via the prior absolute-position path, just
  bounded by the screen edge again); while locked, `handlePointerMove`
  reads `event.movementX`/`movementY` (relative deltas, no screen-edge
  bound at all) instead of computing a delta from the last absolute
  position. Lock releases on `pointerup`/`pointercancel`, and a
  `pointerlockchange` listener ends the drag cleanly if the browser
  exits the lock on its own (e.g. Escape, per spec) rather than risk a
  spurious jump from stale coordinates once the cursor reappears
  elsewhere on screen.
- Touch dragging needed no changes — repeated swipes already accumulate
  into the same unbounded `yawRef`, a normal mobile pattern with no
  equivalent screen-edge limit to begin with.
