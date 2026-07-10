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

### Small fix — accidental clicks while dragging

- **Root cause**: the browser's native `click` event fires after any
  pointerdown+pointerup pair on the same element, regardless of how far
  the pointer moved in between — and since the whole sky is one
  `<canvas>`, every drag-to-rotate gesture ended in a `click` on
  whatever star/object happened to be under the cursor at release,
  opening its info panel even though the user was just rotating the
  camera.
- **Fix**: new `src/scene/picking/dragGuard.ts` — a tiny shared module
  (plain variables + functions, no store needed, matching the
  imperative-not-reactive style already used for high-frequency camera
  state) that accumulates total pixel distance moved since the last
  `pointerdown`, reusing the exact same per-move pixel delta
  `CameraController` already computes for yaw/pitch. Every object's
  `onClick` handler (`StarsLayer`, `ConstellationFigure`, `PlanetMarker`,
  `DsoMarker`, `SunMarker`, `MoonMarker`) now checks `wasDrag()` first
  and bails out if the pointer moved more than 6px before release —
  small enough to still register a genuine stationary click/tap, large
  enough to absorb natural hand jitter.

### Batch 3 — Earth-to-Universe progressive exploration

- **`src/scene/exploration.ts`** (pure, tested) is the one place this
  mapping lives. Explore Mode's zoom is deliberately _not_ optical
  magnification — per the spec, zooming in represents traveling
  progressively farther from Earth, revealing more of the universe
  rather than just enlarging the current view. `getExplorationLevel(fov)`
  maps camera FOV to a discrete depth level (1-6; level 1 is the
  default/baseline naked-eye view, covering the whole default-to-widest
  FOV range); `revealProgress(fov, level)` gives a 0-1 smoothstep fade
  for any level so nothing pops in abruptly. Only active in **explore
  mode** — Today's Night Sky (observer mode) is completely untouched by
  any of this, per the spec's explicit "separate from Today's Night
  Sky."
- **Stars use a continuous magnitude cutoff, not the discrete level
  ladder.** The catalog's existing tiers already double as a natural
  depth ladder (tier0 mag≤4, tier1 mag≤6.5, tier2 mag≤8) — and since
  there's real magnitude data to interpolate across, `starMagnitudeCutoff
