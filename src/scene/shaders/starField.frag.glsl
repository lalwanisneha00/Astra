varying vec3 vColor;
varying float vTwinkle;
varying float vHighlight;
varying float vBelowHorizon;
varying float vRevealAlpha;

void main() {
  if (vBelowHorizon > 0.5) {
    discard;
  }

  if (vRevealAlpha <= 0.001) {
    discard;
  }

  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  float edge = mix(0.5, 0.62, vHighlight);
  float alpha = smoothstep(edge, 0.0, dist) * vRevealAlpha;

  if (alpha <= 0.001) {
    discard;
  }

  float brightness = mix(1.0, 1.5, vHighlight);
  gl_FragColor = vec4(vColor * vTwinkle * brightness, alpha);
}
