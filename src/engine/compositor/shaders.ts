export const COMPOSITE_VERT = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;
uniform vec2 u_resolution;
uniform vec4 u_rect;

void main() {
  vec2 pixel = u_rect.xy + a_pos * u_rect.zw;
  vec2 clip = vec2(
    (pixel.x / u_resolution.x) * 2.0 - 1.0,
    1.0 - (pixel.y / u_resolution.y) * 2.0
  );
  gl_Position = vec4(clip, 0.0, 1.0);
  v_uv = a_uv;
}
`;

export const COMPOSITE_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_dst;
uniform sampler2D u_src;
uniform sampler2D u_mask;
uniform vec2 u_resolution;
uniform float u_opacity;
uniform int u_blendMode;
uniform int u_hasMask;
uniform vec2 u_srcSize;
uniform vec4 u_rect;
uniform vec4 u_srcRect;

const int NORMAL = 0;
const int MULTIPLY = 1;
const int SCREEN = 2;
const int OVERLAY = 3;
const int SOFT_LIGHT = 4;
const int HARD_LIGHT = 5;
const int COLOR_DODGE = 6;
const int COLOR_BURN = 7;
const int DARKEN = 8;
const int LIGHTEN = 9;
const int DIFFERENCE = 10;
const int EXCLUSION = 11;
const int LUMINOSITY = 12;

float luma(vec3 c) {
  return dot(c, vec3(0.3, 0.59, 0.11));
}

vec3 overlayChannel(vec3 s, vec3 d) {
  return mix(2.0 * s * d, 1.0 - 2.0 * (1.0 - s) * (1.0 - d), step(0.5, d));
}

vec3 softLight(vec3 s, vec3 d) {
  vec3 low = d - (1.0 - 2.0 * s) * d * (1.0 - d);
  vec3 high = d + (2.0 * s - 1.0) * (sqrt(d) - d);
  return mix(low, high, step(0.5, s));
}

vec3 hardLight(vec3 s, vec3 d) {
  return overlayChannel(d, s);
}

vec3 colorDodge(vec3 s, vec3 d) {
  vec3 safe = 1.0 - step(0.999, s);
  return mix(vec3(1.0), min(vec3(1.0), d / max(1.0 - s, vec3(0.0001))), safe);
}

vec3 colorBurn(vec3 s, vec3 d) {
  vec3 safe = step(0.001, s);
  return mix(vec3(0.0), 1.0 - min(vec3(1.0), (1.0 - d) / max(s, vec3(0.0001))), safe);
}

vec3 blend(vec3 s, vec3 d, int mode) {
  if (mode == MULTIPLY) return s * d;
  if (mode == SCREEN) return 1.0 - (1.0 - s) * (1.0 - d);
  if (mode == OVERLAY) return overlayChannel(s, d);
  if (mode == SOFT_LIGHT) return softLight(s, d);
  if (mode == HARD_LIGHT) return hardLight(s, d);
  if (mode == COLOR_DODGE) return colorDodge(s, d);
  if (mode == COLOR_BURN) return colorBurn(s, d);
  if (mode == DARKEN) return min(s, d);
  if (mode == LIGHTEN) return max(s, d);
  if (mode == DIFFERENCE) return abs(d - s);
  if (mode == EXCLUSION) return d + s - 2.0 * d * s;
  if (mode == LUMINOSITY) return d + (luma(s) - luma(d));
  return s;
}

void main() {
  vec2 dstUv = (u_rect.xy + v_uv * u_rect.zw) / u_resolution;
  vec4 dst = texture(u_dst, vec2(dstUv.x, 1.0 - dstUv.y));
  vec2 pixel = u_rect.xy + v_uv * u_rect.zw;
  vec2 srcUv = (pixel - u_srcRect.xy) / max(u_srcRect.zw, vec2(0.0001));
  if (srcUv.x < 0.0 || srcUv.y < 0.0 || srcUv.x > 1.0 || srcUv.y > 1.0) {
    outColor = dst;
    return;
  }
  vec4 src = texture(u_src, srcUv);
  float mask = u_hasMask == 1 ? texture(u_mask, srcUv).r : 1.0;
  float as = clamp(src.a * u_opacity * mask, 0.0, 1.0);
  float ad = dst.a;
  vec3 B = blend(src.rgb, dst.rgb, u_blendMode);
  vec3 rgb = (1.0 - as) * dst.rgb + as * ((1.0 - ad) * src.rgb + ad * B);
  float a = as + ad * (1.0 - as);
  outColor = vec4(rgb, a);
}
`;

export const PRESENT_VERT = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_pos.x * 2.0 - 1.0, 1.0 - a_pos.y * 2.0, 0.0, 1.0);
  v_uv = a_uv;
}
`;

export const PRESENT_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec4 u_docRect;
uniform vec2 u_checkerSize;
uniform int u_pixelated;

void main() {
  vec2 pixel = v_uv * u_resolution;
  vec2 local = pixel - u_docRect.xy;

  if (local.x < 0.0 || local.y < 0.0 || local.x >= u_docRect.z || local.y >= u_docRect.w) {
    outColor = vec4(0.086, 0.086, 0.086, 1.0);
    return;
  }

  float cell = step(0.5, mod(floor(local.x / u_checkerSize.x) + floor(local.y / u_checkerSize.y), 2.0));
  vec3 checker = mix(vec3(0.149), vec3(0.180), cell);

  vec2 docUv = local / u_docRect.zw;
  vec4 image = texture(u_image, vec2(docUv.x, 1.0 - docUv.y));
  outColor = vec4(mix(checker, image.rgb, image.a), 1.0);
}
`;

export const BLEND_MODE_INDEX = {
  normal: 0,
  multiply: 1,
  screen: 2,
  overlay: 3,
  softLight: 4,
  hardLight: 5,
  colorDodge: 6,
  colorBurn: 7,
  darken: 8,
  lighten: 9,
  difference: 10,
  exclusion: 11,
  luminosity: 12,
} as const;
