import type { FilterSpec } from "../../components/FilterDialog";
import { brightnessContrast, exposure, grayscale, hueSaturation, invert, levels, sepia } from "./adjustments";
import { gaussianBlur, noise, sharpen, vignette } from "./effects";

/** Tonal and colour work, listed in the order they appear in the Image menu. */
export const ADJUSTMENTS: FilterSpec[] = [
  {
    name: "Brightness / Contrast",
    params: [
      { key: "brightness", label: "Brightness", min: -100, max: 100, initial: 0 },
      { key: "contrast", label: "Contrast", min: -100, max: 100, initial: 0 },
    ],
    build: (v) => brightnessContrast(v.brightness, v.contrast),
  },
  {
    name: "Exposure",
    params: [{ key: "stops", label: "Stops", min: -3, max: 3, step: 0.1, initial: 0, suffix: " EV" }],
    build: (v) => exposure(v.stops),
  },
  {
    name: "Hue / Saturation",
    params: [
      { key: "hue", label: "Hue", min: -180, max: 180, initial: 0, suffix: "°" },
      { key: "saturation", label: "Saturation", min: -100, max: 100, initial: 0 },
      { key: "lightness", label: "Lightness", min: -100, max: 100, initial: 0 },
    ],
    build: (v) => hueSaturation(v.hue, v.saturation, v.lightness),
  },
  {
    name: "Levels",
    params: [
      { key: "black", label: "Black point", min: 0, max: 254, initial: 0 },
      { key: "white", label: "White point", min: 1, max: 255, initial: 255 },
      { key: "gamma", label: "Gamma", min: 0.1, max: 3, step: 0.1, initial: 1 },
    ],
    build: (v) => levels(v.black, v.white, v.gamma),
  },
  { name: "Invert", params: [], build: () => invert() },
  { name: "Grayscale", params: [], build: () => grayscale() },
  { name: "Sepia", params: [], build: () => sepia() },
];

/** Convolution and texture effects. */
export const EFFECTS: FilterSpec[] = [
  {
    name: "Gaussian Blur",
    params: [{ key: "radius", label: "Radius", min: 0, max: 40, initial: 4, suffix: " px" }],
    build: (v) => gaussianBlur(v.radius),
  },
  {
    name: "Sharpen",
    params: [
      { key: "amount", label: "Amount", min: 0, max: 200, initial: 80, suffix: "%" },
      { key: "radius", label: "Radius", min: 1, max: 10, initial: 1, suffix: " px" },
    ],
    build: (v) => sharpen(v.amount, v.radius),
  },
  {
    name: "Vignette",
    params: [
      { key: "amount", label: "Amount", min: 0, max: 100, initial: 45, suffix: "%" },
      { key: "feather", label: "Feather", min: 0, max: 100, initial: 45, suffix: "%" },
    ],
    build: (v) => vignette(v.amount, v.feather),
  },
  {
    name: "Add Noise",
    params: [{ key: "amount", label: "Amount", min: 0, max: 100, initial: 12, suffix: "%" }],
    build: (v) => noise(v.amount, 1),
  },
];
