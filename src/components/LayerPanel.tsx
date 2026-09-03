import type { ReactNode } from "react";
import { Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useDocumentStore } from "../store/document-store";
import { BLEND_MODES, type BlendMode } from "../engine/document/types";
import { cn } from "../lib/utils";
import { Slider } from "./ui/Slider";
import { LayerPanelSkeleton } from "./ui/Skeleton";

export function LayerPanel() {
  const document = useDocumentStore((s) => s.document);
  const setActiveLayer = useDocumentStore((s) => s.setActiveLayer);
  const setLayerVisibility = useDocumentStore((s) => s.setLayerVisibility);
  const setLayerOpacity = useDocumentStore((s) => s.setLayerOpacity);
  const setLayerBlendMode = useDocumentStore((s) => s.setLayerBlendMode);
  const addFillLayer = useDocumentStore((s) => s.addFillLayer);
  const duplicateActiveLayer = useDocumentStore((s) => s.duplicateActiveLayer);
  const deleteActiveLayer = useDocumentStore((s) => s.deleteActiveLayer);

  if (!document) return <LayerPanelSkeleton />;

  const layersTopFirst = [...document.layers].reverse();

  return (
    <aside className="flex h-full w-56 flex-col border-l border-border bg-surface-1">
      <header className="flex h-7 items-center border-b border-border px-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        Layers
      </header>
      <ul className="flex-1 overflow-y-auto p-1.5">
        {layersTopFirst.map((layer) => {
          const isActive = layer.id === document.activeLayerId;

          return (
            <li
              key={layer.id}
              className={cn(
                "mb-0.5 rounded-md px-2 py-1.5 transition-colors",
                isActive
                  ? "bg-surface-3 ring-1 ring-accent/30"
                  : "hover:bg-surface-2",
              )}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setActiveLayer(layer.id)}
              >
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
                  <span className="truncate text-[11px] text-text">{layer.name}</span>
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
                        onChange={(e) =>
                          setLayerBlendMode(layer.id, e.target.value as BlendMode)
                        }
                        className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] text-text outline-none transition-colors focus:border-accent/50"
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
        <IconButton
          label="Delete layer"
          onClick={deleteActiveLayer}
          disabled={document.layers.length <= 1}
        >
          <Trash2 size={12} />
        </IconButton>
      </footer>
    </aside>
  );
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
