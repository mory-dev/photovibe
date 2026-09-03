import type { Filter, PixelBuffer } from "./adjustments";

const clamp255 = (value: number) => (value < 0 ? 0 : value > 255 ? 255 : value);

/** Builds a normalised 1D Gaussian kernel for the given radius. */
function gaussianKernel(radius: number): Float32Array {
  const size = radius * 2 + 1;
  const sigma = Math.max(0.5, radius / 2);
  const kernel = new Float32Array(size);
  let sum = 0;
  for (let i = 0; i < size; i += 1) {
    const x = i - radius;
    const value = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel[i] = value;
    sum += value;
  }
  for (let i = 0; i < size; i += 1) kernel[i] /= sum;
  return kernel;
}

/**
 * Separable Gaussian blur: two 1D passes rather than one 2D kernel, which turns
 * an O(r²) convolution into O(r) per pixel.
 *
 * Alpha is blurred alongside the colour channels, and colour is weighted by
 * alpha so transparent pixels do not bleed black into their neighbours.
 */
export function gaussianBlur(radius: number): Filter {
  return (image) => {
    const r = Math.max(0, Math.round(radius));
    if (r === 0) return;

    const { width, height, data } = image;
    const kernel = gaussianKernel(r);
    const temp = new Float32Array(data.length);

    const pass = (
      source: { get: (index: number) => number },
      target: Float32Array,
      horizontal: boolean,
    ) => {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          let sr = 0;
          let sg = 0;
          let sb = 0;
          let sa = 0;
          for (let k = -r; k <= r; k += 1) {
            const sx = horizontal ? Math.min(width - 1, Math.max(0, x + k)) : x;
            const sy = horizontal ? y : Math.min(height - 1, Math.max(0, y + k));
            const offset = (sx + sy * width) * 4;
            const weight = kernel[k + r];
            const alpha = source.get(offset + 3);
            sr += source.get(offset) * alpha * weight;
            sg += source.get(offset + 1) * alpha * weight;
            sb += source.get(offset + 2) * alpha * weight;
            sa += alpha * weight;
          }
          const out = (x + y * width) * 4;
          target[out] = sa > 0 ? sr / sa : 0;
          target[out + 1] = sa > 0 ? sg / sa : 0;
          target[out + 2] = sa > 0 ? sb / sa : 0;
          target[out + 3] = sa;
        }
      }
    };

    pass({ get: (i) => data[i] }, temp, true);
    const second = new Float32Array(data.length);
    pass({ get: (i) => temp[i] }, second, false);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp255(Math.round(second[i]));
      data[i + 1] = clamp255(Math.round(second[i + 1]));
      data[i + 2] = clamp255(Math.round(second[i + 2]));
      data[i + 3] = clamp255(Math.round(second[i + 3]));
    }
  };
}

/**
 * Unsharp mask: blur a copy, then push each pixel away from the blurred value.
 * `amount` is 0..200 as a percentage.
 */
export function sharpen(amount: number, radius = 1): Filter {
  return (image) => {
    const strength = amount / 100;
    if (strength <= 0) return;

    const blurred: PixelBuffer = {
      data: new Uint8ClampedArray(image.data),
      width: image.width,
      height: image.height,
    };
    gaussianBlur(radius)(blurred);

    const { data } = image;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      for (let c = 0; c < 3; c += 1) {
        data[i + c] = clamp255(Math.round(data[i + c] + strength * (data[i + c] - blurred.data[i + c])));
      }
    }
  };
}

/**
 * Darkens towards the corners. `amount` 0..100, `feather` 0..100 controls how
 * far in from the edge the falloff starts.
 */
export function vignette(amount: number, feather = 50): Filter {
  return (image) => {
    const strength = amount / 100;
    if (strength <= 0) return;

    const { width, height, data } = image;
    const cx = width / 2;
    const cy = height / 2;
    const maxDistance = Math.hypot(cx, cy);
    const inner = Math.max(0.01, feather / 100);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const distance = Math.hypot(x - cx, y - cy) / maxDistance;
        const falloff = Math.min(1, Math.max(0, (distance - inner) / (1 - inner)));
        const scale = 1 - strength * falloff * falloff;
        const offset = (x + y * width) * 4;
        data[offset] = clamp255(Math.round(data[offset] * scale));
        data[offset + 1] = clamp255(Math.round(data[offset + 1] * scale));
        data[offset + 2] = clamp255(Math.round(data[offset + 2] * scale));
      }
    }
  };
}

/**
 * Monochrome noise. `seed` keeps a preview stable between renders instead of
 * shimmering on every repaint.
 */
export function noise(amount: number, seed = 1): Filter {
  return (image) => {
    const strength = (amount / 100) * 255;
    if (strength <= 0) return;

    // Small deterministic PRNG; Math.random would re-roll on every preview.
    let state = seed >>> 0 || 1;
    const next = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return ((state >>> 0) / 0xffffffff - 0.5) * 2;
    };

    const { data } = image;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const delta = next() * strength;
      data[i] = clamp255(Math.round(data[i] + delta));
      data[i + 1] = clamp255(Math.round(data[i + 1] + delta));
      data[i + 2] = clamp255(Math.round(data[i + 2] + delta));
    }
  };
}
