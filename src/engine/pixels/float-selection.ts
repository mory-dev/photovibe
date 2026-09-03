import type { Layer } from "../document/types";
import { getMutableCanvas } from "./canvas";
import { pixelStore } from "./pixel-store";
import { selectionStore } from "../selections/selection-store";

export function extractFloatingSelection(layer: Layer): boolean {
  if (!selectionStore.mask || layer.kind === "adjustment") return false;
  const source = getMutableCanvas(layer.id);
  const mask = selectionStore.mask;
  if (!source) return false;

  const floating = document.createElement("canvas");
  floating.width = mask.width;
  floating.height = mask.height;
  const fctx = floating.getContext("2d");
  const sctx = source.getContext("2d");
  if (!fctx || !sctx) return false;

  // The mask bitmap always sits at the document origin; where the selection
  // actually is comes from the store offset. Every other consumer - the paint
  // clip, copy, cut, the hit test - reads it that way, so this must too.
  const ox = selectionStore.offsetX;
  const oy = selectionStore.offsetY;

  fctx.drawImage(source, layer.transform.x, layer.transform.y);
  fctx.globalCompositeOperation = "destination-in";
  fctx.drawImage(mask, ox, oy);

  sctx.save();
  sctx.globalCompositeOperation = "destination-out";
  sctx.translate(-layer.transform.x, -layer.transform.y);
  sctx.drawImage(mask, ox, oy);
  sctx.restore();

  // The compositor caches a GPU texture per layer generation, so mutating the
  // canvas in place is invisible until the layer is explicitly invalidated.
  pixelStore.touchLayer(layer.id);

  selectionStore.floating = floating;
  selectionStore.floatX = 0;
  selectionStore.floatY = 0;
  selectionStore.bump();
  return true;
}

export function stampFloatingSelection(layer: Layer): void {
  if (!selectionStore.floating || layer.kind === "adjustment") return;
  const source = getMutableCanvas(layer.id);
  const ctx = source?.getContext("2d");
  if (!source || !ctx) return;
  ctx.drawImage(
    selectionStore.floating,
    selectionStore.floatX - layer.transform.x,
    selectionStore.floatY - layer.transform.y,
  );
  pixelStore.touchLayer(layer.id);
  // Only the offset moves. Translating the mask bitmap as well shifted the
  // selection twice, which left the hit test disagreeing with the marching
  // ants after a move.
  selectionStore.offsetX += selectionStore.floatX;
  selectionStore.offsetY += selectionStore.floatY;
  selectionStore.floating = null;
  selectionStore.floatX = 0;
  selectionStore.floatY = 0;
  selectionStore.bump();
}
