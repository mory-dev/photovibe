import type { Document, Layer, Transform2D } from "../document/types";
import { cloneTextureSource, pixelStore, type TextureSource } from "./pixel-store";

export type FlipDirection = "horizontal" | "vertical";

/**
 * Mirrors a layer's top-left transform around the document edge while keeping
 * its displayed size and scale unchanged.
 */
export function mirrorTransform(
  transform: Transform2D,
  documentWidth: number,
  documentHeight: number,
  layerWidth: number,
  layerHeight: number,
  direction: FlipDirection,
): Transform2D {
  return {
    ...transform,
    x: direction === "horizontal"
      ? documentWidth - transform.x - layerWidth * transform.scaleX
      : transform.x,
    y: direction === "vertical"
      ? documentHeight - transform.y - layerHeight * transform.scaleY
      : transform.y,
  };
}

/** Creates a same-sized canvas with the source pixels mirrored on one axis. */
export function flipCanvas(source: TextureSource, direction: FlipDirection): HTMLCanvasElement {
  const sourceCanvas = cloneTextureSource(source);
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(direction === "horizontal" ? canvas.width : 0, direction === "vertical" ? canvas.height : 0);
  ctx.scale(direction === "horizontal" ? -1 : 1, direction === "vertical" ? -1 : 1);
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.restore();
  return canvas;
}

function sourceForLayer(layer: Layer): TextureSource | undefined {
  if (layer.kind === "raster") return pixelStore.get(layer.id) ?? layer.pixelData ?? undefined;
  if (layer.kind === "text") return pixelStore.get(layer.id);
  return undefined;
}

/** Mirrors all pixel-backed layers and repositions them in document space. */
export function flipDocument(document: Document, direction: FlipDirection): Document {
  const layers = document.layers.map((layer) => {
    const source = sourceForLayer(layer);
    if (!source || layer.kind === "adjustment") return layer;

    const flipped = flipCanvas(source, direction);
    pixelStore.set(layer.id, flipped);
    // set() currently invalidates too, but keep this explicit: the compositor
    // must never reuse the texture generated from the old canvas.
    pixelStore.touchLayer(layer.id);

    return {
      ...layer,
      transform: mirrorTransform(
        layer.transform,
        document.width,
        document.height,
        flipped.width,
        flipped.height,
        direction,
      ),
    };
  });

  return { ...document, layers };
}
