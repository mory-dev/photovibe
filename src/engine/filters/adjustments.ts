import { hsvToRgb, rgbToHsv } from "../../lib/color";

/**
 * The subset of ImageData the filters need. Real ImageData satisfies this
 * structurally, so filters stay free of DOM types and can be unit tested with
 * plain objects.
 */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** A filter mutates its buffer in place. */
export type Filter = (image: PixelBuffer) => void;

const clamp255 = (value: number) => (value < 0 ? 0 : value > 255 ? 255 : value);

/** Applies `fn` to each opaque-ish pixel's RGB channels, leaving alpha alone. */
function eachPixel(image: PixelBuffer, fn: (r: number, g: number, b: number) => [number, number, number]): void {
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = fn(data[i], data[i + 1], data[i + 2]);
    data[i] = clamp255(Math.round(r));
    data[i + 1] = clamp255(Math.round(g));
    data[i + 2] = clamp255(Math.round(b));
  }
}

/**
 * `brightness` and `contrast` are both -100..100. Contrast pivots around mid
 * grey so a value of zero is a no-op.
 */
export function brightnessContrast(brightness: number, contrast: number): Filter {
  const shift = (brightness / 100) * 255;
  const c = contrast / 100;
  const factor = (1.015 * (c + 1)) / (1.015 - c);
  return (image) =>
    eachPixel(image, (r, g, b) => [
      factor * (r + shift - 128) + 128,
      factor * (g + shift - 128) + 128,
      factor * (b + shift - 128) + 128,
    ]);
}

/** Exposure in stops; each stop doubles or halves the linear signal. */
export function exposure(stops: number): Filter {
  const gain = 2 ** stops;
  return (image) => eachPixel(image, (r, g, b) => [r * gain, g * gain, b * gain]);
}

/**
 * `hue` in degrees, `saturation` and `lightness` as -100..100 percentages.
 */
export function hueSaturation(hue: number, saturation: number, lightness: number): Filter {
  const satScale = 1 + saturation / 100;
  const lightScale = 1 + lightness / 100;
  return (image) =>
    eachPixel(image, (r, g, b) => {
      const hsv = rgbToHsv({ r, g, b });
      const next = hsvToRgb({
        h: hsv.h + hue,
        s: Math.min(1, Math.max(0, hsv.s * satScale)),
        v: Math.min(1, Math.max(0, hsv.v * lightScale)),
      });
      return [next.r, next.g, next.b];
    });
}

/**
 * Maps the input range [black, white] onto the full output range, with a gamma
 * curve applied in between. `gamma` above 1 lightens the midtones.
 */
export function levels(black: number, white: number, gamma: number): Filter {
  const span = Math.max(1, white - black);
  const inverseGamma = 1 / Math.max(0.01, gamma);
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i += 1) {
    const normalised = Math.min(1, Math.max(0, (i - black) / span));
    lut[i] = Math.round(255 * normalised ** inverseGamma);
  }
  return (image) => eachPixel(image, (r, g, b) => [lut[r], lut[g], lut[b]]);
}

export function invert(): Filter {
  return (image) => eachPixel(image, (r, g, b) => [255 - r, 255 - g, 255 - b]);
}

export function grayscale(): Filter {
  // Rec. 709 luma, which matches how the eye weights the channels.
  return (image) =>
    eachPixel(image, (r, g, b) => {
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return [y, y, y];
    });
}

export function sepia(): Filter {
  return (image) =>
    eachPixel(image, (r, g, b) => [
      0.393 * r + 0.769 * g + 0.189 * b,
      0.349 * r + 0.686 * g + 0.168 * b,
      0.272 * r + 0.534 * g + 0.131 * b,
    ]);
}
