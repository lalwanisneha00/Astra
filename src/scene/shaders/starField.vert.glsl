uniform float uTime;
uniform float uPixelRatio;
uniform float uTwinkleAmount;
// -1 means "nothing hovered"; otherwise the hovered star's own aIndex.
uniform float uHoveredIndex;
// 0 = explore mode, ignore aAltitude entirely; 1 = observer mode, hide
// stars below the horizon. Toggling this is cheap (one uniform), unlike
// rebuilding the star buffers on every horizon recompute.
uniform float uHorizonCullingEnabled;

attribute float aSize;
attribute float aTwinklePhase;
attribute vec3 aColor;
attribute float aIndex;
// Current altitude in degrees, updated in place (bufferAttribute.needsUpdate)
// whenever useHorizonCulling's worker returns a new result — never
// requires rebuilding the geometry itself.
attribute float aAltitude;

varying vec3 vColor;
varying float vTwinkle;
varying float vHighlight;
varying float vBelowHorizon;

void main() {
  vColor = aColor;

  float twinkle = sin(uTime * 1.6 + aTwinklePhase) * 0.5 + 0.5;
  vTwinkle = mix(1.0, 0.7 + twinkle * 0.3, uTwinkleAmount);

  vHighlight = (uHoveredIndex >= 0.0 && abs(aIndex - uHoveredIndex) < 0.5) ? 1.0 : 0.0;
  vBelowHorizon = (uHorizonCullingEnabled > 0.5 && aAltitude < 0.0) ? 1.0 : 0.0;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float sizeBoost = mix(1.0, 1.8, vHighlight);
  gl_PointSize = aSize * sizeBoost * uPixelRatio * (300.0 / -mvPosition.z);
}
