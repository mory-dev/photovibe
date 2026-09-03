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
import { listSystemFonts, openImagePath, readClipboardImage, sampleScreenColor } from "../lib/native";
import { useDocumentStore } from "../store/document-store";
import { useEditorStore } from "../store/editor-store";
import { useViewportStore } from "../store/viewport-store";

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
  const [showGrid, setShowGrid] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showImageSize, setShowImageSize] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
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

  const handleNewDocument = useCallback(() => {
    setShowNew(true);
  }, []);

  const handlePaste = useCallback(async () => {
    const clip = await readClipboardImage();
    if (!clip) return;
    await addImageLayer(clip.blob, "Pasted");
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
          { label: "Cut", shortcut: "Ctrl+X", disabled: true },
          { label: "Copy", shortcut: "Ctrl+C", disabled: true },
          { label: "Paste", shortcut: "Ctrl+V", action: () => void handlePaste() },
        ],
      },
      {
        label: "Image",
        items: [
          { label: "Adjust…", shortcut: "Ctrl+Alt+I", action: () => setShowImageSize(true) },
          { label: "Image Size…", action: () => setShowImageSize(true) },
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
          { label: "Duplicate Layer", shortcut: "Ctrl+D", action: duplicateActiveLayer },
          { label: "Delete Layer", action: deleteActiveLayer },
          { separator: true },
          { label: "Layer Mask", disabled: true },
        ],
      },
      {
        label: "Select",
        items: [
          { label: "All", shortcut: "Ctrl+A", action: selectAll },
          { label: "Deselect", shortcut: "Esc", action: () => setSelection(null) },
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
        setActiveTool(toolMap[key]);
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
      if (e.ctrlKey && (key === "j" || key === "d")) {
        e.preventDefault();
        duplicateActiveLayer();
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
    handlePaste,
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
    <div className="pv-fade-in relative flex h-full flex-col bg-surface-0">
      <MenuBar menus={menus} />
      <OptionsBar activeTool={activeTool} />
      <div className="flex min-h-0 flex-1">
        <Toolbar activeTool={activeTool} onToolChange={(id) => setActiveTool(id as ToolId)} />
        <CanvasViewport
          showGrid={showGrid}
          loading={isLoading}
          activeTool={activeTool}
          onToolChange={setActiveTool}
        />
        <InspectorPanel loading={isLoading} />
      </div>
      <StatusBar activeTool={activeTool} zoom={zoom} documentReady={!!document && !isLoading} />
      {activeTool === "eyedropper" && (
        <div
          className="pv-cursor-eyedropper fixed inset-0 z-[70]"
          onPointerDown={() => {
            if (hoverColor) setForeground(hoverColor);
          }}
        />
      )}
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
    </div>
  );
}
