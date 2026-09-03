import type { Document, Layer } from "../document/types";
import { DEFAULT_TRANSFORM } from "../document/types";
import { getMutableCanvas } from "./canvas";
import { pixelStore } from "./pixel-store";

export function cropDocument(
  document: Document,
  bounds: { x: number; y: number; width: number; height: number },
): Document {
  const x = Math.max(0, Math.round(bounds.x));
  const y = Math.max(0, Math.round(bounds.y));
  const width = Math.max(1, Math.min(document.width - x, Math.round(bounds.width)));
  const height = Math.max(1, Math.min(document.height - y, Math.round(bounds.height)));

  const layers = document.layers.map((layer) => cropLayer(layer, x, y, width, height));

  return {
    ...document,
    width,
    height,
    layers,
    selection: null,
  };
}

function cropLayer(layer: Layer, x: number, y: number, width: number, height: number): Layer {
  if (layer.kind === "adjustment") return layer;
  const source = getMutableCanvas(layer.id);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (source && ctx) {
    ctx.drawImage(source, layer.transform.x - x, layer.transform.y - y);
  }
  pixelStore.set(layer.id, canvas);
  return {
    ...layer,
    transform: { ...DEFAULT_TRANSFORM },
  };
}
