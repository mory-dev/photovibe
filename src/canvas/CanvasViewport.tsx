import { useEffect, useRef, useState } from "react";
import type { ToolId } from "../components/Toolbar";
import { ContextMenu, type ContextMenuState } from "../components/ContextMenu";
import { Compositor } from "../engine/compositor/Compositor";
import { getMutableCanvas } from "../engine/pixels/canvas";
import { extractFloatingSelection, stampFloatingSelection } from "../engine/pixels/float-selection";
import { colorToCss } from "../engine/pixels/generate";
import { strokeBrushes } from "../engine/pixels/paint";
import { pixelStore } from "../engine/pixels/pixel-store";
import { hideLayer } from "../engine/document/hide-layer";
import { textOverlayLayout } from "../engine/pixels/text-metrics";
import { DEFAULT_TRANSFORM } from "../engine/document/types";
import { withSelectionClip } from "../engine/selections/clip";
import { fillLassoMask, fillRectMask, fillWandMask, flattenDocument, normalizeRect } from "../engine/selections/create-mask";
import { selectionStore } from "../engine/selections/selection-store";
import { usePixelGeneration } from "../hooks/use-pixel-generation";
import { useSelectionGeneration } from "../hooks/use-selection";
import { isImagePath, pinCursor, readClipboardImage, readImageAtPath } from "../lib/native";
import { useActiveLayer, useDocumentStore } from "../store/document-store";
import { useEditorStore } from "../store/editor-store";
import { useViewportStore } from "../store/viewport-store";
import { MarchingAntsPolyline } from "./MarchingAntsPolyline";
import { SelectionOverlay } from "./SelectionOverlay";
import { drawDocument2D, hitTestLayer, paintDocumentLayers } from "./draw-document";
import { antsPoints } from "./marching-ants";
import { documentRect, screenToDocument } from "./viewport";

interface CanvasViewportProps {
  showGrid: boolean;
  loading?: boolean;
  activeTool: ToolId;
  onToolChange: (tool: ToolId) => void;
}

type Draft =
  | { kind: "rect" | "crop"; a: { x: number; y: number }; b: { x: number; y: number } }
  | { kind: "lasso"; points: Array<{ x: number; y: number }> }
  | { kind: "text"; x: number; y: number; layerId?: string };

type CropHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const CROP_HANDLES: CropHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function CanvasViewport({ showGrid, loading, activeTool, onToolChange }: CanvasViewportProps) {
  const document = useDocumentStore((s) => s.document);
  const setActiveLayer = useDocumentStore((s) => s.setActiveLayer);
  const setLayerTransformLive = useDocumentStore((s) => s.setLayerTransformLive);
  const setSelection = useDocumentStore((s) => s.setSelection);
  const applySelection = useDocumentStore((s) => s.applySelection);
  const selectAll = useDocumentStore((s) => s.selectAll);
  const applyCrop = useDocumentStore((s) => s.applyCrop);
  const beginStroke = useDocumentStore((s) => s.beginStroke);
  const touchPixels = useDocumentStore((s) => s.touchPixels);
  const ensurePaintLayer = useDocumentStore((s) => s.ensurePaintLayer);
  const addTextLayer = useDocumentStore((s) => s.addTextLayer);
  const updateTextLayer = useDocumentStore((s) => s.updateTextLayer);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const addImageLayer = useDocumentStore((s) => s.addImageLayer);
  const activeLayer = useActiveLayer();
  const pixels = usePixelGeneration();
  useSelectionGeneration();
  const historyVersion = useDocumentStore((s) => s.historyVersion);
  const foreground = useEditorStore((s) => s.foreground);
  const brushSize = useEditorStore((s) => s.brushSize);
  const setBrushSize = useEditorStore((s) => s.setBrushSize);
  const fontFamily = useEditorStore((s) => s.fontFamily);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontFamily = useEditorStore((s) => s.setFontFamily);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const setForeground = useEditorStore((s) => s.setForeground);
  const setHoverColor = useEditorStore((s) => s.setHoverColor);
  const hoverColor = useEditorStore((s) => s.hoverColor);
  const viewport = useViewportStore();
  const hostRef = useRef<HTMLDivElement>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [textValue, setTextValue] = useState("");
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [focusBox, setFocusBox] = useState<{ layerId: string; x: number; y: number; width: number; height: number } | null>(null);
  const [brushSizing, setBrushSizing] = useState(false);
  const paintingRef = useRef(false);
  const paintRaf = useRef(0);
  const dragRef = useRef<{
    kind: "pan" | "move" | "pixels" | "selection" | "paint" | "rect" | "crop" | "lasso" | "crop-handle" | "brush-size";
    layerId?: string;
    handle?: CropHandle;
    lastX: number;
    lastY: number;
    lastDoc?: { x: number; y: number };
    startSize?: number;
    startRect?: { x: number; y: number; width: number; height: number };
    pinX?: number;
    pinY?: number;
    acc?: number;
    locked?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!canvasEl) return;
    try {
      compositorRef.current = new Compositor(canvasEl);
    } catch {
      compositorRef.current = null;
    }
    return () => {
      compositorRef.current?.dispose();
      compositorRef.current = null;
    };
  }, [canvasEl]);

  const [dropActive, setDropActive] = useState(false);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        const unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
          if (event.payload.type === "over") {
            setDropActive(true);
            return;
          }
          if (event.payload.type === "leave") {
            setDropActive(false);
            return;
          }
          setDropActive(false);
          for (const path of event.payload.paths) {
            if (!isImagePath(path)) continue;
            const file = await readImageAtPath(path);
            if (file) {
              await addImageLayer(file.blob, file.name);
              return;
            }
          }
        });
        if (cancelled) unlisten();
        else dispose = unlisten;
      } catch {
        // Browser build: the HTML5 handlers below cover it.
      }
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [addImageLayer]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      viewport.setViewSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(host);
    viewport.setViewSize({ width: host.clientWidth, height: host.clientHeight });
    return () => observer.disconnect();
  }, [viewport.setViewSize]);

  useEffect(() => {
    if (!document || !canvasEl || paintingRef.current) return;
    const width = Math.max(1, Math.round(hostRef.current?.clientWidth || viewport.viewSize.width));
    const height = Math.max(1, Math.round(hostRef.current?.clientHeight || viewport.viewSize.height));
    if (canvasEl.width !== width || canvasEl.height !== height) {
      canvasEl.width = width;
      canvasEl.height = height;
    }
    const camera = { zoom: viewport.zoom, panX: viewport.panX, panY: viewport.panY };
    const renderDoc = hideLayer(document, draft?.kind === "text" ? draft.layerId : undefined);
    if (compositorRef.current) {
      try {
        compositorRef.current.render(renderDoc, camera, width, height);
        return;
      } catch {
        compositorRef.current = null;
      }
    }
    const ctx = canvasEl.getContext("2d");
    if (ctx) drawDocument2D(ctx, renderDoc, camera, width, height);
  }, [document, canvasEl, pixels, historyVersion, viewport.zoom, viewport.panX, viewport.panY, viewport.viewSize, draft]);

  useEffect(() => {
    if (activeTool === "crop" && document) {
      setCropRect({ x: 0, y: 0, width: document.width, height: document.height });
    } else {
      setCropRect(null);
    }
  }, [activeTool, document?.id, document?.width, document?.height]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (activeTool !== "crop" || !cropRect) return;
      if (e.key === "Enter") {
        e.preventDefault();
        applyCrop(cropRect);
      }
      if (e.key === "Escape") {
        setCropRect(document ? { x: 0, y: 0, width: document.width, height: document.height } : null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTool, cropRect, applyCrop, document]);

  const view = {
    width: hostRef.current?.clientWidth || viewport.viewSize.width,
    height: hostRef.current?.clientHeight || viewport.viewSize.height,
  };
  const doc = document ? { width: document.width, height: document.height } : { width: 1, height: 1 };
  const rect = document ? documentRect(viewport, view, doc) : { x: 0, y: 0, width: 0, height: 0 };

  function toDoc(e: { clientX: number; clientY: number }) {
    const bounds = hostRef.current?.getBoundingClientRect();
    const screen = { x: e.clientX - (bounds?.left ?? 0), y: e.clientY - (bounds?.top ?? 0) };
    return { screen, doc: screenToDocument(viewport, view, doc, screen.x, screen.y) };
  }

  function sampleAt(docX: number, docY: number) {
    if (compositorRef.current) return compositorRef.current.readPixels(docX, docY);
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  function liveRender() {
    if (!document || !canvasEl) return;
    const width = canvasEl.width;
    const height = canvasEl.height;
    const camera = { zoom: viewport.zoom, panX: viewport.panX, panY: viewport.panY };
    const renderDoc = hideLayer(document, draft?.kind === "text" ? draft.layerId : undefined);
    if (compositorRef.current) {
      compositorRef.current.render(renderDoc, camera, width, height);
      return;
    }
    const ctx = canvasEl.getContext("2d");
    if (ctx) drawDocument2D(ctx, renderDoc, camera, width, height);
  }

  function schedulePaintFrame(layerId: string) {
    pixelStore.touchLayer(layerId, false);
    if (paintRaf.current) return;
    paintRaf.current = requestAnimationFrame(() => {
      paintRaf.current = 0;
      liveRender();
    });
  }

  function paintAt(layerId: string, from: { x: number; y: number }, to: { x: number; y: number }, erase: boolean) {
    const canvas = getMutableCanvas(layerId);
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // ensurePaintLayer normalises the paint target to document size with an
    // identity transform, so stroke coordinates are already document space.
    const layer = document?.layers.find((item) => item.id === layerId);
    const transform = layer && layer.kind !== "adjustment" ? layer.transform : DEFAULT_TRANSFORM;
    withSelectionClip(ctx, transform, (target) => {
      strokeBrushes(target, from, to, brushSize / 2, foreground, erase);
    });
    schedulePaintFrame(layerId);
  }

  function commitText() {
    if (draft?.kind !== "text" || !textValue.trim()) {
      setDraft(null);
      return;
    }
    if (draft.layerId) {
      updateTextLayer(draft.layerId, textValue, fontFamily, fontSize, foreground);
    } else {
      addTextLayer(draft.x, draft.y, textValue, fontFamily, fontSize, foreground);
    }
    setDraft(null);
    setTextValue("");
  }

  function startTextEdit(layer: { id: string; kind: string; role?: string; transform?: { x: number; y: number } }) {
    const textLayer = document?.layers.find((item) => item.id === layer.id);
    setActiveLayer(layer.id);
    if (textLayer?.kind === "text") {
      setTextValue(textLayer.text);
      setFontFamily(textLayer.fontFamily);
      setFontSize(textLayer.fontSize);
      setForeground(textLayer.color);
      setDraft({ kind: "text", x: textLayer.transform.x, y: textLayer.transform.y, layerId: layer.id });
      return;
    }
    setDraft({ kind: "text", x: layer.transform?.x ?? 0, y: layer.transform?.y ?? 0, layerId: layer.id });
    setTextValue("");
  }

  function pointInBox(point: { x: number; y: number }, box: { x: number; y: number; width: number; height: number }) {
    return point.x >= box.x && point.y >= box.y && point.x <= box.x + box.width && point.y <= box.y + box.height;
  }

  function hitCropHandle(docPos: { x: number; y: number }): CropHandle | null {
    if (!cropRect) return null;
    const pad = 8 / viewport.zoom;
    const { x, y, width, height } = cropRect;
    const points: Array<[CropHandle, number, number]> = [
      ["nw", x, y],
      ["n", x + width / 2, y],
      ["ne", x + width, y],
      ["e", x + width, y + height / 2],
      ["se", x + width, y + height],
      ["s", x + width / 2, y + height],
      ["sw", x, y + height],
      ["w", x, y + height / 2],
    ];
    for (const [handle, hx, hy] of points) {
      if (Math.abs(docPos.x - hx) <= pad && Math.abs(docPos.y - hy) <= pad) return handle;
    }
    return null;
  }

  function resizeCrop(handle: CropHandle, start: { x: number; y: number; width: number; height: number }, pos: { x: number; y: number }) {
    let { x, y, width, height } = start;
    const right = x + width;
    const bottom = y + height;
    if (handle.includes("w")) {
      x = Math.min(pos.x, right - 8);
      width = right - x;
    }
    if (handle.includes("e")) width = Math.max(8, pos.x - x);
    if (handle.includes("n")) {
      y = Math.min(pos.y, bottom - 8);
      height = bottom - y;
    }
    if (handle.includes("s")) height = Math.max(8, pos.y - y);
    if (document) {
      x = Math.max(0, Math.min(x, document.width - 8));
      y = Math.max(0, Math.min(y, document.height - 8));
      width = Math.max(8, Math.min(width, document.width - x));
      height = Math.max(8, Math.min(height, document.height - y));
    }
    setCropRect({ x, y, width, height });
  }

  function beginPixelMove() {
    const target = activeLayer && activeLayer.kind !== "adjustment" ? activeLayer : undefined;
    if (target && !selectionStore.floating) {
      beginStroke("Move selection");
      extractFloatingSelection(target);
      touchPixels();
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!document) return;
    const { doc: docPos } = toDoc(e);

    if (e.button === 2 && e.altKey && (activeTool === "brush" || activeTool === "eraser" || activeTool === "heal")) {
      const { screen } = toDoc(e);
      setHoverPos(screen);
      setBrushSizing(true);
      // Pointer lock gives clean relative deltas without moving the OS cursor,
      // so the size follows the drag smoothly and the cursor reappears exactly
      // where it started. pin_cursor is the fallback where lock is refused.
      const host = hostRef.current;
      const locked = typeof host?.requestPointerLock === "function";
      if (locked) void Promise.resolve(host.requestPointerLock()).catch(() => {});
      dragRef.current = {
        kind: "brush-size",
        lastX: e.clientX,
        lastY: e.clientY,
        startSize: brushSize,
        pinX: e.screenX,
        pinY: e.screenY,
        acc: 0,
        locked,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button === 1 || viewport.spaceDown) {
      dragRef.current = { kind: "pan", lastX: e.clientX, lastY: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;

    if (activeTool === "cursor") {
      // A selection under the cursor wins over the focus box: dragging inside
      // one is how you move the selected chunk, and Alt moves just the outline.
      if (selectionStore.mask && selectionStore.hitTest(docPos.x, docPos.y)) {
        if (e.altKey) {
          beginStroke("Move selection");
          dragRef.current = { kind: "selection", lastX: e.clientX, lastY: e.clientY };
        } else {
          beginPixelMove();
          dragRef.current = { kind: "pixels", lastX: e.clientX, lastY: e.clientY };
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      if (focusBox && pointInBox(docPos, focusBox)) {
        const layer = document.layers.find((item) => item.id === focusBox.layerId);
        if (layer && !layer.locked && layer.kind !== "adjustment") {
          onToolChange("move");
          beginStroke("Move layer");
          dragRef.current = { kind: "move", layerId: layer.id, lastX: e.clientX, lastY: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        return;
      }
      const hit = hitTestLayer(document, docPos.x, docPos.y);
      if (hit && hit.kind !== "adjustment") {
        setActiveLayer(hit.id);
        const source = pixelStore.get(hit.id);
        if (source) {
          setFocusBox({
            layerId: hit.id,
            x: hit.transform.x,
            y: hit.transform.y,
            width: source.width * hit.transform.scaleX,
            height: source.height * hit.transform.scaleY,
          });
        }
      } else {
        setFocusBox(null);
      }
      return;
    }

    if (activeTool === "move") {
      if (e.altKey && selectionStore.mask) {
        beginPixelMove();
        dragRef.current = { kind: "pixels", lastX: e.clientX, lastY: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      if (selectionStore.mask && selectionStore.hitTest(docPos.x, docPos.y)) {
        beginPixelMove();
        dragRef.current = { kind: "pixels", lastX: e.clientX, lastY: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      const hit = hitTestLayer(document, docPos.x, docPos.y);
      if (hit) setActiveLayer(hit.id);
      if (hit && !hit.locked && hit.kind !== "adjustment") {
        beginStroke("Move layer");
        dragRef.current = { kind: "move", layerId: hit.id, lastX: e.clientX, lastY: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (activeTool === "eyedropper") {
      setForeground(sampleAt(docPos.x, docPos.y));
      return;
    }

    if (activeTool === "brush" || activeTool === "eraser") {
      const layerId = ensurePaintLayer();
      if (!layerId) return;
      beginStroke(activeTool === "eraser" ? "Eraser" : "Brush");
      paintingRef.current = true;
      paintAt(layerId, docPos, docPos, activeTool === "eraser");
      dragRef.current = { kind: "paint", layerId, lastX: e.clientX, lastY: e.clientY, lastDoc: docPos };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool === "marquee") {
      dragRef.current = { kind: "rect", lastX: e.clientX, lastY: e.clientY };
      setDraft({ kind: "rect", a: docPos, b: docPos });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool === "crop") {
      const handle = hitCropHandle(docPos);
      if (handle && cropRect) {
        dragRef.current = {
          kind: "crop-handle",
          handle,
          lastX: e.clientX,
          lastY: e.clientY,
          startRect: cropRect,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      dragRef.current = { kind: "crop", lastX: e.clientX, lastY: e.clientY };
      setDraft({ kind: "crop", a: docPos, b: docPos });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool === "lasso") {
      dragRef.current = { kind: "lasso", lastX: e.clientX, lastY: e.clientY };
      setDraft({ kind: "lasso", points: [docPos] });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool === "wand") {
      const flat = flattenDocument(document.width, document.height, (ctx) => {
        ctx.fillStyle = colorToCss(document.backgroundColor);
        ctx.fillRect(0, 0, document.width, document.height);
        paintDocumentLayers(ctx, document);
      });
      applySelection("Select", () => fillWandMask(document.width, document.height, flat, docPos.x, docPos.y));
      return;
    }

    if (activeTool === "text") {
      const hit = hitTestLayer(document, docPos.x, docPos.y);
      if (hit && (hit.kind === "text" || hit.role === "text")) {
        startTextEdit(hit);
        return;
      }
      setDraft({ kind: "text", x: docPos.x, y: docPos.y });
      setTextValue("");
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!document) return;
    const { screen, doc: docPos } = toDoc(e);
    if (
      (activeTool === "brush" || activeTool === "eraser" || activeTool === "eyedropper") &&
      dragRef.current?.kind !== "brush-size"
    ) {
      setHoverPos(screen);
    }
    if (activeTool === "eyedropper") {
      setHoverColor(sampleAt(docPos.x, docPos.y));
    }

    const drag = dragRef.current;
    if (!drag) return;

    if (drag.kind === "brush-size" && drag.startSize != null) {
      drag.acc = (drag.acc ?? 0) + e.movementX * 0.4;
      setBrushSize(drag.startSize + drag.acc);
      if (!drag.locked && drag.pinX != null && drag.pinY != null) void pinCursor(drag.pinX, drag.pinY);
      return;
    }

    if (drag.kind === "pan") {
      viewport.panBy(e.clientX - drag.lastX, e.clientY - drag.lastY);
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      return;
    }

    if (drag.kind === "move" && drag.layerId) {
      const layer = document.layers.find((item) => item.id === drag.layerId);
      if (!layer || layer.kind === "adjustment") return;
      setLayerTransformLive(layer.id, {
        ...layer.transform,
        x: layer.transform.x + (e.clientX - drag.lastX) / viewport.zoom,
        y: layer.transform.y + (e.clientY - drag.lastY) / viewport.zoom,
      });
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      return;
    }

    if (drag.kind === "pixels") {
      selectionStore.floatX += (e.clientX - drag.lastX) / viewport.zoom;
      selectionStore.floatY += (e.clientY - drag.lastY) / viewport.zoom;
      selectionStore.bump();
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      return;
    }

    if (drag.kind === "selection") {
      // Shifting the offset moves the marching ants, the hit test and the paint
      // clip together, leaving the pixels underneath alone.
      selectionStore.offsetX += (e.clientX - drag.lastX) / viewport.zoom;
      selectionStore.offsetY += (e.clientY - drag.lastY) / viewport.zoom;
      selectionStore.bump();
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      return;
    }

    if (drag.kind === "paint" && drag.layerId && drag.lastDoc) {
      paintAt(drag.layerId, drag.lastDoc, docPos, activeTool === "eraser");
      drag.lastDoc = docPos;
      return;
    }

    if (drag.kind === "crop-handle" && drag.handle && drag.startRect) {
      resizeCrop(drag.handle, drag.startRect, docPos);
      return;
    }

    if (drag.kind === "rect" || drag.kind === "crop") {
      setDraft((current) =>
        current && (current.kind === "rect" || current.kind === "crop") ? { ...current, b: docPos } : current,
      );
      return;
    }

    if (drag.kind === "lasso") {
      setDraft((current) =>
        current?.kind === "lasso" ? { kind: "lasso", points: [...current.points, docPos] } : current,
      );
    }
  }

  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.kind === "brush-size") {
      setBrushSizing(false);
      if (drag.locked && window.document.pointerLockElement) window.document.exitPointerLock();
    }
    if (!document) return;

    if (drag?.kind === "paint") {
      paintingRef.current = false;
      if (paintRaf.current) {
        cancelAnimationFrame(paintRaf.current);
        paintRaf.current = 0;
      }
      touchPixels();
    }

    if (drag?.kind === "pixels" && activeLayer && activeLayer.kind !== "adjustment") {
      stampFloatingSelection(activeLayer);
      touchPixels();
      setSelection(selectionStore.toDocumentSelection(), { history: false });
    }

    if (drag?.kind === "selection") {
      setSelection(selectionStore.toDocumentSelection(), { history: false });
    }

    if (drag?.kind === "crop-handle") {
      return;
    }

    if (draft?.kind === "rect") {
      applySelection("Select", () => fillRectMask(document.width, document.height, draft.a, draft.b));
      setDraft(null);
      return;
    }

    if (draft?.kind === "crop") {
      const bounds = normalizeRect(draft.a, draft.b);
      setDraft(null);
      if (bounds.width >= 8 && bounds.height >= 8) {
        setCropRect(bounds);
        applyCrop(bounds);
      }
      return;
    }

    if (draft?.kind === "lasso") {
      applySelection("Select", () => fillLassoMask(document.width, document.height, draft.points));
      setDraft(null);
    }
  }

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const { screen } = toDoc(e);
    if (e.ctrlKey || e.metaKey) {
      viewport.zoomAt(screen.x, screen.y, e.deltaY < 0 ? 1.08 : 1 / 1.08, doc);
      return;
    }
    if (e.shiftKey) {
      viewport.panBy(-(e.deltaY || e.deltaX), 0);
      return;
    }
    viewport.panBy(-e.deltaX, -e.deltaY);
  }

  async function pasteImage() {
    const clip = await readClipboardImage();
    if (!clip) return;
    await addImageLayer(clip.blob, "Pasted");
  }

  const liveFocus = focusBox && document
    ? (() => {
        const layer = document.layers.find((item) => item.id === focusBox.layerId);
        const source = pixelStore.get(focusBox.layerId);
        if (!layer || layer.kind === "adjustment" || !source) return focusBox;
        return {
          ...focusBox,
          x: layer.transform.x,
          y: layer.transform.y,
          width: source.width * layer.transform.scaleX,
          height: source.height * layer.transform.scaleY,
        };
      })()
    : null;
  const liveRect = draft && (draft.kind === "rect" || draft.kind === "crop") ? normalizeRect(draft.a, draft.b) : null;
  const shownCrop = draft?.kind === "crop" ? liveRect : cropRect;
  const showBrushRing = (activeTool === "brush" || activeTool === "eraser" || dragRef.current?.kind === "brush-size") && hoverPos;
  const cursorClass =
    activeTool === "eyedropper"
      ? "pv-cursor-eyedropper"
      : activeTool === "lasso"
        ? "pv-cursor-lasso"
        : activeTool === "wand"
          ? "pv-cursor-wand"
          : "";
  const cursor = brushSizing || viewport.spaceDown
    ? brushSizing
      ? "none"
      : "grab"
    : activeTool === "move"
      ? "move"
      : activeTool === "text"
        ? "text"
        : activeTool === "cursor"
          ? "default"
          : activeTool === "brush" || activeTool === "eraser"
            ? "none"
            : activeTool === "eyedropper" || activeTool === "lasso" || activeTool === "wand"
              ? undefined
              : "crosshair";

  return (
    <div
      ref={hostRef}
      className={`pv-canvas relative min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas-bg ${cursorClass}`}
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        if (brushSizing) return;
        setHoverColor(null);
        setHoverPos(null);
      }}
      onDoubleClick={(e) => {
        if (!document || (activeTool !== "cursor" && activeTool !== "move")) return;
        const { doc: docPos } = toDoc(e);
        const hit = hitTestLayer(document, docPos.x, docPos.y);
        if (hit && (hit.kind === "text" || hit.role === "text")) {
          onToolChange("text");
          startTextEdit(hit);
        }
      }}
      onWheel={onWheel}
      onDragStart={(e) => e.preventDefault()}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDropActive(true);
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={async (e) => {
        // Browser build only; the desktop app receives paths through
        // onDragDropEvent instead, because the webview swallows the DOM event.
        const file = [...e.dataTransfer.files].find((item) => item.type.startsWith("image/"));
        if (!file) return;
        e.preventDefault();
        setDropActive(false);
        await addImageLayer(file, file.name);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (e.altKey) return;
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            { label: "Undo", shortcut: "Ctrl+Z", action: undo },
            { label: "Redo", shortcut: "Ctrl+Shift+Z", action: redo },
            { label: "Deselect", shortcut: "Esc", action: () => setSelection(null) },
            { label: "Select All", shortcut: "Ctrl+A", action: selectAll },
            { label: "Paste", shortcut: "Ctrl+V", action: () => void pasteImage() },
          ],
        });
      }}
    >
      <canvas ref={setCanvasEl} className="absolute inset-0 block h-full w-full" draggable={false} />
      {showGrid && document && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            backgroundImage:
              "linear-gradient(#88888822 1px, transparent 1px), linear-gradient(90deg, #88888822 1px, transparent 1px)",
            backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
          }}
        />
      )}
      <SelectionOverlay viewX={rect.x} viewY={rect.y} zoom={viewport.zoom} />
      {liveFocus && (activeTool === "cursor" || activeTool === "move") && (
        <div
          className="pointer-events-none absolute border border-accent"
          style={{
            left: rect.x + liveFocus.x * viewport.zoom,
            top: rect.y + liveFocus.y * viewport.zoom,
            width: Math.max(1, liveFocus.width * viewport.zoom),
            height: Math.max(1, liveFocus.height * viewport.zoom),
          }}
        />
      )}
      {liveRect && draft?.kind === "rect" && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: rect.x + liveRect.x * viewport.zoom,
            top: rect.y + liveRect.y * viewport.zoom,
            width: Math.max(1, liveRect.width * viewport.zoom),
            height: Math.max(1, liveRect.height * viewport.zoom),
          }}
        >
          <div className="pv-ants-box absolute inset-0" />
        </div>
      )}
      {activeTool === "crop" && shownCrop && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: rect.x + shownCrop.x * viewport.zoom,
            top: rect.y + shownCrop.y * viewport.zoom,
            width: Math.max(1, shownCrop.width * viewport.zoom),
            height: Math.max(1, shownCrop.height * viewport.zoom),
          }}
        >
          <div className="pv-ants-box absolute inset-0" />
          {CROP_HANDLES.map((handle) => (
            <span
              key={handle}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
              style={handleStyle(handle)}
            />
          ))}
        </div>
      )}
      {draft?.kind === "lasso" && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <MarchingAntsPolyline points={antsPoints(draft.points, rect.x, rect.y, viewport.zoom)} />
        </svg>
      )}
      {draft?.kind === "text" && (
        <input
          autoFocus
          value={textValue}
          placeholder="Text"
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setDraft(null);
            }
          }}
          className="absolute z-20 m-0 border-0 bg-transparent p-0 outline-none"
          style={{
            ...textOverlayLayout(rect.x, rect.y, draft.x, draft.y, fontSize, viewport.zoom),
            fontFamily,
            padding: 0,
            margin: 0,
            border: 0,
            appearance: "none",
            WebkitAppearance: "none",
            boxSizing: "content-box",
            color: `rgb(${foreground.r}, ${foreground.g}, ${foreground.b})`,
            caretColor: `rgb(${foreground.r}, ${foreground.g}, ${foreground.b})`,
            minWidth: `${Math.max(12, fontSize * viewport.zoom * 0.4)}px`,
            width: `${Math.max(fontSize * viewport.zoom, textValue.length * fontSize * viewport.zoom * 0.62)}px`,
          }}
        />
      )}
      {dropActive && (
        <div className="pointer-events-none absolute inset-3 z-20 rounded-lg border-2 border-dashed border-accent/70 bg-accent/5" />
      )}
      {showBrushRing && (
        <div
          className="pointer-events-none absolute rounded-full border border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{
            left: hoverPos.x - (brushSize * viewport.zoom) / 2,
            top: hoverPos.y - (brushSize * viewport.zoom) / 2,
            width: Math.max(2, brushSize * viewport.zoom),
            height: Math.max(2, brushSize * viewport.zoom),
          }}
        />
      )}
      {activeTool === "eyedropper" && hoverPos && hoverColor && (
        <div
          className="pointer-events-none absolute z-20 flex items-center gap-1.5 rounded bg-surface-0/90 px-1.5 py-1 text-[10px] text-text shadow"
          style={{ left: hoverPos.x + 16, top: hoverPos.y + 16 }}
        >
          <span
            className="h-4 w-4 rounded-sm border border-white/30"
            style={{ background: `rgb(${hoverColor.r}, ${hoverColor.g}, ${hoverColor.b})` }}
          />
          {Math.round(hoverColor.r)} {Math.round(hoverColor.g)} {Math.round(hoverColor.b)}
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas-bg/60">
          <div className="pv-skeleton h-[min(420px,55vh)] w-[min(640px,70vw)] rounded-sm shadow-2xl ring-1 ring-border" />
        </div>
      )}
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
    </div>
  );
}

function handleStyle(handle: CropHandle): { left: string; top: string } {
  const x = handle.includes("w") ? "0%" : handle.includes("e") ? "100%" : "50%";
  const y = handle.includes("n") ? "0%" : handle.includes("s") ? "100%" : "50%";
  return { left: x, top: y };
}
