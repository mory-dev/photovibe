import type { Document, Layer } from "../document/types";
import { pixelStore } from "./pixel-store";

export function resizeDocument(document: Document, width: number, height: number): Document {
  const nextW = Math.max(1, Math.round(width));
  const nextH = Math.max(1, Math.round(height));
  const sx = nextW / document.width;
  const sy = nextH / document.height;

  const layers = document.layers.map((layer) => scaleLayer(layer, sx, sy));
  return { ...document, width: nextW, height: nextH, layers, selection: null };
}

function scaleLayer(layer: Layer, sx: number, sy: number): Layer {
  if (layer.kind === "adjustment") return layer;
  const source = pixelStore.get(layer.id);
  if (source) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * sx));
    canvas.height = Math.max(1, Math.round(source.height * sy));
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    }
    pixelStore.set(layer.id, canvas);
  }
  if (layer.kind === "text") {
    return {
      ...layer,
      fontSize: Math.max(8, Math.round(layer.fontSize * sy)),
      transform: {
        ...layer.transform,
        x: layer.transform.x * sx,
        y: layer.transform.y * sy,
      },
    };
  }
  return {
    ...layer,
    transform: {
      ...layer.transform,
      x: layer.transform.x * sx,
      y: layer.transform.y * sy,
    },
  };
}
