export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Transform2D {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export interface Mask {
  enabled: boolean;
  linked: boolean;
  pixelData: ImageBitmap | null;
}

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "softLight"
  | "hardLight"
  | "colorDodge"
  | "colorBurn"
  | "darken"
  | "lighten"
  | "difference"
  | "exclusion"
  | "luminosity";

export const BLEND_MODES: BlendMode[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "softLight",
  "hardLight",
  "colorDodge",
  "colorBurn",
  "darken",
  "lighten",
  "difference",
  "exclusion",
  "luminosity",
];

export type LayerRole = "background" | "image" | "text" | "paint" | "fill";

export interface LayerBase {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
  role?: LayerRole;
}

export interface RasterLayer extends LayerBase {
  kind: "raster";
  transform: Transform2D;
  pixelData: ImageBitmap | null;
  mask: Mask | null;
}

export interface TextLayer extends LayerBase {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  color: Color;
  transform: Transform2D;
}

export type AdjustmentType =
  | "brightnessContrast"
  | "exposure"
  | "hueSaturation"
  | "vibrance"
  | "shadowsHighlights"
  | "curves"
  | "levels"
  | "colorBalance"
  | "photoFilter"
  | "blackAndWhite";

export interface AdjustmentLayer extends LayerBase {
  kind: "adjustment";
  adjustmentType: AdjustmentType;
  params: Record<string, number>;
}

export type Layer = RasterLayer | TextLayer | AdjustmentLayer;

export interface Selection {
  mask: ImageBitmap | null;
  bounds: { x: number; y: number; width: number; height: number } | null;
}

/** Formats a document can be saved as. */
export type ImageFormat = "png" | "jpeg" | "webp";

export const IMAGE_FORMATS: Array<{ id: ImageFormat; label: string; extension: string; alpha: boolean }> = [
  { id: "png", label: "PNG", extension: "png", alpha: true },
  { id: "jpeg", label: "JPEG", extension: "jpg", alpha: false },
  { id: "webp", label: "WebP", extension: "webp", alpha: true },
];

export interface Document {
  id: string;
  name: string;
  width: number;
  height: number;
  dpi: number;
  /** Alpha of 0 means a transparent background. */
  backgroundColor: Color;
  /** Default used by Save As, chosen when the document is created. */
  format: ImageFormat;
  layers: Layer[];
  activeLayerId: string;
  selection: Selection | null;
  filePath?: string;
}

export const DEFAULT_TRANSFORM: Transform2D = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

export const DEFAULT_BACKGROUND: Color = {
  r: 255,
  g: 255,
  b: 255,
  a: 1,
};

export const DEFAULT_DOCUMENT_WIDTH = 1920;
export const DEFAULT_DOCUMENT_HEIGHT = 1080;
