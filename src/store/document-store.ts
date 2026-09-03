import { create } from "zustand";
import { createRasterLayer, createTextLayer } from "../engine/document/factories";
import * as layerOps from "../engine/document/layer-ops";
import type { BlendMode, Color, Document, ImageFormat, Layer, Selection, Transform2D } from "../engine/document/types";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_DOCUMENT_HEIGHT,
  DEFAULT_DOCUMENT_WIDTH,
  DEFAULT_TRANSFORM,
  IMAGE_FORMATS,
} from "../engine/document/types";
import {
  captureEntry,
  cloneDocument,
  HistoryManager,
  restorePixels,
  restoreSelection,
  type HistoryEntry,
} from "../engine/history/history-manager";
import { cropDocument } from "../engine/pixels/crop";
import { fillRectMask } from "../engine/selections/create-mask";
import {
  assignLayerPixels,
  canvasFromFile,
  createSoftCircleCanvas,
  createSolidCanvas,
  createTransparentCanvas,
  rasterizeText,
} from "../engine/pixels/generate";
import { flattenToBytes } from "../engine/pixels/export-flat";
import { resizeDocument } from "../engine/pixels/resize";
import { pickSavePath, saveBytes } from "../lib/native";
import { selectionStore } from "../engine/selections/selection-store";
import { pixelStore } from "../engine/pixels/pixel-store";
import { generateId } from "../lib/utils";

const SAMPLE_OVERLAY: Color = { r: 196, g: 165, b: 116, a: 0.92 };
const history = new HistoryManager();

interface DocumentStore {
  document: Document | null;
  dirty: boolean;
  historyVersion: number;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;
  initBlankDocument: () => void;
  newDocument: (options?: { width?: number; height?: number; backgroundColor?: Color; format?: ImageFormat; image?: Blob; name?: string; filePath?: string }) => Promise<void>;
  openImageFile: (file: File | Blob, path?: string, name?: string) => Promise<void>;
  applySelection: (label: string, apply: () => Selection | null) => void;
  addFillLayer: (color?: Color) => void;
  addEmptyLayer: () => void;
  duplicateActiveLayer: () => void;
  deleteActiveLayer: () => void;
  setActiveLayer: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerBlendMode: (layerId: string, blendMode: BlendMode) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  setLayerTransform: (layerId: string, transform: Transform2D) => void;
  setLayerTransformLive: (layerId: string, transform: Transform2D) => void;
  setSelection: (selection: Selection | null, options?: { history?: boolean }) => void;
  selectAll: () => void;
  applyCrop: (bounds: { x: number; y: number; width: number; height: number }) => void;
  beginStroke: (label: string) => void;
  touchPixels: () => void;
  ensurePaintLayer: () => string | null;
  expandLayerToDocument: (layerId: string) => Layer | null;
  addImageLayer: (file: File | Blob, name?: string) => Promise<void>;
  addTextLayer: (x: number, y: number, text: string, fontFamily: string, fontSize: number, color: Color) => void;
  updateTextLayer: (layerId: string, text: string, fontFamily: string, fontSize: number, color: Color) => void;
  resizeImage: (width: number, height: number) => void;
  saveDocument: () => Promise<void>;
  saveDocumentAs: () => Promise<void>;
  undo: () => void;
  redo: () => void;
}

function seedBlankDocument(
  width = DEFAULT_DOCUMENT_WIDTH,
  height = DEFAULT_DOCUMENT_HEIGHT,
  backgroundColor: Color = DEFAULT_BACKGROUND,
  options: { format?: ImageFormat; sample?: boolean } = {},
): Document {
  pixelStore.clear();
  const { format = "png", sample = true } = options;

  const background = createRasterLayer("Background", { locked: true, role: "background" });
  const overlaySize = Math.round(Math.min(width, height) * 0.42);
  const overlay = createRasterLayer("Sample overlay", {
    role: "fill",
    blendMode: "multiply",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: Math.round((width - overlaySize) / 2),
      y: Math.round((height - overlaySize) / 2),
    },
  });

  assignLayerPixels(background.id, createSolidCanvas(width, height, backgroundColor));
  if (sample) assignLayerPixels(overlay.id, createSoftCircleCanvas(overlaySize, SAMPLE_OVERLAY));

  const layers = sample ? [background, overlay] : [background];
  return {
    id: generateId("doc"),
    name: "Untitled",
    width,
    height,
    dpi: 72,
    format,
    backgroundColor,
    layers,
    activeLayerId: (sample ? overlay : background).id,
    selection: null,
  };
}

function historyFlags() {
  return {
    historyVersion: Date.now(),
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undoLabel: history.undoLabel,
    redoLabel: history.redoLabel,
  };
}

