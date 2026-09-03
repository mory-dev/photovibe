import type { Transform2D } from "../document/types";
import { selectionStore, type SelectionPath } from "./selection-store";

export interface Point {
  x: number;
  y: number;
}

export interface SelectionGeometry {
  rect: { x: number; y: number; width: number; height: number } | null;
  polygons: Point[][];
}

/**
 * Reduces a selection to plain geometry, shifted by `ox`/`oy`. Selections live
 * in document space while layer canvases are offset by the layer transform, so
 * callers fold both offsets into those arguments.
 *
 * Returns null when the selection encloses nothing — a rectangle with no area,
 * a lasso of fewer than three points, or a wand result with no usable contour.
 * That is an empty region, which is different from having no selection at all.
 *
 * Kept free of DOM types so it can be unit tested; `selectionPath2D` turns the
 * result into a canvas path.
 */
export function selectionGeometry(path: SelectionPath, ox: number, oy: number): SelectionGeometry | null {
  if (path.kind === "rect") {
    if (path.width <= 0 || path.height <= 0) return null;
    return {
      rect: { x: path.x + ox, y: path.y + oy, width: path.width, height: path.height },
      polygons: [],
    };
  }

  if (path.kind === "lasso") {
    if (path.points.length < 3) return null;
    return { rect: null, polygons: [shift(path.points, ox, oy)] };
  }

  // The wand traces one or more contours. Each becomes its own polygon so holes
  // punched out of the region are respected by the even-odd fill rule.
  const contours = path.contours?.length ? path.contours : [path.points];
  const polygons = contours.filter((contour) => contour.length >= 3).map((contour) => shift(contour, ox, oy));
  return polygons.length ? { rect: null, polygons } : null;
}

function shift(points: Point[], ox: number, oy: number): Point[] {
  return points.map((point) => ({ x: point.x + ox, y: point.y + oy }));
}

export function selectionPath2D(path: SelectionPath, ox: number, oy: number): Path2D | null {
  const geometry = selectionGeometry(path, ox, oy);
  if (!geometry) return null;

  const out = new Path2D();
  if (geometry.rect) {
    out.rect(geometry.rect.x, geometry.rect.y, geometry.rect.width, geometry.rect.height);
  }
  for (const polygon of geometry.polygons) {
    out.moveTo(polygon[0].x, polygon[0].y);
    for (const point of polygon.slice(1)) out.lineTo(point.x, point.y);
    out.closePath();
  }
  return out;
}

/**
 * Restricts drawing on a layer canvas to the active selection, then runs
 * `draw`. With no selection the callback runs unclipped, so callers never have
 * to branch on whether one exists.
 *
 * Clipping uses the canvas clip region rather than compositing through the
 * mask, which keeps it correct for `destination-out` operations like the
 * eraser.
 */
export function withSelectionClip(
  ctx: CanvasRenderingContext2D,
  transform: Transform2D,
  draw: (target: CanvasRenderingContext2D) => void,
): void {
  if (!selectionStore.mask || !selectionStore.path) {
    draw(ctx);
    return;
  }

  const path = selectionPath2D(
    selectionStore.path,
    selectionStore.offsetX - transform.x,
    selectionStore.offsetY - transform.y,
  );
  // A selection that exists but encloses nothing clips everything away.
  if (!path) return;

  ctx.save();
  ctx.clip(path, "evenodd");
  draw(ctx);
  ctx.restore();
}
