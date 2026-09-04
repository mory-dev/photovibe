import type { Selection } from "../document/types";
import { flipCanvas, type FlipDirection } from "../pixels/flip";

export type SelectionPath =
  | { kind: "rect"; x: number; y: number; width: number; height: number }
  | { kind: "lasso"; points: Array<{ x: number; y: number }> }
  | {
      kind: "wand";
      points: Array<{ x: number; y: number }>;
      contours?: Array<Array<{ x: number; y: number }>>;
      x: number;
      y: number;
      width: number;
      height: number;
    };

class SelectionStore {
  mask: HTMLCanvasElement | null = null;
  path: SelectionPath | null = null;
  offsetX = 0;
  offsetY = 0;
  floating: HTMLCanvasElement | null = null;
  floatX = 0;
  floatY = 0;
  private generation = 0;
  private listeners = new Set<() => void>();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getGeneration() {
    return this.generation;
  }

  bump() {
    this.generation += 1;
    for (const listener of this.listeners) listener();
  }

  clear() {
    this.mask = null;
    this.path = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.floating = null;
    this.floatX = 0;
    this.floatY = 0;
    this.bump();
  }

  setMask(mask: HTMLCanvasElement, path: SelectionPath) {
    this.mask = mask;
    this.path = path;
    this.offsetX = 0;
    this.offsetY = 0;
    this.floating = null;
    this.bump();
  }

  /** Mirrors the active mask and its document-space position. */
  flip(direction: FlipDirection, documentWidth: number, documentHeight: number): void {
    if (!this.mask) return;

    const mask = this.mask;
    this.mask = flipCanvas(mask, direction);
    this.path = this.path ? mirrorSelectionPath(this.path, mask.width, mask.height, direction) : null;

    if (direction === "horizontal") {
      this.offsetX = documentWidth - this.offsetX - mask.width;
      this.floatX = -this.floatX;
    } else {
      this.offsetY = documentHeight - this.offsetY - mask.height;
      this.floatY = -this.floatY;
    }

    if (this.floating) this.floating = flipCanvas(this.floating, direction);
    this.bump();
  }

  toDocumentSelection(): Selection | null {
    if (!this.mask) return null;
    return { mask: null, bounds: maskBounds(this.mask, this.offsetX, this.offsetY) };
  }

  hitTest(docX: number, docY: number): boolean {
    if (!this.mask) return false;
    const x = Math.floor(docX - this.offsetX);
    const y = Math.floor(docY - this.offsetY);
    if (x < 0 || y < 0 || x >= this.mask.width || y >= this.mask.height) return false;
    const ctx = this.mask.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    return ctx.getImageData(x, y, 1, 1).data[3] > 10;
  }
}

export function mirrorSelectionPath(
  path: SelectionPath,
  width: number,
  height: number,
  direction: FlipDirection,
): SelectionPath {
  const mirrorPoints = (points: Array<{ x: number; y: number }>) =>
    points.map((point) => ({
      x: direction === "horizontal" ? width - point.x : point.x,
      y: direction === "vertical" ? height - point.y : point.y,
    }));

  if (path.kind === "rect") {
    return {
      ...path,
      x: direction === "horizontal" ? width - path.x - path.width : path.x,
      y: direction === "vertical" ? height - path.y - path.height : path.y,
    };
  }

  if (path.kind === "lasso") {
    return { ...path, points: mirrorPoints(path.points) };
  }

  return {
    ...path,
    points: mirrorPoints(path.points),
    contours: path.contours?.map(mirrorPoints),
    x: direction === "horizontal" ? width - path.x - path.width : path.x,
    y: direction === "vertical" ? height - path.y - path.height : path.y,
  };
}

export function createMaskCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function maskBounds(mask: HTMLCanvasElement, ox = 0, oy = 0) {
  return { x: ox, y: oy, width: mask.width, height: mask.height };
}

export const selectionStore = new SelectionStore();
