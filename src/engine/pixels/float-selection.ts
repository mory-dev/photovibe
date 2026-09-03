import type { Layer } from "../document/types";
import { getMutableCanvas } from "./canvas";
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

  fctx.drawImage(source, layer.transform.x, layer.transform.y);
  fctx.globalCompositeOperation = "destination-in";
  fctx.drawImage(mask, 0, 0);

  sctx.save();
  sctx.globalCompositeOperation = "destination-out";
  sctx.translate(-layer.transform.x, -layer.transform.y);
  sctx.drawImage(mask, 0, 0);
  sctx.restore();

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
  if (selectionStore.mask) {
    const moved = document.createElement("canvas");
    moved.width = selectionStore.mask.width;
    moved.height = selectionStore.mask.height;
    moved.getContext("2d")?.drawImage(selectionStore.mask, selectionStore.floatX, selectionStore.floatY);
    selectionStore.mask = moved;
  }
  selectionStore.offsetX += selectionStore.floatX;
  selectionStore.offsetY += selectionStore.floatY;
  selectionStore.floating = null;
  selectionStore.floatX = 0;
  selectionStore.floatY = 0;
  selectionStore.bump();
}
