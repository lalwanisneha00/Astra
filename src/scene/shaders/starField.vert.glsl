uniform float uTime;
uniform float uPixelRatio;
uniform float uTwinkleAmount;
// -1 means "nothing hovered"; otherwise the hovered star's own aIndex.
uniform float uHoveredIndex;
// -1 means "nothing selected"; otherwise the selected star's own aIndex.
uniform float uSelectedIndex;
// 0-1, decays after selection — see scene/selectionPulse.ts. A brief
// extra boost on top of the steady selected-highlight, the same
// "just selected" pulse every other object type gets.
uniform float uSelectionPulse;
// 0 = explore mode, ignore aAltitude entirely; 1 = observer mode, hide
// stars below the horizon. Toggling this is cheap (one uniform), unlike
// rebuilding the star buffers on every horizon recompute.
uniform float uHorizonCullingEnabled;
// 1 in both modes — applies the Earth-to-Universe progressive reveal
// (see scene/exploration.ts) on top of horizon culling, not instead of
// it. Kept as a uniform (rather than hardcoding "always on") in case a
// future toggle ever wants to disable it again.
uniform float uExplorationEnabled;
// The faintest magnitude currently revealed in explore mode, updated
// every frame from camera FOV — CameraController/StarsLayer already
// reads FOV per-frame for the click-threshold scaling, so this reuses
// the same per-frame read rather than adding new plumbing.
uniform float uMagnitudeCutoff;

attribute float aSize;
attribute float aTwinklePhase;
attribute vec3 aColor;
attribute float aIndex;
// Current altitude in degrees, updated in place (bufferAttribute.needsUpdate)
// whenever useHorizonCulling's worker returns a new result — never
// requires rebuilding the geometry itself.
attribute float aAltitude;
attribute float aMagnitude;

varying vec3 vColor;
varying float vTwinkle;
varying float vHighlight;
varying float vBelowHorizon;
varying float vRevealAlpha;

void main() {
  vColor = aColor;

  float twinkle = sin(uTime * 1.6 + aTwinklePhase) * 0.5 + 0.5;
  vTwinkle = mix(1.0, 0.7 + twinkle * 0.3, uTwinkleAmount);

  float isHovered = (uHoveredIndex >= 0.0 && abs(aIndex - uHoveredIndex) < 0.5) ? 1.0 : 0.0;
  float isSelected = (uSelectedIndex >= 0.0 && abs(aIndex - uSelectedIndex) < 0.5) ? 1.0 : 0.0;
  vHighlight = max(isHovered, isSelected) + isSelected * uSelectionPulse * 0.6;
  vBelowHorizon = (uHorizonCullingEnabled > 0.5 && aAltitude < 0.0) ? 1.0 : 0.0;

  // Fades out over a magnitude band past the cutoff rather than popping
  // instantly, matching the spec's "fade them in smoothly." Must match
  // MAGNITUDE_FADE_WIDTH in scene/exploration.ts (GLSL can't import it).
  float fadeWidth = 0.5;
  float hiddenAmount = smoothstep(uMagnitudeCutoff, uMagnitudeCutoff + fadeWidth, aMagnitude);
  vRevealAlpha = uExplorationEnabled > 0.5 ? (1.0 - hiddenAmount) : 1.0;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float sizeBoost = mix(1.0, 1.8, vHighlight);
  gl_PointSize = aSize * sizeBoost * uPixelRatio * (300.0 / -mvPosition.z);
}
