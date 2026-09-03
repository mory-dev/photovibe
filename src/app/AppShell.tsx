import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasViewport } from "../canvas/CanvasViewport";
import { AboutDialog } from "../components/AboutDialog";
import { ImageSizeDialog } from "../components/ImageSizeDialog";
import { InspectorPanel } from "../components/InspectorPanel";
import { MenuBar, type MenuDefinition } from "../components/MenuBar";
import { NewDocumentDialog } from "../components/NewDocumentDialog";
import { OptionsBar } from "../components/OptionsBar";
import { SplashScreen } from "../components/SplashScreen";
import { StatusBar } from "../components/StatusBar";
import { Toolbar, type ToolId } from "../components/Toolbar";
import { FilterDialog, type FilterSpec } from "../components/FilterDialog";
import type { Filter } from "../engine/filters/adjustments";
import { beginFilter, previewFilter } from "../engine/filters/apply";
import { ADJUSTMENTS, EFFECTS } from "../engine/filters/catalogue";
import { canvasToBlob, clearSelectionRegion, copySelectionRegion } from "../engine/pixels/clipboard-region";
import { selectionStore } from "../engine/selections/selection-store";
import { useSelectionGeneration } from "../hooks/use-selection";
import {
  listSystemFonts,
  openImagePath,
  readClipboardImage,
  readClipboardImagePaths,
  readImageAtPath,
  sampleScreenColor,
  writeClipboardImage,
} from "../lib/native";
import { useActiveLayer, useDocumentStore } from "../store/document-store";
import { useEditorStore } from "../store/editor-store";
import { useViewportStore } from "../store/viewport-store";

/**
 * Cut and Copy keep the region here as well as on the system clipboard, so a
 * Paste inside Photovibe is exact rather than a PNG round-trip.
 */
const internalClipboard: { canvas: HTMLCanvasElement | null } = { canvas: null };

const SPLASH_MIN_MS = 1200;
const SKELETON_MS = 350;

function shouldBlockBrowserShortcut(e: KeyboardEvent): boolean {
  const key = e.key.toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && (key === "p" || key === "u" || key === "g" || key === "f" || key === "r")) return true;
  if (ctrl && e.shiftKey && (key === "i" || key === "j" || key === "c" || key === "p")) return true;
  if (key === "f5" || key === "f12") return true;
  if (e.altKey && (key === "arrowleft" || key === "arrowright")) return true;
  return false;
}

