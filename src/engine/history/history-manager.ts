import type { Document, Layer } from "../document/types";
import { cloneTextureSource, pixelStore, type TextureSource } from "../pixels/pixel-store";
import { selectionStore, type SelectionPath } from "../selections/selection-store";

const MAX_STEPS = 50;
const COALESCE_MS = 600;

export interface PixelSnapshot {
  [layerId: string]: { width: number; height: number; data: Uint8ClampedArray };
}

export interface CanvasSnapshot {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface SelectionSnapshot {
  mask: CanvasSnapshot | null;
  path: SelectionPath | null;
  offsetX: number;
  offsetY: number;
  floating: CanvasSnapshot | null;
  floatX: number;
  floatY: number;
}

export interface HistoryEntry {
  label: string;
  coalesceKey?: string;
  document: Document;
  pixels: PixelSnapshot;
  selection?: SelectionSnapshot;
}

function stripPixels(layer: Layer): Layer {
  if (layer.kind === "raster") {
    return {
      ...layer,
      pixelData: null,
      mask: layer.mask ? { ...layer.mask, pixelData: null } : null,
    };
  }
  return { ...layer };
}

export function cloneDocument(document: Document): Document {
  return {
    ...document,
    backgroundColor: { ...document.backgroundColor },
    selection: document.selection
      ? { ...document.selection, mask: null, bounds: document.selection.bounds ? { ...document.selection.bounds } : null }
      : null,
    filePath: document.filePath,
    layers: document.layers.map((layer) => {
      const cloned = stripPixels(layer);
      if (cloned.kind !== "adjustment") {
        return { ...cloned, transform: { ...cloned.transform } };
      }
      return { ...cloned, params: { ...cloned.params } };
    }),
  };
}

export function capturePixels(): PixelSnapshot {
  const snapshot: PixelSnapshot = {};
  for (const [id, source] of pixelStore.entries()) {
    snapshot[id] = sourceToImageData(source);
  }
  return snapshot;
}

export function restorePixels(snapshot: PixelSnapshot): void {
  pixelStore.replaceAll(
    Object.fromEntries(
      Object.entries(snapshot).map(([id, data]) => [id, imageDataToCanvas(data)]),
    ),
  );
}

function sourceToImageData(source: TextureSource): { width: number; height: number; data: Uint8ClampedArray } {
  if (source instanceof ImageData) {
    return { width: source.width, height: source.height, data: new Uint8ClampedArray(source.data) };
  }
  const canvas = cloneTextureSource(source);
  const ctx = canvas.getContext("2d");
  const image = ctx?.getImageData(0, 0, canvas.width, canvas.height);
  if (!image) {
    return { width: canvas.width, height: canvas.height, data: new Uint8ClampedArray(canvas.width * canvas.height * 4) };
  }
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
}

function imageDataToCanvas(data: { width: number; height: number; data: Uint8ClampedArray }): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext("2d");
  ctx?.putImageData(new ImageData(new Uint8ClampedArray(data.data), data.width, data.height), 0, 0);
  return canvas;
}

function canvasToSnapshot(canvas: HTMLCanvasElement | null): CanvasSnapshot | null {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  const image = ctx?.getImageData(0, 0, canvas.width, canvas.height);
  if (!image) return { width: canvas.width, height: canvas.height, data: new Uint8ClampedArray(canvas.width * canvas.height * 4) };
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
}

export function captureSelection(): SelectionSnapshot {
  return {
    mask: canvasToSnapshot(selectionStore.mask),
    path: selectionStore.path ? structuredClone(selectionStore.path) : null,
    offsetX: selectionStore.offsetX,
    offsetY: selectionStore.offsetY,
    floating: canvasToSnapshot(selectionStore.floating),
    floatX: selectionStore.floatX,
    floatY: selectionStore.floatY,
  };
}

export function restoreSelection(snapshot: SelectionSnapshot | undefined): void {
  if (!snapshot?.mask) {
    selectionStore.clear();
    return;
  }
  const mask = imageDataToCanvas(snapshot.mask);
  selectionStore.setMask(mask, snapshot.path ?? { kind: "wand", points: [], x: 0, y: 0, width: mask.width, height: mask.height });
  selectionStore.offsetX = snapshot.offsetX;
  selectionStore.offsetY = snapshot.offsetY;
  selectionStore.floating = snapshot.floating ? imageDataToCanvas(snapshot.floating) : null;
  selectionStore.floatX = snapshot.floatX;
  selectionStore.floatY = snapshot.floatY;
  selectionStore.bump();
}

export function captureEntry(label: string, document: Document, coalesceKey?: string): HistoryEntry {
  return {
    label,
    coalesceKey,
    document: cloneDocument(document),
    pixels: capturePixels(),
    selection: captureSelection(),
  };
}

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private lastAt = 0;

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoLabel(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.label;
  }

  get redoLabel(): string | undefined {
    return this.redoStack[this.redoStack.length - 1]?.label;
  }

  record(entry: HistoryEntry): void {
    const now = Date.now();
    const last = this.undoStack[this.undoStack.length - 1];
    if (
      entry.coalesceKey &&
      last?.coalesceKey === entry.coalesceKey &&
      now - this.lastAt < COALESCE_MS
    ) {
      this.lastAt = now;
      this.redoStack = [];
      return;
    }

    this.undoStack.push(entry);
    if (this.undoStack.length > MAX_STEPS) this.undoStack.shift();
    this.redoStack = [];
    this.lastAt = now;
  }

  undo(current: HistoryEntry): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    // The redo step is the action being undone, so it carries that name rather
    // than the placeholder the caller passes for the current state.
    this.redoStack.push({ ...current, label: entry.label });
    this.lastAt = 0;
    return entry;
  }

  redo(current: HistoryEntry): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push({ ...current, label: entry.label });
    this.lastAt = 0;
    return entry;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.lastAt = 0;
  }
}
