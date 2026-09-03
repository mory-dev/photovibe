import type { Selection } from "../document/types";

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