function snapshot(document: Document, label: string, coalesceKey?: string): HistoryEntry {
  return captureEntry(label, document, coalesceKey);
}

function applyHistory(entry: HistoryEntry): Document {
  restorePixels(entry.pixels);
  restoreSelection(entry.selection);
  return cloneDocument(entry.document);
}

export const useDocumentStore = create<DocumentStore>((set, get) => {
  function record(label: string, coalesceKey?: string): void {
    const document = get().document;
    if (!document) return;
    history.record(snapshot(document, label, coalesceKey));
  }

  function mutate(label: string, updater: (document: Document) => Document, coalesceKey?: string): void {
    const document = get().document;
    if (!document) return;
    record(label, coalesceKey);
    set({ document: updater(document), dirty: true, ...historyFlags() });
  }

  return {
    document: null,
    dirty: false,
    historyVersion: 0,
    canUndo: false,
    canRedo: false,

    initBlankDocument: () => {
      history.clear();
      set({ document: seedBlankDocument(), dirty: true, ...historyFlags() });
    },

    newDocument: async (options = {}) => {
      const current = get().document;
      if (current) {
        const previous = snapshot(current, "New document");
        history.clear();
        history.record(previous);
      } else {
        history.clear();
      }
      const width = options.width ?? DEFAULT_DOCUMENT_WIDTH;
      const height = options.height ?? DEFAULT_DOCUMENT_HEIGHT;
      const backgroundColor = options.backgroundColor ?? DEFAULT_BACKGROUND;
      const format = options.format ?? "png";
      if (!options.image) {
        // The decorative sample overlay belongs to the document seeded at
        // startup, not to one the user deliberately created.
        const next = seedBlankDocument(width, height, backgroundColor, { format, sample: false });
        next.name = options.name || "Untitled";
        next.filePath = options.filePath;
        set({ document: next, dirty: !options.filePath, ...historyFlags() });
        return;
      }
      pixelStore.clear();
      const background = createRasterLayer("Background", { locked: true, role: "background" });
      assignLayerPixels(background.id, createSolidCanvas(width, height, backgroundColor));
      const canvas = await canvasFromFile(options.image as File);
      const image = createRasterLayer(options.name || "Pasted", { role: "image" });
      assignLayerPixels(image.id, canvas);
      set({
        document: {
          id: generateId("doc"),
          name: options.name || "Untitled",
          width,
          height,
          dpi: 72,
          format: "png",
          backgroundColor,
          layers: [background, image],
          activeLayerId: image.id,
          selection: null,
          filePath: options.filePath,
        },
        dirty: !options.filePath,
        ...historyFlags(),
      });
    },

    openImageFile: async (file, path, name) => {
      const current = get().document;
      if (current) history.record(snapshot(current, "Open image"));
      const canvas = await canvasFromFile(file as File);
      pixelStore.clear();
      const label = (name || ("name" in file ? file.name : "Layer 1")).replace(/\.[^.]+$/, "") || "Layer 1";
      const layer = createRasterLayer(label, { role: "image" });
      assignLayerPixels(layer.id, canvas);
      set({
        document: {
          id: generateId("doc"),
          name: label,
          width: canvas.width,
          height: canvas.height,
          dpi: 72,
          format: "png",
          backgroundColor: { r: 255, g: 255, b: 255, a: 0 },
          layers: [layer],
          activeLayerId: layer.id,
          selection: null,
          filePath: path,
        },
        dirty: !path,
        ...historyFlags(),
      });
    },

    addFillLayer: (color = SAMPLE_OVERLAY) => {
      mutate("Add fill layer", (document) => {
        const size = Math.round(Math.min(document.width, document.height) * 0.36);
        const layer = createRasterLayer(`Fill ${document.layers.length}`, {
          role: "fill",
          blendMode: "multiply",
          transform: {
            ...DEFAULT_TRANSFORM,
            x: Math.round((document.width - size) / 2),
            y: Math.round((document.height - size) / 2),
          },
        });
        assignLayerPixels(layer.id, createSoftCircleCanvas(size, color));
        return layerOps.addLayer(document, layer);
      });
    },

    addEmptyLayer: () => {
      mutate("New layer", (document) => {
        const layer = createRasterLayer(`Layer ${document.layers.length}`, { role: "paint" });
        assignLayerPixels(layer.id, createTransparentCanvas(document.width, document.height));
        return layerOps.addLayer(document, layer);
      });
    },

    duplicateActiveLayer: () => {
      mutate("Duplicate layer", (document) => {
        const current = layerOps.getActiveLayer(document);
        if (!current) return document;
        const copy: Layer =
          current.kind === "adjustment"
            ? { ...current, id: generateId("layer"), name: `${current.name} copy`, locked: false }
            : {
                ...current,
                id: generateId("layer"),
                name: `${current.name} copy`,
                locked: false,
                transform: { ...current.transform },
                ...(current.kind === "text" ? { text: current.text, fontFamily: current.fontFamily, fontSize: current.fontSize, color: { ...current.color } } : {}),
              };
        pixelStore.clone(current.id, copy.id);
        return layerOps.duplicateLayer(document, current.id, copy);
      });
    },

    deleteActiveLayer: () => {
      const document = get().document;
      if (!document || document.layers.length <= 1) return;
      mutate("Delete layer", (current) => {
        pixelStore.delete(current.activeLayerId);
        return layerOps.removeLayer(current, current.activeLayerId);
      });
    },

    setActiveLayer: (layerId) => {
      const document = get().document;
      if (!document || document.activeLayerId === layerId) return;
      record("Select layer");
      set({ document: layerOps.setActiveLayer(document, layerId), ...historyFlags() });
    },

    setLayerOpacity: (layerId, opacity) => {
      mutate("Opacity", (document) => layerOps.setLayerOpacity(document, layerId, opacity), `opacity:${layerId}`);
    },

    setLayerBlendMode: (layerId, blendMode) => {
      mutate("Blend mode", (document) => layerOps.setLayerBlendMode(document, layerId, blendMode), `blend:${layerId}`);
    },

    setLayerVisibility: (layerId, visible) => {
      mutate(visible ? "Show layer" : "Hide layer", (document) =>
        layerOps.setLayerVisibility(document, layerId, visible),
      );
    },

    setLayerTransform: (layerId, transform) => {
      mutate(
        "Move layer",
        (document) => {
          const layer = layerOps.getLayerById(document, layerId);
          if (!layer || layer.kind === "adjustment") return document;
          return layerOps.updateLayer(document, layerId, { transform });
        },
        `move:${layerId}`,
      );
    },

    setLayerTransformLive: (layerId, transform) => {
      const document = get().document;
      if (!document) return;
      const layer = layerOps.getLayerById(document, layerId);
      if (!layer || layer.kind === "adjustment") return;
      set({ document: layerOps.updateLayer(document, layerId, { transform }), dirty: true });
    },

    setSelection: (selection, options) => {
      const document = get().document;
      if (!document) return;
      if (!selection && !document.selection && !selectionStore.mask) return;
      if (options?.history !== false) record(selection ? "Select" : "Deselect");
      if (!selection) selectionStore.clear();
      set({ document: { ...document, selection }, ...historyFlags() });
    },

    applySelection: (label, apply) => {
      const document = get().document;
      if (!document) return;
      record(label);
      const selection = apply();
      set({ document: { ...document, selection }, ...historyFlags() });
    },

    selectAll: () => {
      get().applySelection("Select all", () => {
        const document = get().document;
        if (!document) return null;
        return fillRectMask(
          document.width,
          document.height,
          { x: 0, y: 0 },
          { x: document.width, y: document.height },
        );
      });
    },

    applyCrop: (bounds) => {
      if (bounds.width < 8 || bounds.height < 8) return;
      mutate("Crop", (document) => {
        selectionStore.clear();
        return cropDocument(document, bounds);
      });
    },

    /**
     * Grows a layer's canvas to cover the document and folds its offset into
     * the pixels. Moving a selection stamps the floating pixels back onto this
     * canvas, so anything landing outside its bounds would otherwise be
     * silently clipped away.
     */
    expandLayerToDocument: (layerId) => {
      const document = get().document;
      if (!document) return null;
      const layer = document.layers.find((item) => item.id === layerId);
      if (!layer || layer.kind === "adjustment") return null;

      const source = pixelStore.get(layerId);
      if (!source || !("width" in source)) return layer;

      const identity = layer.transform.x === 0 && layer.transform.y === 0;
      if (identity && source.width === document.width && source.height === document.height) return layer;

      const full = createTransparentCanvas(document.width, document.height);
      full.getContext("2d")?.drawImage(source as CanvasImageSource, layer.transform.x, layer.transform.y);
      assignLayerPixels(layerId, full);

      const next = layerOps.updateLayer(document, layerId, { transform: { ...DEFAULT_TRANSFORM } });
      set({ document: next, dirty: true });
      return next.layers.find((item) => item.id === layerId) ?? null;
    },

    ensurePaintLayer: () => {
      const document = get().document;
      if (!document) return null;
      const active = layerOps.getActiveLayer(document);
      if (active?.kind === "raster" && !active.locked) {
        const source = pixelStore.get(active.id);
        const identity = active.transform.x === 0 && active.transform.y === 0;
        if (source && source.width === document.width && source.height === document.height && identity) {
          return active.id;
        }
        if (source && identity === false) {
          const full = createTransparentCanvas(document.width, document.height);
          const ctx = full.getContext("2d");
          ctx?.drawImage(source as CanvasImageSource, active.transform.x, active.transform.y);
          assignLayerPixels(active.id, full);
          set({
            document: layerOps.updateLayer(document, active.id, { transform: { ...DEFAULT_TRANSFORM } }),
            dirty: true,
          });
          return active.id;
        }
        return active.id;
      }
      const layer = createRasterLayer(`Paint ${document.layers.length}`, { role: "paint" });
      assignLayerPixels(layer.id, createTransparentCanvas(document.width, document.height));
      mutate("New paint layer", (current) => layerOps.addLayer(current, layer));
      return layer.id;
    },

    addImageLayer: async (file, name = "Pasted") => {
      const document = get().document;
      const canvas = await canvasFromFile(file as File);
      const layer = createRasterLayer(name, { role: "image" });
      assignLayerPixels(layer.id, canvas);
      if (!document) {
        set({
          document: {
            id: generateId("doc"),
            name,
            width: canvas.width,
            height: canvas.height,
            dpi: 72,
            format: "png",
            backgroundColor: { r: 255, g: 255, b: 255, a: 0 },
            layers: [layer],
            activeLayerId: layer.id,
            selection: null,
          },
          dirty: true,
          ...historyFlags(),
        });
        return;
      }
      mutate("Paste image", (current) =>
        layerOps.addLayer(current, {
          ...layer,
          transform: {
            ...DEFAULT_TRANSFORM,
            x: Math.round((current.width - canvas.width) / 2),
            y: Math.round((current.height - canvas.height) / 2),
          },
        }),
      );
    },

    addTextLayer: (x, y, text, fontFamily, fontSize, color) => {
      if (!text.trim()) return;
      const canvas = rasterizeText(text, fontFamily, fontSize, color);
      const layer = createTextLayer(text.slice(0, 18) || "Text", {
        text,
        fontFamily,
        fontSize,
        color,
        transform: { ...DEFAULT_TRANSFORM, x, y },
      });
      assignLayerPixels(layer.id, canvas);
      mutate("Add text", (current) => layerOps.addLayer(current, layer));
    },

    updateTextLayer: (layerId, text, fontFamily, fontSize, color) => {
      if (!text.trim()) return;
      assignLayerPixels(layerId, rasterizeText(text, fontFamily, fontSize, color));
      mutate("Edit text", (current) => {
        const layer = layerOps.getLayerById(current, layerId);
        if (!layer) return current;
        if (layer.kind === "text") {
          return layerOps.updateLayer(current, layerId, { text, fontFamily, fontSize, color, name: text.slice(0, 18) || "Text" });
        }
        return layerOps.updateLayer(current, layerId, { name: text.slice(0, 18) || "Text" });
      });
    },

    resizeImage: (width, height) => {
      if (width < 1 || height < 1) return;
      mutate("Image size", (document) => {
        selectionStore.clear();
        return resizeDocument(document, width, height);
      });
    },

    saveDocument: async () => {
      const document = get().document;
      if (!document) return;
      if (!document.filePath) {
        await get().saveDocumentAs();
        return;
      }
      const bytes = await flattenToBytes(document, document.filePath);
      await saveBytes(document.filePath, bytes);
      set({ dirty: false });
    },

    saveDocumentAs: async () => {
      const document = get().document;
      if (!document) return;
      const extension = IMAGE_FORMATS.find((item) => item.id === document.format)?.extension ?? "png";
      const path = await pickSavePath(`${document.name || "Untitled"}.${extension}`);
      if (!path) return;
      const bytes = await flattenToBytes(document, path);
      await saveBytes(path, bytes);
      const name = path.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "") || document.name;
      set({ document: { ...document, filePath: path, name }, dirty: false });
    },


    beginStroke: (label) => {
      record(label);
      set({ dirty: true, ...historyFlags() });
    },

    touchPixels: () => {
      pixelStore.touch();
    },

    undo: () => {
      const document = get().document;
      if (!document) return;
      const previous = history.undo(snapshot(document, "Current"));
      if (!previous) return;
      set({ document: applyHistory(previous), dirty: true, ...historyFlags() });
    },

    redo: () => {
      const document = get().document;
      if (!document) return;
      const next = history.redo(snapshot(document, "Current"));
      if (!next) return;
      set({ document: applyHistory(next), dirty: true, ...historyFlags() });
    },
  };
});

export function useActiveLayer() {
  return useDocumentStore((state) => {
    if (!state.document) return undefined;
    return layerOps.getActiveLayer(state.document);
  });
}

export function useVisibleLayers() {
  return useDocumentStore((state) => {
    if (!state.document) return [];
    return layerOps.getVisibleLayers(state.document);
  });
}