(fov)` computes a continuously-shifting faintest-visible-magnitude
  directly, smoother than snapping through 3 discrete bands. This is
  _why_ the default view felt overwhelmingly dense before this: at the
  default FOV, all three tiers (~41,000 stars) were already loaded and
  rendered unconditionally regardless of zoom — this cutoff is what
  actually limits the baseline view to the brightest (~500, mag≤4)
  stars now.
- **Implemented as a GPU shader extension, not CPU filtering** — the
  exact discipline the Phase 8 fix established for horizon culling.
  `StarRenderBuffers` gained a `magnitudes` array (threaded through
  `tierToCatalog`/`mergeCatalogs` in `useStarCatalog.ts`); the star
  shader gained an `aMagnitude` attribute and `uMagnitudeCutoff`/
  `uExplorationEnabled` uniforms, updated once per frame from camera FOV
  exactly like the existing horizon-culling uniforms, and fades each
  star out over a small magnitude band past the cutoff
  (`MAGNITUDE_FADE_WIDTH`) rather than a hard cutoff. No CPU rebuild, no
  geometry remount, no worker — same GPU-uniform pattern already proven
  for horizon culling. `StarsLayer`'s `isCulled` mirrors the shader's own
  fully-invisible threshold so a star that's still fading in stays
  clickable, one that's fully hidden doesn't.
- **Deep-sky objects use the discrete level ladder** via
  `dsoRevealLevel(dso)`: a curated/Messier object bright enough to
  plausibly spot with the naked eye is part of the Level-1 baseline
  itself (the spec's "small number of major naked-eye deep-sky
  objects") — clusters reveal at Level 2 ("additional star clusters"),
  nebulae at Level 4 ("brighter nebulae"), galaxies at Level 5 ("major
  galaxies"). `DsoMarker` eases its own material opacity toward
  `revealProgress`'s target every frame (`damp`, matching this app's
  established easing convention) — cheap at ~500 objects, no CPU
  filtering or remount needed at this scale either. Its click/hover
  handlers bail out below a small opacity threshold, the same
  don't-interact-with-invisible-objects guard `StarsLayer` already
  applies for horizon-culled stars.
- Planets, Sun, and Moon stay always visible (they're the explicit
  Level-1 baseline); constellation lines/names are unaffected (already
  gated by their own toggle, already part of the Level-1 baseline per
  the spec).

### Batch 4 — Smart label visibility & collision avoidance

- **`src/scene/picking/labelDeclutter.ts`** (pure, tested):
  `selectDeclutteredLabels` greedily walks a priority-sorted candidate
  list (most prominent first) and skips any candidate within a minimum
  angular separation of an already-accepted one — O(n·k), not O(n²),
  since rejected candidates never get compared against each other.
  Angular separation on the celestial sphere stands in for true
  per-frame 2D screen-space distance (which would need re-projecting
  every candidate every frame — real cost at thousands of star labels);
  `fovScaledLabelSeparation` scales the threshold by current FOV so the
  same _on-screen_ gap is respected at any zoom, the exact reasoning
  `fovScaledPointThreshold` already established for click targets.
- **`useThrottledFov(step)`** (new hook): quantizes camera FOV into
  `step`-degree buckets and only triggers a re-render when the bucket
  changes — needed because `useSceneStore`'s reactive `fov` field
  updates nearly every frame during an active zoom (`CameraController`
  writes it that often), and re-sorting/re-filtering a candidate list
  of thousands of star labels every single frame would be wasteful for
  a feature that only needs to change occasionally as the user zooms.
- **`StarLabelsLayer`** now applies three filters before rendering a
  label: horizon visibility (existing), Explore Mode's reveal cutoff
  (new — a star that's still faded out per Batch 3 shouldn't have a
  visible name either), and the declutter pass (new). **`LabelsLayer`**
  (constellation names) gets the same declutter pass; since a
  constellation has no natural "priority" the way star magnitude gives
  one, declaration order stands in — the goal there is purely stopping
  two labels from visually overlapping in crowded regions (e.g.
  Scorpius/Sagittarius/Ophiuchus), not ranking importance.
- **Deliberately scoped to per-layer, not cross-layer, collision
  avoidance** — star labels declutter among themselves and
  constellation names declutter among themselves, but the two systems
  don't currently coordinate with each other. True cross-layer
  avoidance would need a shared per-frame registry between two
  otherwise-independent layers; left as a possible future refinement
  rather than adding that coordination now.

### Batch 5 — Tonight's Highlights

- **`src/astronomy/highlights.ts`** — a pluggable detector engine.
  `HighlightContext` bundles the current date, observer, and already-
  computed planets/moon/DSOs/constellations; one independent detector
  function exists per event category (bright planets, the Moon, meteor
  showers, conjunctions, eclipses, notable deep-sky objects, prominent
  constellations), and `getTonightsHighlights(context, limit)` runs all
  of them, concatenates, sorts by `priority` (ascending — lower is more
  significant), and truncates. Adding a future event type (comets, say,
  if an orbital-element data source is ever integrated — none exists
  today, in this project or in `astronomy-engine`) means writing one
  more detector function, not touching the others.
- **Real rise/set/culmination** for planets and the Moon via
  `SearchRiseSet`/`SearchHourAngle` (only ~8 bodies, cheap enough to
  call directly, unlike the star catalog) — gives genuine "rises around
  23:14 UTC" / "highest around 02:40 UTC" timing and a compass
  direction, not a guess. DSOs, constellations, and meteor showers use
  simpler, honest qualitative descriptions instead ("Visible now",
  "Best viewed after midnight") to keep the feature's total cost
  bounded — see the doc comment on `computeBodyVisibility`.
- **`src/content/meteorShowers.ts`** — a small hand-authored calendar of
  9 major annual showers (real peak dates, ZHR, radiant position),
  cross-checked the same way `PLANET_CONTENT`'s physical facts are;
  `astronomy-engine` has no built-in meteor data. A shower counts as
  "active" within its own `activeWindowDays` of its peak date (checked
  against the nearest calendar-year anniversary, so the check works
  correctly right across a year boundary, e.g. the Ursids in late
  December).
- **Conjunctions** are detected directly from angular separation (law
  of cosines) between every pair of planet/Moon positions already
  computed elsewhere in the app — no new ephemeris calls. **Eclipses**
  use `SearchLunarEclipse`/`SearchLocalSolarEclipse`, filtered to a
  7-day lookahead window and to eclipses actually above (or just below,
  for lunar, allowing for twilight visibility) the horizon; the solar
  eclipse highlight explicitly calls out eye-protection safety in its
  copy, not just the astronomical facts.
- **Notable DSOs and prominent constellations** reuse each object's own
  real position: a DSO must currently be above the horizon (sorted by
  magnitude, brightest first, capped at 4), and a constellation must
  currently be more than 20° above the horizon (capped at 2) — real
  geometry decides "prominent right now," not a rough month-based
  heuristic.
- **`src/hooks/useTonightsHighlights.ts`** wraps the engine behind the
  project's shared `throttle` utility (the same one `TimeSlider` uses
  for date commits), but at a much coarser 2-second interval — this
  engine runs several numerical searches per body plus two eclipse
  searches, meaningfully heavier than a single `Horizon()` call, so
  continuous time-scrubbing or playback must not re-run it on every
  tick. Returns `[]` outright in explore mode (no real observer to
  compute rise/set from) rather than resetting state from inside the
  effect, sidestepping a "setState synchronously in an effect" lint
  trap.
- **`src/ui/panels/TonightsHighlightsPanel.tsx`** — an icon-triggered
  panel (✨, the same icon-expands-downward pattern as `SearchBar`),
  gated to only render once a real observer exists, placed in the
  header next to the "Today's Night Sky" button. Each entry shows the
  highlight's icon/title/summary/why-it's-special/direction/timing/
  visibility/difficulty and a "Fly to" button that reuses
  `useSceneStore.setFlyToTarget` and, when the highlight maps to a
  real selectable object, `useSelectionStore.select` — opening that
  object's existing info panel exactly like clicking it in the sky.
  Selecting a "Fly to" action closes the panel afterward, matching
  `SearchBar`'s own close-on-select convention.

### Batch 6 — Final polish pass

A cross-check of every panel touched across Batches 1-5, desktop and
mobile, rather than a new feature:

- **Off-palette colors removed.** `TonightsHighlightsPanel` originally
  color-coded each highlight's difficulty badge with Tailwind's default
  `emerald`/`amber`/`sky` shades — none of which are part of this app's
  actual design tokens (`src/styles/tokens.css` defines only
  `space`/`star`/`accent`/`glass`). No existing panel in this app
  color-codes text this way (`DSO_TYPE_META.color` is only ever used
  for 3D marker sprites, never UI text), so the badge now renders in
  plain `text-star-500`, consistent with every other secondary label
  (e.g. `InfoPanel`'s fact `dt` labels).
- **Mobile overflow guard.** The header's second row went from holding
  one button (`TodayButton`) to two (`TodayButton` +
  `TonightsHighlightsPanel`'s trigger) — added `flex-wrap` so the row
  degrades to two lines on the narrowest phone widths instead of
  overflowing the viewport edge.
- **Panel width aligned** with the nearest analogous panel: Tonight's
  Highlights is a content-rich detail panel like `InfoPanel`, so it now
  shares `InfoPanel`'s exact `w-[min(90vw,380px)]` sizing instead of an
  arbitrary `92vw`/`380px` mix.
- **Audited and confirmed consistent, no changes needed:** every
  overlay's spring transition (`stiffness: 320, damping: 32`,
  `useReducedMotion` handled), the two-tier z-index scheme (`z-20` for
  floating dropdowns/modals — header, `LocationPicker` — over `z-10`
  for docked panels — `InfoPanel`, the bottom bars), `useDismissablePanel`
  usage on every dismissable overlay, and `wasDrag()` coverage across
  every clickable scene layer (stars, constellations, DSOs, Sun, Moon,
  planets).

This closes out the UX/Navigation Redesign plan (items 1-7). The
earlier, separately-paused polish-pass batches (Today's Night Sky
horizon fade/zenith marker, navigation tuning, orbit-trail fade,
info-panel typography, perf/a11y review) remain paused, to be resumed
only if explicitly requested again.

## Interaction polish: cinematic zoom + click-priority fix

Two follow-up refinements requested after the redesign above shipped,
addressing how the zoom actually _feels_ and a real click-handling
regression the drag-guard fix had quietly introduced. Both preserve the
existing render model (camera fixed at the origin, FOV-only "zoom," one
celestial sphere radius for every object type) — no architecture change.

### Zoom redesign: log-space momentum, not discrete optical steps

- **Root feel problem**: zoom was a direct, linear `targetFov +=
deltaY * WHEEL_ZOOM_SPEED` jump, single-damped toward the display FOV.
  Two things made this read as "enlarging an image" rather than
  "traveling": the mapping was _additive_ (a fixed absolute FOV step
  regardless of current zoom, unlike pinch's already-multiplicative
  ratio), and there was no momentum — input stopped, motion stopped.
  Hitting `MIN_FOV`/`MAX_FOV` was a hard `clamp()`, a literal wall.
- **`src/scene/camera/zoom.ts`** (new, pure, tested): `stepZoomTarget`
  advances the FOV target in _log space_ rather than linear degrees, so
  a wheel notch or pinch ratio produces the same _relative_ zoom step
  whether the camera is near the wide baseline or deep in the
  exploration levels — the same reason real distance scales (map zoom
  levels, camera dollies) are conventionally multiplicative, not
  additive. `zoomEdgeResistance` tapers the velocity's effect smoothly
  to 0 as the target nears `MIN_FOV`/`MAX_FOV` (a `smoothstep01` band,
  new shared helper moved into `lib/math.ts` out of `exploration.ts`),
  so the boundary reads as arriving and settling rather than hitting a
  wall — the hard `clamp()` is still there as a numerical safety net,
  but rarely what's actually perceived.
- **`CameraController.tsx`**: wheel ticks now add an _impulse_ to a
  `zoomVelocityRef` (log-FOV units/second) instead of jumping the target
  directly; every frame, `stepZoomTarget` advances the target by that
  velocity, which then decays via the same `damp()`-based inertia
  `INERTIA_DAMPING` already gives rotation (own `ZOOM_INERTIA_DAMPING`
  constant). Pinch sets velocity directly from the gesture's
  instantaneous rate each touch-move (precise tracking while active),
  so releasing a fast pinch coasts on the same curve a wheel flick does.
  Sustained scrolling naturally reaches a bounded "terminal velocity"
  (impulse-rate balances decay-rate) rather than accelerating forever.
  Reduced-motion users get the wheel's total eventual effect applied in
  one step (`impulse / ZOOM_INERTIA_DAMPING`, the same integral the
  velocity system would otherwise settle to) through the _same_
  `stepZoomTarget` curve, so the edge-softening behavior is identical
  either way — just without the coast to animate through.
- Camera orientation (yaw/pitch) is untouched by any of this — zoom only
  ever writes `targetFov`/`zoomVelocityRef`, so the center of focus never
  drifts during a zoom gesture. The existing Earth-to-Universe reveal
  system (`exploration.ts`, Batch 3/4) reads only `camera.fov` each
  frame, so it's unaffected by _how_ that value now arrives — the fades
  it already does just ride a smoother, momentum-driven FOV curve now.

### Click-priority fix: stars and constellation lines were starving every other object

- **Root cause, verified against Three.js/react-three-fiber source, not
  guessed**: `Points.raycast` and `Line.raycast` report a hit's
  `distance` as the distance to the _closest point on the ray itself_ to
  the star/segment (`Ray.distanceSqToPoint` / `distanceSqToSegment`),
  not the star's true position. Since a flat billboard mesh (DSO/
  planet/Sun/Moon marker) tangent to the celestial sphere only equals
  the sphere's true radius exactly at its own center, this makes a
  nearby star or constellation line's reported distance _systematically
  less than_ a marker's real, exact mesh-intersection distance at the
  same nominal radius. React-three-fiber dispatches click events
  nearest-first and stops at the first `stopPropagation()` — so with
  every star/line's `handleClick` calling `stopPropagation()`
  unconditionally, a star or line within click range would silently
  consume the event before the real target's own handler ever ran. In
  practice, since ~40,000+ stars densely cover the sky, virtually any
  click near a DSO/planet/Sun/Moon marker was also "near" some star,
  which is exactly why only stars ever seemed to respond.
- **`src/scene/picking/interactionPriority.ts`** (new, pure, tested):
  `hitsAnotherObject(intersections, self)` — true if the same raycast
  also hit a _different_ object with its own handler. Both `StarsLayer`
  (click and hover) and `ConstellationFigure` (click) check this first
  and, if true, return without calling `stopPropagation()` — letting
  r3f's event dispatch continue naturally to the next (real) intersected
  object's own handler instead of the star/line consuming it. DSO/
  planet/Sun/Moon markers need no equivalent check: their raycasts are
  exact mesh intersections with no such bias, so legitimate ties between
  two of them already resolve correctly by true distance.
- Deliberately _not_ a reduced clickable area: the FOV-scaled point/line
  thresholds (`fovScaledPointThreshold`) are untouched, so stars and
  constellation lines remain exactly as easy to hit as before — this
  only changes _priority_ when a click also lands on something more
  specific.

## Interaction system refinement: exploration in both modes, intelligent search, performance, pulses

A follow-up pass fixing a real regression (only stars clickable — see
above) plus five further refinements: Earth-to-Universe exploration in
Today's Night Sky, intelligent search navigation, a render-storm
performance fix, and attention-pulse animations. No architecture change
— same camera model, same celestial-sphere render, same store shape.

### Exploration now applies in both modes

- **Root cause of the request**: `explorationEnabled` was wired as
  `!horizonCullingEnabled` (`SceneCanvas.tsx`) and `observer === null`
  (`DeepSkyLayer.tsx`) — an either/or toggle between "horizon culling"
  and "exploration reveal," never both. But the shader
  (`starField.frag.glsl`) and DSO opacity logic were already built to
  **compose** the two as independent discard/fade conditions (confirmed
  by reading both — `vBelowHorizon` and `vRevealAlpha` are separate,
  both-must-pass checks). So enabling exploration in observer mode was a
  one-line flip at each of the two call sites, not a new system — Batch
  3's architecture already anticipated this.
- Every `explorationEnabled` prop and doc comment across
  `StarsLayer`/`StarLabelsLayer`/`DsoMarker`/`DeepSkyLayer` updated from
  "true only in explore mode" to "always true; composes with horizon
  culling when a real observer exists."
- **Entering observer mode also resets zoom** to the Level-1 baseline
  (`useSceneStore.DEFAULT_FOV`, now exported) in the same `useEffect`
  that already re-orients the camera south — otherwise a zoom carried
  over from Explore Mode could open Today's Night Sky already showing
  deeper exploration levels instead of "what's naturally visible from
  here, right now," per the request's explicit requirement.

### Intelligent search navigation

- **`scene/exploration.ts` gained the inverse functions** needed to fly
  _to_ a reveal level rather than just query it:
  `fovForExplorationLevel(level)` (the FOV that fully reveals a DSO
  level, with a small arrival margin past the fade band) and
  `fovForStarMagnitude(magnitude)` (the mathematical inverse of
  `starMagnitudeCutoff`, shifted by `MAGNITUDE_FADE_WIDTH` so the target
  FOV reveals the star comfortably, not just at the bare threshold).
  Also `isStarRevealed`/`isDsoRevealed`, which mirror the exact same
  cutoffs `StarsLayer`'s `isCulled` and `DsoMarker`'s click-gating
  already use (`DSO_CLICKABLE_OPACITY`, now shared from
  `exploration.ts` rather than a private DsoMarker constant), so
  search's idea of "visible" always agrees with what's actually
  clickable.
- **`App.tsx`'s `handleSearchSelect`** now checks, for stars and DSOs
  only (constellations/planets/Sun/Moon are always Level-1 baseline,
  never need this): is the result already revealed at the _current_
  FOV? If not, `setTargetFov` is set alongside `setFlyToTarget` to the
  FOV that reveals it. Both the yaw/pitch fly-to and the FOV zoom ease
  concurrently in `CameraController`'s existing `useFrame`, so the
  camera pans _and_ travels deeper at once — a single cinematic
  flight, not two separate motions. "Reveal nearby context along the
  way" needs no extra code: every other object's existing per-frame
  fade already runs off the same FOV, so intermediate objects fade in
  naturally as the flight passes their own reveal levels.
- `MIN_FOV`/`MAX_FOV` moved from `CameraController.tsx` (private) to
  `scene/constants.ts` (shared), so App's search handler clamps against
  the same authoritative bounds.

### Attention pulse on selection (search and direct clicks alike)

- **`scene/selectionPulse.ts`** (new, pure, tested):
  `selectionPulseIntensity(elapsedSeconds)` — 1 at the instant of
  selection, smoothstep-decaying to 0 over `SELECTION_PULSE_DURATION_SECONDS`
  (1.2s). Layered on top of each object's existing static
  selected-highlight (color/opacity/scale), not replacing it.
- **`hooks/useSelectionPulse.ts`** and **`hooks/usePulseHighlightScale.ts`**
  (new): reusable ref-based hooks for components with no other
  per-frame work of their own (`PlanetMarker`, `SunMarker`,
  `MoonMarker`) — attach a ref, get a pulsing scale, no manual
  `useFrame` needed.
- `DsoMarker` and `ConstellationFigure` track the pulse **inline**
  inside their existing `useFrame` instead of using the hook, deliberately
  avoiding a second `useFrame` subscription per instance — at up to ~500
  DSOs and 88 constellations, doubling the per-frame callback count for
  those two layers specifically would be exactly the kind of cost this
  app's performance work exists to avoid.
- **`StarsLayer`'s shader** gained `uSelectedIndex`/`uSelectionPulse`
  uniforms mirroring the existing `uHoveredIndex` mechanism — the
  selected star's index is looked up once per selection _change_ (a
  cached ref, not a per-frame scan across ~40,000 stars), and the pulse
  boosts point size/brightness briefly on top of the steady
  selected/hovered highlight.

### Performance: fixing a real render-storm

- **Root cause, verified by reading every reactive `useSceneStore`/
  `useTimeStore` subscriber**: `App` re-renders on every Time Travel
  tick (`currentDate`, throttled to ~120ms while playing — up to ~8×/
  second) and on every other store change it subscribes to. Every
  child in the header/dock cluster (`SearchBar`, `TodayButton`,
  `LayerToggleDock`, `TimeTravelDock`, `TonightsHighlightsPanel`) — none
  of which have anything to do with the current date — re-rendered right
  along with it, since none were memoized and several received a fresh
  inline callback (`onSelect`, `onNeedManualLocation`) on every single
  `App` render, defeating even a naive `memo` wrap.
- Fixed at the source: `handleSearchSelect` and the location-picker
  callback are now `useCallback`-stabilized in `App.tsx`, and
  `SearchBar`/`TodayButton`/`LayerToggleDock`/`TimeTravelDock`/
  `TonightsHighlightsPanel` are wrapped in `React.memo` — each now skips
  re-rendering entirely on an unrelated `App` render, only updating for
  its own state or store subscriptions (or, for `TonightsHighlightsPanel`,
  when `context` itself legitimately changes in observer mode).
- **`useDismissablePanel`** (used by all of the above plus `InfoPanel`/
  `LocationPicker`) was tearing down and re-adding two
  `document`-level event listeners on _every render_ of every
  dismissable panel, since the `onClose` callback passed in
  (`() => setIsOpen(false)`) is a fresh closure each time and was a
  direct effect dependency. Fixed by reading `onClose` through a ref
  (updated every render, but never itself a dependency), so both
  listeners register exactly once per mount — the standard "stable
  event handler" pattern, and a meaningful reduction in per-render work
  across every overlay in the app, not just the ones touched above.
- **`DsoMarker`/`ConstellationFigure`** avoid a second `useFrame`
  subscription for the new pulse (see above) — the other concrete,
  measured way this pass avoided adding net-new per-frame cost while
  still shipping the requested highlight animation.
- Observer mode's newly-composed exploration reveal (see above) is
  also a genuine performance win, not just a feature: Today's Night Sky
  previously rendered every above-horizon star/DSO unconditionally
  regardless of zoom; it now thins by magnitude/reveal-level exactly
  like Explore Mode, reducing GPU overdraw and the number of raycast
  candidates at the default (wide) zoom.

### Tonight's Highlights attention pulse

- The trigger button gets a soft pulsing glow (`framer-motion`
  `boxShadow` keyframe animation, 1.8s loop, respects
  `prefers-reduced-motion`) until the user opens the panel for the
  first time _this session_ — a plain `useState` flag is enough, since
  `TonightsHighlightsPanel` is always mounted by `App` (its own early
  `return null` in explore mode doesn't unmount it), so the flag
  persists across mode switches and open/close cycles for the whole
  session, resetting only on a real page reload. Closing the panel
  again does not resume the pulse.

## Interaction stabilization pass: the pick-priority mutual-deferral bug

A pure polish/optimization pass — no new features. Fixes a real
regression the click-priority fix (above) had introduced, adds cursor
feedback, and removes several confirmed per-frame inefficiencies.

### Root cause: stars and constellation lines mutually deferred to each other

- The previous fix (`hitsAnotherObject`) made stars and constellation
  lines defer to _any_ other object also hit by the same ray, so a
  precise DSO/planet/Sun/Moon marker would always win a shared hit.
  What it missed: constellation lines are drawn **between** named
  stars, so a line segment's raycast threshold very often also covers
  the exact position of the star it connects to. When both a star and
  a line were hit by the same ray, **both** saw "something else was
  also hit" and **both** deferred — and since neither called
  `stopPropagation()`, neither ever ran its own hover/click logic
  either. Net effect: hover highlighting silently stopped working, and
  clicking a star or constellation line frequently did nothing at all
  — exactly the reported regression, for exactly the objects most
  likely to anchor a constellation line (i.e. the brightest, most
  commonly clicked stars).
- **Fixed with an actual priority system instead of a binary "anyone
  else" check.** `scene/picking/interactionPriority.ts` now exports
  `PICK_PRIORITY = { line: 0, star: 1, precise: 2 }` and
  `hitsHigherPriorityObject(intersections, self, ownPriority)`, which
  only defers to a hit of **strictly higher** priority. Every
  interactive object now tags itself via a plain `userData={{
pickPriority: ... }}` prop: `ConstellationFigure` → `line`,
  `StarsLayer`'s `<points>` → `star`, `DsoMarker`/`PlanetMarker`/
  `SunMarker`/`MoonMarker`'s clickable mesh → `precise`. This resolves
  correctly regardless of raycast dispatch order: a star always wins
  over a line hit at the same point (checked from either side), and a
  precise marker always wins over both — no more mutual deadlock,
  because two objects of the _same_ priority never defer to each other.
- `interactionPriority.test.ts` rewritten to cover the three-way case
  directly (line/star/precise all hit at once, only the precise object
  proceeds) plus the specific regression scenario (star does not defer
  to a line, line does defer to a star).

### Cursor feedback

- **`hooks/useHoverCursor.ts`** (new): sets `document.body.style.cursor
= 'pointer'` while `useSceneStore.hoveredObjectId` is non-null, and
  back to the default otherwise. Subscribed via zustand's vanilla
  `subscribe()` (not a reactive selector) since hover can change on
  every pointer move across the sky — a plain DOM style write needs no
  React re-render to take effect, and using a reactive selector here
  would reintroduce the exact re-render churn the previous pass fixed.
  Wired once in `App`.

### Zoom engine: removing confirmed per-frame waste

- **`DsoMarker`** (~500 instances) previously recomputed
  `revealProgress`, ran the opacity `damp()`, and wrote
  `material.opacity` **every frame, forever** — even once fully
  converged and the camera sitting perfectly still. Now tracks the
  last-seen FOV and a converged flag: the fade only actually recomputes
  while the FOV is genuinely changing or the opacity hasn't yet
  settled within `OPACITY_CONVERGED_EPSILON`, and the mesh's scale
  (used for the selection pulse) is only touched at all while an
  object is selected, or on the single frame it stops being selected.
  Visually identical output — this only removes work that was
  producing the exact same result every frame anyway.
- **`ConstellationFigure`** (up to 88 instances) previously wrote
  `material.color` every frame for every constellation, selected or
  not. Since at most one constellation is ever selected at a time, this
  now skips the color write entirely for the ~87 unselected ones,
  except on the single frame each transitions away from selection.
- `CameraController`'s own per-frame zoom/pan math was reviewed and is
  already lean (ref-mutations and `damp()` calls only, no allocations,
  no reactive store subscriptions that would trigger React re-renders)
  — no changes needed there beyond what the previous pass already did.
- `PlanetOrbitTrail`, `useThrottledFov`-driven label decluttering, and
  the star shader's per-frame uniform updates were all re-reviewed and
  confirmed already correctly memoized/throttled (recomputing only on
  date change or on throttled FOV-bucket change, never per frame across
  the full object count) — no further action needed.

### Search navigation: removing a duplicate catalog scan

- `App.tsx`'s `handleSearchSelect` previously scanned the star/DSO
  catalog **twice** per selection for the same id — once to resolve the
  fly-to position, once more to check reveal-level visibility. Rewritten
  to look each result up once and derive both the target position and
  the required FOV from that single lookup — halves the scan cost for
  star/DSO search results (the catalog scan is still a one-time,
  pre-animation cost, never inside the per-frame flight itself, which
  was already the case).

### Reviewed, no change needed

- **Hit-testing/spatial indexing**: Three.js's `Points`/`Line` raycasting
  already pre-checks a bounding sphere before testing individual
  points/segments, and the FOV-scaled thresholds
  (`fovScaledPointThreshold`/`fovScaledLabelSeparation`) already keep
  the effective hit-test cost and clickable-area feel consistent across
  zoom levels. A full custom spatial index (octree/grid) would be a
  materially larger architecture change for a stabilization pass whose
  explicit goal is _fewer_ moving parts, not more — not attempted.
- **Frustum culling for the star field**: the single `Points` buffer
  spans the full celestial sphere around the always-at-origin camera,
  so its bounding sphere is never entirely outside the view frustum —
  Three.js's default per-object culling can't skip it as a whole. This
  is an inherent property of the GPU-buffer approach Phase 8 chose
  specifically to avoid CPU-side filtering/geometry rebuilds; WebGL's
  own hardware clipping already avoids fragment work for off-screen
  points, which is the cost that actually matters at this scale.

## The actual click bug: react-three-fiber's own `onClick` gate

The pick-priority fix above was real and necessary, but the user
reported clicking was _still_ unreliable afterward — correctly, since
that fix addressed a different bug than the one actually causing most
of the dropped clicks. Found by reading react-three-fiber's own event
source (`node_modules/@react-three/fiber/dist/events-*.js`) rather than
guessing further.

### Root cause

React-three-fiber's `onClick` (and `onContextMenu`/`onDoubleClick`) has
its own internal restriction, independent of anything this app's code
controls: on `pointerdown`, it snapshots which objects were hit
(`internal.initialHits`); later, on the native `click` event, it only
invokes an object's `onClick` handler if that _same_ object is also in
`initialHits`:

```js
// react-three-fiber's events.js
if (!isClickEvent || internal.initialHits.includes(eventObject)) {
  handler(data)
}
```

This app's camera is essentially never perfectly still — zoom momentum
coasts for up to a second or two after any scroll/pinch, fly-to
animations ease over ~1s, and search navigation can still be
mid-flight. A real click/tap always spans a few dozen milliseconds
between `pointerdown` and the browser's `click` event, and during that
gap the scene can genuinely move: a marker's screen position shifts, or
a star just outside a slightly-different `Points` raycast threshold
falls in or out of range — all without the user's finger or mouse
moving at all. When the object hit at `click` time isn't _exactly_ the
object hit at `pointerdown` time, react-three-fiber silently drops the
event — no handler runs, nothing happens, and it looks like the click
"didn't register." This is most likely to bite precisely the natural
click pattern of this app: zoom or pan to find something, then click it
immediately, while the camera is still settling.

`onPointerMove`/`onPointerOver`/`onPointerOut` have no such
restriction (confirmed in the same source) — which is exactly why the
earlier hover fix held up on its own while clicking kept failing: hover
was never subject to this gate to begin with.

### Fix

Every selectable object's click handler is now bound to `onPointerUp`
instead of `onClick` — `pointerup` has no "must match the pointerdown
hit" restriction, so it always reflects a fresh raycast at the exact
moment of release, matching the intuitive "select whatever's under the
cursor when you let go" behavior a click should have. `wasDrag()` still
does the actual click-vs-drag distinction (unchanged), and the
pick-priority defer logic (`hitsHigherPriorityObject`) still applies
identically, since react-three-fiber computes `intersections` the same
way for every event type — only the `isClickEvent` gate differs by
name.

Two things had to be added back that `onClick`/native `click` handled
for free:

- **Button filtering.** `onClick` only ever fires for the primary mouse
  button; `onPointerUp` fires for _any_ button release, so every
  handler now starts with
  `if (event.pointerType === 'mouse' && event.button !== 0) return`
  (touch/pen pass straight through, matching `CameraController`'s own
  pointerdown guard).
- **Multi-touch releases.** A native `click` generally never fires for
  a multi-finger (pinch) gesture; `pointerup` fires once per released
  finger regardless. `dragGuard.ts` gained `markMultiTouchGesture()`,
  called by `CameraController` the moment a second pointer joins a
  gesture, so `wasDrag()` also returns `true` for the rest of any
  pinch — even though a pinch alone doesn't accumulate the
  single-pointer rotate distance `addDragDistance` tracks.

Updated: `StarsLayer`, `ConstellationFigure`, `DsoMarker`,
`PlanetMarker`, `SunMarker`, `MoonMarker` (every object type with its
own selection), plus `dragGuard.ts`/`dragGuard.test.ts` and
`CameraController.tsx` for the multi-touch marking.

## Drag detection: path length vs. net displacement

Reported as "clicks are often interpreted as drag attempts" after the
zoom redesign. Investigated by diffing the current interaction code
against the commit right before the Earth-to-Universe zoom feature was
introduced (`git show 8c943f6:src/scene/camera/CameraController.tsx`
and the equivalent for every layer). That comparison showed
`CameraController`'s own rotate-drag detection — `isDraggingRef`, the
6px `CLICK_DRAG_THRESHOLD_PX`, `addDragDistance`/`resetDragDistance` —
is **byte-for-byte unchanged** since before the zoom work. The zoom
redesign didn't touch the click/drag state machine at all; it just made
a pre-existing algorithmic flaw in `dragGuard.ts` more consequential, by
adding a momentum system that keeps the camera settling for noticeably
longer after any interaction, and the additional per-frame reveal/pulse
work happening during that same window.

### The actual flaw

`dragGuard.ts` accumulated **path length** — the sum of each per-move
delta's own magnitude (`totalDragDistance += Math.hypot(dx, dy)`) —
rather than **net displacement** from the original pointerdown
position. A real click's incidental hand-tremor or touchpad jitter
produces several tiny moves in alternating directions (e.g. +2px, then
−2px, repeated) that a person perceives as "holding still." Path length
sums the magnitude of every step regardless of direction, so this
jitter compounds and can exceed the 6px threshold even though the
pointer's net position barely changed — misreading a stationary click
as a drag, which silently suppresses the eventual selection (see
`wasDrag()`'s callers). This bug predates the zoom feature entirely (it
was present in the very first version of `dragGuard.ts`,
commit `8c943f6`) — it just had fewer opportunities to manifest before
the zoom momentum system extended how long the camera keeps moving
after an interaction, and therefore how often a "click" lands inside
that window.

**Fixed** by tracking the **vector sum** of the deltas instead
(`netDx += dx; netDy += dy`, then `wasDrag()` checks
`Math.hypot(netDx, netDy)`): a real drag's deltas consistently point the
same general way, so a genuine drag is detected identically to before;
jitter that cancels out in direction now correctly nets to ~0 instead of
compounding. The public API (`resetDragDistance`/`addDragDistance`/
`wasDrag`/`markMultiTouchGesture`) is unchanged, so no caller needed
updating — only the internal accumulation formula changed.
`dragGuard.test.ts` gained a test that reproduces the exact jitter
pattern (10× alternating +2/−2px) alongside one confirming a slow,
consistent-direction drag of the same total step count is still
correctly detected.

### Secondary hardening: a documented Pointer Lock bug

While investigating, found a longstanding, documented Chromium bug
(tracked upstream) where `movementX`/`movementY` occasionally report a
spurious 300-400px jump during active Pointer Lock, independent of any
of this app's own code — large enough to blow through the drag
threshold outright. `CameraController` now requests pointer lock with
`{ unadjustedMovement: true }` (opts out of OS-level mouse
acceleration, the documented mitigation), falling back to a plain
`requestPointerLock()` if the browser rejects the option itself
(handled the same `.catch()`-and-continue way lock failures always
were — dragging still works via the absolute-position fallback either
way).
