import { floodSelect, rectOutline } from "./flood-select";
import { maskContours } from "./mask-contours";
import { lassoBounds, normalizeRect } from "./ops";
import { createMaskCanvas, selectionStore } from "./selection-store";

export function fillRectMask(
  docW: number,
  docH: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const rect = normalizeRect(a, b);
  const mask = createMaskCanvas(docW, docH);
  const ctx = mask.getContext("2d");
  if (!ctx || rect.width < 1 || rect.height < 1) {
    selectionStore.clear();
    return null;
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  selectionStore.setMask(mask, { kind: "rect", ...rect });
  return selectionStore.toDocumentSelection();
}

export function fillLassoMask(docW: number, docH: number, points: Array<{ x: number; y: number }>) {
  if (points.length < 3) {
    selectionStore.clear();
    return null;
  }
  const mask = createMaskCanvas(docW, docH);
  const ctx = mask.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
  ctx.fill();
  selectionStore.setMask(mask, { kind: "lasso", points: points.map((p) => ({ ...p })) });
  return selectionStore.toDocumentSelection();
}

export function fillWandMask(docW: number, docH: number, flatten: ImageData, startX: number, startY: number, tolerance = 40) {
  const result = floodSelect(
    { width: flatten.width, height: flatten.height, data: flatten.data },
    startX,
    startY,
    tolerance,
  );
  const mask = createMaskCanvas(docW, docH);
  const ctx = mask.getContext("2d");
  if (!result || !ctx) {
    selectionStore.clear();
    return null;
  }

  const out = ctx.createImageData(flatten.width, flatten.height);
  for (let i = 0; i < result.mask.length; i += 1) {
    if (!result.mask[i]) continue;
    const o = i * 4;
    out.data[o] = 255;
    out.data[o + 1] = 255;
    out.data[o + 2] = 255;
    out.data[o + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);

  const contours = maskContours(result.mask, flatten.width, flatten.height);
  const points = contours[0] ?? rectOutline(result.bounds);
  selectionStore.setMask(mask, { kind: "wand", points, contours, ...result.bounds });
  return selectionStore.toDocumentSelection();
}

export function flattenDocument(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new ImageData(width, height);
  draw(ctx);
  return ctx.getImageData(0, 0, width, height);
}

export { lassoBounds, normalizeRect };
