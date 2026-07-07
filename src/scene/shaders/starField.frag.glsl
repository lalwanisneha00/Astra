varying vec3 vColor;
varying float vTwinkle;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  float alpha = smoothstep(0.5, 0.0, dist);

  if (alpha <= 0.001) {
    discard;
  }

  gl_FragColor = vec4(vColor * vTwinkle, alpha);
}
