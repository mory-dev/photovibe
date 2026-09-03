import { useState, type ReactNode } from "react";
import { Brush, Copy, Eye, EyeOff, Image as ImageIcon, Layers, Plus, Square, Trash2, Type } from "lucide-react";
import { BLEND_MODES, type BlendMode } from "../engine/document/types";
import { layerCategory } from "../lib/layer-meta";
import { cn } from "../lib/utils";
import { colorToCss } from "../engine/pixels/generate";
import { useActiveLayer, useDocumentStore } from "../store/document-store";
import { useEditorStore } from "../store/editor-store";
import { ColorPickerDialog } from "./ColorPickerDialog";
import { ContextMenu, type ContextMenuState } from "./ContextMenu";
import { Slider } from "./ui/Slider";
import { Skeleton } from "./ui/Skeleton";

interface InspectorPanelProps {
  loading?: boolean;
}

export function InspectorPanel({ loading }: InspectorPanelProps) {
  const document = useDocumentStore((s) => s.document);
  const activeLayer = useActiveLayer();
  const setActiveLayer = useDocumentStore((s) => s.setActiveLayer);
  const setLayerVisibility = useDocumentStore((s) => s.setLayerVisibility);
  const setLayerOpacity = useDocumentStore((s) => s.setLayerOpacity);
  const setLayerBlendMode = useDocumentStore((s) => s.setLayerBlendMode);
  const addFillLayer = useDocumentStore((s) => s.addFillLayer);
  const addEmptyLayer = useDocumentStore((s) => s.addEmptyLayer);
  const duplicateActiveLayer = useDocumentStore((s) => s.duplicateActiveLayer);
  const deleteActiveLayer = useDocumentStore((s) => s.deleteActiveLayer);
  const foreground = useEditorStore((s) => s.foreground);
  const brushSize = useEditorStore((s) => s.brushSize);
  const setBrushSize = useEditorStore((s) => s.setBrushSize);
  const setForeground = useEditorStore((s) => s.setForeground);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  if (loading || !document) {
    return (
      <aside className="flex h-full w-64 flex-col border-l border-border bg-surface-1">
        <SectionHeader>Properties</SectionHeader>
        <div className="space-y-3 p-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <SectionHeader>Layers</SectionHeader>
        <div className="space-y-2 p-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </aside>
    );
  }

  const layersTopFirst = [...document.layers].reverse();

  return (
    <aside
      className="flex h-full w-64 flex-col border-l border-border bg-surface-1"
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            { label: "New Layer", shortcut: "Ctrl+Shift+N", action: addEmptyLayer },
            { label: "New Fill Layer", action: () => addFillLayer() },
            { label: "Duplicate Layer", shortcut: "Ctrl+D", action: duplicateActiveLayer },
            { label: "Delete Layer", danger: true, disabled: document.layers.length <= 1, action: deleteActiveLayer },
          ],
        });
      }}
    >
      <SectionHeader>Properties</SectionHeader>
      <div className="shrink-0 border-b border-border p-3 text-[11px]">
        {activeLayer ? (
          <dl className="space-y-2.5">
            <Prop label="Document" value={`${document.width} × ${document.height}px`} />
            <Prop label="Active layer" value={activeLayer.name} />
            <Prop label="Type" value={layerCategory(activeLayer)} />
            <Prop label="Blend mode" value={activeLayer.blendMode} />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded text-left hover:bg-surface-2"
              onClick={() => setPickerOpen(true)}
              title="Choose foreground color"
            >
              <div
                className="h-6 w-6 shrink-0 rounded border border-border"
                style={{ background: colorToCss(foreground) }}
              />
              <div>
                <div className="text-text-muted">Color</div>
                <div className="text-text">
                  {Math.round(foreground.r)}, {Math.round(foreground.g)}, {Math.round(foreground.b)}
                </div>
              </div>
            </button>
            <Slider label={`Brush ${brushSize}px`} min={1} max={120} value={brushSize} onChange={setBrushSize} />
          </dl>
        ) : (
          <p className="text-text-muted">No layer selected</p>
        )}
      </div>

      <SectionHeader>Layers</SectionHeader>
      <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {layersTopFirst.map((layer) => {
          const isActive = layer.id === document.activeLayerId;
          const category = layerCategory(layer);
          return (
            <li
              key={layer.id}
              className={cn(
                "mb-0.5 rounded-md px-2 py-1.5 transition-colors",
                isActive ? "bg-surface-3 ring-1 ring-accent/30" : "hover:bg-surface-2",
              )}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveLayer(layer.id);
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    { label: layer.visible ? "Hide Layer" : "Show Layer", action: () => setLayerVisibility(layer.id, !layer.visible) },
                    { label: "Duplicate Layer", shortcut: "Ctrl+D", action: duplicateActiveLayer },
                    { label: "New Layer", shortcut: "Ctrl+Shift+N", action: addEmptyLayer },
                    { label: "Delete Layer", danger: true, disabled: document.layers.length <= 1, action: deleteActiveLayer },
                  ],
                });
              }}
            >
              <button type="button" className="w-full text-left" onClick={() => setActiveLayer(layer.id)}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="shrink-0 text-text-muted transition-colors hover:text-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLayerVisibility(layer.id, !layer.visible);
                    }}
                    aria-label={layer.visible ? "Hide layer" : "Show layer"}
                  >
                    {layer.visible ? (
                      <Eye size={13} strokeWidth={1.5} />
                    ) : (
                      <EyeOff size={13} strokeWidth={1.5} className="opacity-50" />
                    )}
                  </button>
                  <LayerTypeIcon category={category} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] text-text">{layer.name}</span>
                    <span className="block text-[9px] uppercase tracking-wide text-text-muted">{category}</span>
                  </div>
                </div>
                {isActive && (
                  <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Slider
                      label={`Opacity ${Math.round(layer.opacity * 100)}%`}
                      value={Math.round(layer.opacity * 100)}
                      onChange={(v) => setLayerOpacity(layer.id, v / 100)}
                    />
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted">Blend mode</span>
                      <select
                        value={layer.blendMode}
                        onChange={(e) => setLayerBlendMode(layer.id, e.target.value as BlendMode)}
                        className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] text-text outline-none focus:border-accent/50"
                      >
                        {BLEND_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="flex items-center gap-1 border-t border-border px-1.5 py-1">
        <IconButton label="New fill layer" onClick={() => addFillLayer()}>
          <Plus size={13} />
        </IconButton>
        <IconButton label="Duplicate layer" onClick={duplicateActiveLayer}>
          <Copy size={12} />
        </IconButton>
        <IconButton label="Delete layer" onClick={deleteActiveLayer} disabled={document.layers.length <= 1}>
          <Trash2 size={12} />
        </IconButton>
      </footer>
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
      {pickerOpen && (
        <ColorPickerDialog color={foreground} onChange={setForeground} onClose={() => setPickerOpen(false)} />
      )}
    </aside>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <header className="flex h-7 shrink-0 items-center border-b border-border px-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
      {children}
    </header>
  );
}

function Prop({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="mt-0.5 capitalize text-text">{value}</dd>
    </div>
  );
}

function LayerTypeIcon({ category }: { category: ReturnType<typeof layerCategory> }) {
  const className = "shrink-0 text-accent/80";
  if (category === "Text") return <Type size={12} className={className} />;
  if (category === "Background") return <Square size={12} className={className} />;
  if (category === "Fill") return <Layers size={12} className={className} />;
  if (category === "Paint") return <Brush size={12} className={className} />;
  return <ImageIcon size={12} className={className} />;
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