export function AppShell() {
  const document = useDocumentStore((s) => s.document);
  const initBlankDocument = useDocumentStore((s) => s.initBlankDocument);
  const newDocument = useDocumentStore((s) => s.newDocument);
  const openImageFile = useDocumentStore((s) => s.openImageFile);
  const addFillLayer = useDocumentStore((s) => s.addFillLayer);
  const addEmptyLayer = useDocumentStore((s) => s.addEmptyLayer);
  const duplicateActiveLayer = useDocumentStore((s) => s.duplicateActiveLayer);
  const deleteActiveLayer = useDocumentStore((s) => s.deleteActiveLayer);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const canUndo = useDocumentStore((s) => s.canUndo);
  const canRedo = useDocumentStore((s) => s.canRedo);
  const undoLabel = useDocumentStore((s) => s.undoLabel);
  const redoLabel = useDocumentStore((s) => s.redoLabel);
  const setSelection = useDocumentStore((s) => s.setSelection);
  const selectAll = useDocumentStore((s) => s.selectAll);
  const addImageLayer = useDocumentStore((s) => s.addImageLayer);
  const beginStroke = useDocumentStore((s) => s.beginStroke);
  const touchPixels = useDocumentStore((s) => s.touchPixels);
  const activeLayer = useActiveLayer();
  // selectionStore is not a React store; this subscribes so menu enablement
  // tracks whether a selection exists.
  useSelectionGeneration();
  const hasSelection = !!selectionStore.mask;
  const canFilter = !!activeLayer && activeLayer.kind !== "adjustment";
  const saveDocument = useDocumentStore((s) => s.saveDocument);
  const saveDocumentAs = useDocumentStore((s) => s.saveDocumentAs);
  const resizeImage = useDocumentStore((s) => s.resizeImage);
  const zoom = useViewportStore((s) => s.zoom);
  const fit = useViewportStore((s) => s.fit);
  const reset = useViewportStore((s) => s.reset);
  const setZoom = useViewportStore((s) => s.setZoom);
  const viewSize = useViewportStore((s) => s.viewSize);
  const setBrushSize = useEditorStore((s) => s.setBrushSize);
  const brushSize = useEditorStore((s) => s.brushSize);
  const setSystemFonts = useEditorStore((s) => s.setSystemFonts);
  const setForeground = useEditorStore((s) => s.setForeground);
  const setHoverColor = useEditorStore((s) => s.setHoverColor);
  const hoverColor = useEditorStore((s) => s.hoverColor);

  const [phase, setPhase] = useState<"splash" | "skeleton" | "ready">("splash");
  const [splashExiting, setSplashExiting] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId>("move");
  const previousToolRef = useRef<ToolId>("move");
  const [showGrid, setShowGrid] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showImageSize, setShowImageSize] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterSpec | null>(null);
  const fittedDocRef = useRef<string | null>(null);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setSplashExiting(true);
      initBlankDocument();
      setTimeout(() => {
        setPhase("skeleton");
        setTimeout(() => setPhase("ready"), SKELETON_MS);
      }, 400);
    }, SPLASH_MIN_MS);

    return () => clearTimeout(splashTimer);
  }, [initBlankDocument]);

  useEffect(() => {
    void listSystemFonts().then(setSystemFonts);
  }, [setSystemFonts]);

  useEffect(() => {
    if (phase !== "ready" || !document) return;
    if (viewSize.width < 32 || viewSize.height < 32) return;
    if (fittedDocRef.current === document.id) return;
    fittedDocRef.current = document.id;
    fit({ width: document.width, height: document.height });
  }, [document?.id, phase, viewSize.width, viewSize.height, fit]);

  useEffect(() => {
    if (activeTool !== "eyedropper") return;
    const timer = window.setInterval(() => {
      void sampleScreenColor().then((color) => {
        if (color) setHoverColor(color);
      });
    }, 40);
    return () => window.clearInterval(timer);
  }, [activeTool, setHoverColor]);

  useEffect(() => {
    if (activeTool !== "eyedropper") return;
    function onDown(e: PointerEvent) {
      const el = e.target as HTMLElement;
      if (el.closest("button, input, select, textarea, [role='menu'], [role='menuitem'], a")) return;
      if (hoverColor) setForeground(hoverColor);
      // Picking a colour is a means to an end, so hand the user back whatever
      // they were doing before they reached for the eyedropper.
      setActiveTool(previousToolRef.current);
    }
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [activeTool, hoverColor, setForeground]);

  const selectTool = useCallback(
    (next: ToolId) => {
      if (next === "eyedropper" && activeTool !== "eyedropper") previousToolRef.current = activeTool;
      setActiveTool(next);
    },
    [activeTool],
  );

  const handleNewDocument = useCallback(() => {
    setShowNew(true);
  }, []);

  const handleCopy = useCallback(
    async (cut: boolean) => {
      if (!activeLayer || !selectionStore.mask) return;

      const region = copySelectionRegion(activeLayer);
      if (!region) return;

      // Keep the canvas in process so Paste round-trips without re-encoding,
      // and mirror it onto the system clipboard for other applications.
      internalClipboard.canvas = region;
      const blob = await canvasToBlob(region);
      if (blob) await writeClipboardImage(new Uint8Array(await blob.arrayBuffer()));

      if (cut) {
        beginStroke("Cut");
        clearSelectionRegion(activeLayer);
        touchPixels();
      }
    },
    [activeLayer, beginStroke, touchPixels],
  );

  const runFilter = useCallback(
    (spec: FilterSpec, filter: Filter) => {
      if (!activeLayer) return;
      // FilterDialog has already put the original pixels back, so the history
      // entry opens on the unfiltered state.
      beginStroke(spec.name);
      const target = beginFilter(activeLayer);
      if (target) previewFilter(target, filter);
      touchPixels();
    },
    [activeLayer, beginStroke, touchPixels],
  );

  const handlePaste = useCallback(async () => {
    // Prefer the region we cut or copied ourselves; it is pixel-exact.
    if (internalClipboard.canvas) {
      const blob = await canvasToBlob(internalClipboard.canvas);
      if (blob) {
        await addImageLayer(blob, "Pasted");
        return;
      }
    }
    const clip = await readClipboardImage();
    if (clip) {
      await addImageLayer(clip.blob, "Pasted");
      return;
    }
    // Copying a file in File Explorer puts a CF_HDROP path list on the
    // clipboard, not a bitmap, so fall back to loading the file itself.
    for (const path of await readClipboardImagePaths()) {
      const file = await readImageAtPath(path);
      if (file) {
        await addImageLayer(file.blob, file.name);
        return;
      }
    }
  }, [addImageLayer]);

  const handleOpen = useCallback(async () => {
    const native = await openImagePath();
    if (native) {
      fittedDocRef.current = null;
      await openImageFile(native.blob, native.path, native.name);
      return;
    }
    const input = window.document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      fittedDocRef.current = null;
      await openImageFile(file);
    };
    input.click();
  }, [openImageFile]);

  const menus: MenuDefinition[] = useMemo(
    () => [
      {
        label: "File",
        items: [
          { label: "New…", shortcut: "Ctrl+N", action: handleNewDocument },
          { label: "Open…", shortcut: "Ctrl+O", action: () => void handleOpen() },
          { label: "Open Recent", disabled: true },
          { separator: true },
          { label: "Save", shortcut: "Ctrl+S", action: () => void saveDocument() },
          { label: "Save As…", shortcut: "Ctrl+Shift+S", action: () => void saveDocumentAs() },
          { separator: true },
          { label: "Export PNG…", disabled: true },
          { label: "Export JPEG…", disabled: true },
          { label: "Export WebP…", disabled: true },
          { separator: true },
          { label: "Exit", disabled: true },
        ],
      },
      {
        label: "Edit",
        items: [
          {
            label: undoLabel ? `Undo ${undoLabel}` : "Undo",
            shortcut: "Ctrl+Z",
            disabled: !canUndo,
            action: undo,
          },
          {
            label: redoLabel ? `Redo ${redoLabel}` : "Redo",
            shortcut: "Ctrl+Shift+Z",
            disabled: !canRedo,
            action: redo,
          },
          { separator: true },
          {
            label: "Cut",
            shortcut: "Ctrl+X",
            disabled: !hasSelection,
            action: () => void handleCopy(true),
          },
          {
            label: "Copy",
            shortcut: "Ctrl+C",
            disabled: !hasSelection,
            action: () => void handleCopy(false),
          },
          { label: "Paste", shortcut: "Ctrl+V", action: () => void handlePaste() },
        ],
      },
      {
        label: "Image",
        items: [
          { label: "Image Size…", shortcut: "Ctrl+Alt+I", action: () => setShowImageSize(true) },
          { separator: true },
          {
            label: "Adjustments",
            disabled: !canFilter,
            items: ADJUSTMENTS.map((spec) => ({
              label: spec.params.length ? `${spec.name}…` : spec.name,
              action: () => setActiveFilter(spec),
            })),
          },
          {
            label: "Filters",
            disabled: !canFilter,
            items: EFFECTS.map((spec) => ({
              label: `${spec.name}…`,
              action: () => setActiveFilter(spec),
            })),
          },
          { separator: true },
          { label: "Canvas Size…", disabled: true },
          { label: "Rotate Canvas", disabled: true },
          { label: "Flip Horizontal", disabled: true },
          { label: "Flip Vertical", disabled: true },
        ],
      },
      {
        label: "Layer",
        items: [
          { label: "New Layer", shortcut: "Ctrl+Shift+N", action: addEmptyLayer },
          { label: "New Fill Layer", action: () => addFillLayer() },
          { label: "Duplicate Layer", shortcut: "Ctrl+J", action: duplicateActiveLayer },
          { label: "Delete Layer", action: deleteActiveLayer },
          { separator: true },
          { label: "Layer Mask", disabled: true },
        ],
      },
      {
        label: "Select",
        items: [
          { label: "All", shortcut: "Ctrl+A", action: selectAll },
          { label: "Deselect", shortcut: "Ctrl+D", action: () => setSelection(null) },
          { label: "Inverse", shortcut: "Ctrl+Shift+I", disabled: true },
          { separator: true },
          { label: "Refine Edge…", disabled: true },
        ],
      },
      {
        label: "View",
        items: [
          {
            label: showGrid ? "Hide Grid" : "Show Grid",
            shortcut: "Ctrl+'",
            action: () => setShowGrid((v) => !v),
          },
          {
            label: "Zoom In",
            shortcut: "Ctrl++",
            action: () => document && setZoom(zoom * 1.25),
          },
          {
            label: "Zoom Out",
            shortcut: "Ctrl+-",
            action: () => document && setZoom(zoom / 1.25),
          },
          {
            label: "Fit to Screen",
            shortcut: "Ctrl+0",
            action: () => document && fit({ width: document.width, height: document.height }),
          },
          { label: "Actual Size", shortcut: "Ctrl+1", action: reset },
        ],
      },
      {
        label: "Filter",
        items: [
          { label: "Filter Gallery…", disabled: true },
          { label: "Apply Last Filter", shortcut: "Ctrl+F", disabled: true },
        ],
      },
      {
        label: "Help",
        items: [
          { label: "Keyboard Shortcuts", disabled: true },
          { label: "About Photovibe", action: () => setShowAbout(true) },
        ],
      },
    ],
    [
      handleNewDocument,
      handleOpen,
      handleCopy,
      hasSelection,
      canFilter,
      handlePaste,
      saveDocument,
      saveDocumentAs,
      showGrid,
      addEmptyLayer,
      addFillLayer,
      duplicateActiveLayer,
      deleteActiveLayer,
      document,
      setSelection,
      selectAll,
      zoom,
      setZoom,
      fit,
      reset,
      undo,
      redo,
      canUndo,
      canRedo,
      undoLabel,
      redoLabel,
    ],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) void saveDocumentAs();
        else void saveDocument();
        return;
      }
      if (shouldBlockBrowserShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const toolMap: Record<string, ToolId> = {
        a: "cursor",
        v: "move",
        m: "marquee",
        l: "lasso",
        w: "wand",
        c: "crop",
        i: "eyedropper",
        j: "heal",
        b: "brush",
        e: "eraser",
        t: "text",
        g: "gradient",
      };
      if (toolMap[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        selectTool(toolMap[key]);
      }
      if ((e.ctrlKey || e.metaKey) && key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.ctrlKey && key === "n" && e.shiftKey) {
        e.preventDefault();
        addEmptyLayer();
        return;
      }
      if (e.ctrlKey && key === "n") {
        e.preventDefault();
        handleNewDocument();
      }
      if (e.ctrlKey && key === "o") {
        e.preventDefault();
        void handleOpen();
      }
      if (e.ctrlKey && key === "d") {
        e.preventDefault();
        // Ctrl+D deselects when there is something to deselect, which is what
        // reaching for it during a selection almost always means.
        if (selectionStore.mask) setSelection(null);
        else duplicateActiveLayer();
        return;
      }
      if (e.ctrlKey && key === "j") {
        e.preventDefault();
        duplicateActiveLayer();
        return;
      }
      if (e.ctrlKey && (key === "c" || key === "x") && selectionStore.mask) {
        e.preventDefault();
        void handleCopy(key === "x");
        return;
      }
      if (e.ctrlKey && key === "v") {
        e.preventDefault();
        void handlePaste();
        return;
      }
      if (key === "escape") {
        setSelection(null);
      }
      if (e.ctrlKey && (key === "=" || key === "+")) {
        e.preventDefault();
        setZoom(zoom * 1.25);
      }
      if (e.ctrlKey && key === "-") {
        e.preventDefault();
        setZoom(zoom / 1.25);
      }
      if (e.ctrlKey && key === "0") {
        e.preventDefault();
        if (document) fit({ width: document.width, height: document.height });
      }
      if (e.ctrlKey && key === "1") {
        e.preventDefault();
        reset();
      }
      if (e.ctrlKey && key === "'") {
        e.preventDefault();
        setShowGrid((v) => !v);
      }
      if (e.ctrlKey && key === "a") {
        e.preventDefault();
        selectAll();
      }
      if (key === "[" && !e.ctrlKey) {
        setBrushSize(brushSize - 4);
      }
      if (key === "]" && !e.ctrlKey) {
        setBrushSize(brushSize + 4);
      }
    }

    async function onPaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.items ?? [])].find((entry) => entry.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      e.preventDefault();
      await addImageLayer(file, "Pasted");
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("paste", onPaste);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [
    handleNewDocument,
    handleOpen,
    handleCopy,
    handlePaste,
    selectTool,
    saveDocument,
    saveDocumentAs,
    addEmptyLayer,
    duplicateActiveLayer,
    document,
    zoom,
    setZoom,
    fit,
    reset,
    undo,
    redo,
    setSelection,
    selectAll,
    setBrushSize,
    brushSize,
    addImageLayer,
  ]);

  const isLoading = phase !== "ready";

  if (phase === "splash") {
    return <SplashScreen exiting={splashExiting} />;
  }

  return (
    <div className={`pv-fade-in relative flex h-full flex-col bg-surface-0 ${activeTool === "eyedropper" ? "pv-cursor-eyedropper" : ""}`}>
      <MenuBar menus={menus} />
      <OptionsBar activeTool={activeTool} />
      <div className="flex min-h-0 flex-1">
        <Toolbar activeTool={activeTool} onToolChange={(id) => selectTool(id as ToolId)} />
        <CanvasViewport
          showGrid={showGrid}
          loading={isLoading}
          activeTool={activeTool}
          onToolChange={selectTool}
        />
        <InspectorPanel loading={isLoading} />
      </div>
      <StatusBar activeTool={activeTool} zoom={zoom} documentReady={!!document && !isLoading} />
      {showNew && (
        <NewDocumentDialog
          onCancel={() => setShowNew(false)}
          onCreate={(options) => {
            fittedDocRef.current = null;
            void newDocument(options);
            setShowNew(false);
          }}
        />
      )}
      {showImageSize && document && (
        <ImageSizeDialog
          width={document.width}
          height={document.height}
          onCancel={() => setShowImageSize(false)}
          onApply={(width, height) => {
            resizeImage(width, height);
            fittedDocRef.current = null;
            setShowImageSize(false);
          }}
        />
      )}
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      {activeFilter && activeLayer && (
        <FilterDialog
          spec={activeFilter}
          layer={activeLayer}
          scopedToSelection={hasSelection}
          onApply={(filter) => runFilter(activeFilter, filter)}
          onClose={() => setActiveFilter(null)}
        />
      )}
    </div>
  );
}
