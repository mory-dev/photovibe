import { generateId } from "../../lib/utils";
import type { Color, Document, RasterLayer, TextLayer } from "./types";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_DOCUMENT_HEIGHT,
  DEFAULT_DOCUMENT_WIDTH,
  DEFAULT_TRANSFORM,
} from "./types";

export function createRasterLayer(name: string, overrides?: Partial<RasterLayer>): RasterLayer {
  return {
    kind: "raster",
    id: generateId("layer"),
    name,
    visible: true,
    opacity: 1,
    blendMode: "normal",
    locked: false,
    role: "image",
    transform: { ...DEFAULT_TRANSFORM },
    pixelData: null,
    mask: null,
    ...overrides,
  };
}

export function createBackgroundLayer(_width: number, _height: number, _color: Color): RasterLayer {
  return createRasterLayer("Background", {
    locked: true,
    role: "background",
    transform: { ...DEFAULT_TRANSFORM },
    pixelData: null,
  });
}

export function createTextLayer(name = "Text", overrides?: Partial<TextLayer>): TextLayer {
  return {
    kind: "text",
    id: generateId("layer"),
    name,
    visible: true,
    opacity: 1,
    blendMode: "normal",
    locked: false,
    role: "text",
    text: "Text",
    fontFamily: "Segoe UI",
    fontSize: 48,
    color: { r: 0, g: 0, b: 0, a: 1 },
    transform: { ...DEFAULT_TRANSFORM },
    ...overrides,
  };
}

export function createBlankDocument(
  width = DEFAULT_DOCUMENT_WIDTH,
  height = DEFAULT_DOCUMENT_HEIGHT,
  backgroundColor: Color = DEFAULT_BACKGROUND,
): Document {
  const backgroundLayer = createBackgroundLayer(width, height, backgroundColor);

  return {
    id: generateId("doc"),
    name: "Untitled",
    width,
    height,
    dpi: 72,
    backgroundColor,
    layers: [backgroundLayer],
    activeLayerId: backgroundLayer.id,
    selection: null,
  };
}

export function createDocumentFromImage(bitmap: ImageBitmap, name = "Untitled"): Document {
  const imageLayer = createRasterLayer("Layer 1", {
    pixelData: bitmap,
    transform: { ...DEFAULT_TRANSFORM },
  });

  return {
    id: generateId("doc"),
    name,
    width: bitmap.width,
    height: bitmap.height,
    dpi: 72,
    backgroundColor: { r: 255, g: 255, b: 255, a: 0 },
    layers: [imageLayer],
    activeLayerId: imageLayer.id,
    selection: null,
  };
}
