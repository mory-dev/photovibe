import type { Layer } from "../document/types";
import { getMutableCanvas } from "../pixels/canvas";
import { pixelStore } from "../pixels/pixel-store";
import { selectionGeometry } from "../selections/clip";
import { selectionStore } from "../selections/selection-store";
import { withSelectionClip } from "../selections/clip";
import type { Filter } from "./adjustments";

export interface FilterTarget {
  layer: Exclude<Layer, { kind: "adjustment" }>;
  canvas: HTMLCanvasElement;
  /** Region to process, in layer-canvas coordinates. */
  bounds: { x: number; y: number; width: number; height: number };
  /** Pixels as they were before any preview, for restore. */
  original: ImageData;
}

/**
 * Captures what a filter will operate on: the whole layer, or just the part
 * covered by the active selection. Returning the untouched pixels lets a
 * preview be applied and rolled back repeatedly without stacking up.
 */
export function beginFilter(layer: Layer): FilterTarget | null {
  if (layer.kind === "adjustment") return null;
  const canvas = getMutableCanvas(layer.id);
  const ctx = canvas?.getContext("2d", { willReadFrequently: true });
  if (!canvas || !ctx) return null;

  const bounds = selectionBoundsInLayer(layer) ?? { x: 0, y: 0, width: canvas.width, height: canvas.height };
  if (bounds.width <= 0 || bounds.height <= 0) return null;

  return { layer, canvas, bounds, original: ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height) };
}

/** Runs `filter` over the captured region, always starting from the original. */
export function previewFilter(target: FilterTarget, filter: Filter): void {
  const ctx = target.canvas.getContext("2d");
  if (!ctx) return;

  const working = new ImageData(
    new Uint8ClampedArray(target.original.data),
    target.original.width,
    target.original.height,
  );
  filter(working);

  // putImageData ignores clip regions, so the result goes through a scratch
  // canvas and is drawn back inside the selection clip instead.
  const scratch = document.createElement("canvas");
  scratch.width = working.width;
  scratch.height = working.height;
  scratch.getContext("2d")?.putImageData(working, 0, 0);

  withSelectionClip(ctx, target.layer.transform, (out) => {
    out.clearRect(target.bounds.x, target.bounds.y, target.bounds.width, target.bounds.height);
    out.drawImage(scratch, target.bounds.x, target.bounds.y);
  });

  pixelStore.touchLayer(target.layer.id);
}

/** Puts the captured pixels back, discarding any preview. */
export function revertFilter(target: FilterTarget): void {
  const ctx = target.canvas.getContext("2d");
  if (!ctx) return;
  ctx.putImageData(target.original, target.bounds.x, target.bounds.y);
  pixelStore.touchLayer(target.layer.id);
}

/** Selection bounds converted into the layer canvas coordinate space. */
function selectionBoundsInLayer(layer: Layer): { x: number; y: number; width: number; height: number } | null {
  if (layer.kind === "adjustment" || !selectionStore.mask || !selectionStore.path) return null;

  const geometry = selectionGeometry(
    selectionStore.path,
    selectionStore.offsetX - layer.transform.x,
    selectionStore.offsetY - layer.transform.y,
  );
  if (!geometry) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (geometry.rect) {
    minX = geometry.rect.x;
    minY = geometry.rect.y;
    maxX = geometry.rect.x + geometry.rect.width;
    maxY = geometry.rect.y + geometry.rect.height;
  }
  for (const polygon of geometry.polygons) {
    for (const point of polygon) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  if (!Number.isFinite(minX)) return null;

  const canvas = pixelStore.get(layer.id);
  const width = canvas && "width" in canvas ? canvas.width : 0;
  const height = canvas && "height" in canvas ? canvas.height : 0;

  const x = Math.max(0, Math.floor(minX));
  const y = Math.max(0, Math.floor(minY));
  return {
    x,
    y,
    width: Math.min(width - x, Math.ceil(maxX) - x),
    height: Math.min(height - y, Math.ceil(maxY) - y),
  };
}
