import type { Layer } from "../document/types";
import { selectionGeometry } from "../selections/clip";
import { selectionStore } from "../selections/selection-store";
import { getMutableCanvas } from "./canvas";
import { pixelStore } from "./pixel-store";

/** Bounding box of the active selection in document space, or null. */
function selectionBounds(): { x: number; y: number; width: number; height: number } | null {
  if (!selectionStore.path) return null;
  const geometry = selectionGeometry(selectionStore.path, selectionStore.offsetX, selectionStore.offsetY);
  if (!geometry) return null;

  if (geometry.rect) {
    return {
      x: Math.floor(geometry.rect.x),
      y: Math.floor(geometry.rect.y),
      width: Math.ceil(geometry.rect.width),
      height: Math.ceil(geometry.rect.height),
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of geometry.polygons) {
    for (const point of polygon) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.max(1, Math.ceil(maxX - minX)),
    height: Math.max(1, Math.ceil(maxY - minY)),
  };
}

/**
 * Renders the selected part of a layer into its own canvas, cropped to the
 * selection bounds so the result is the size of the region rather than the
 * whole document. Returns null when nothing is selected.
 */
export function copySelectionRegion(layer: Layer): HTMLCanvasElement | null {
  if (layer.kind === "adjustment" || !selectionStore.mask || !selectionStore.path) return null;
  const bounds = selectionBounds();
  const source = pixelStore.get(layer.id);
  if (!bounds || !source) return null;

  const out = document.createElement("canvas");
  out.width = bounds.width;
  out.height = bounds.height;
  const ctx = out.getContext("2d");
  if (!ctx) return null;

  // Draw the layer positioned so the selection bounds land at the origin, then
  // keep only what the selection mask covers.
  ctx.drawImage(source as CanvasImageSource, layer.transform.x - bounds.x, layer.transform.y - bounds.y);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(selectionStore.mask, selectionStore.offsetX - bounds.x, selectionStore.offsetY - bounds.y);

  return out;
}

/**
 * Clears the selected pixels from a layer. Used by Cut, after the region has
 * been copied.
 */
export function clearSelectionRegion(layer: Layer): boolean {
  if (layer.kind === "adjustment" || !selectionStore.mask) return false;
  const canvas = getMutableCanvas(layer.id);
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return false;

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(
    selectionStore.mask,
    selectionStore.offsetX - layer.transform.x,
    selectionStore.offsetY - layer.transform.y,
  );
  ctx.restore();

  // The compositor caches a texture per layer generation.
  pixelStore.touchLayer(layer.id);
  return true;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
