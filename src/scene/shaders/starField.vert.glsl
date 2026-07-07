uniform float uTime;
uniform float uPixelRatio;
uniform float uTwinkleAmount;

attribute float aSize;
attribute float aTwinklePhase;
attribute vec3 aColor;

varying vec3 vColor;
varying float vTwinkle;

void main() {
  vColor = aColor;

  float twinkle = sin(uTime * 1.6 + aTwinklePhase) * 0.5 + 0.5;
  vTwinkle = mix(1.0, 0.7 + twinkle * 0.3, uTwinkleAmount);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
}
