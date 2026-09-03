import type { ToolId } from "./Toolbar";
import { colorToCss } from "../engine/pixels/generate";
import { formatBrushSize } from "../lib/round-brush-size";
import { useEditorStore } from "../store/editor-store";
import { Slider } from "./ui/Slider";


interface OptionsBarProps {
  activeTool: ToolId;
}

export function OptionsBar({ activeTool }: OptionsBarProps) {
  const foreground = useEditorStore((s) => s.foreground);
  const hoverColor = useEditorStore((s) => s.hoverColor);
  const brushSize = useEditorStore((s) => s.brushSize);
  const setBrushSize = useEditorStore((s) => s.setBrushSize);
  const fontFamily = useEditorStore((s) => s.fontFamily);
  const fontSize = useEditorStore((s) => s.fontSize);
  const systemFonts = useEditorStore((s) => s.systemFonts);
  const setFontFamily = useEditorStore((s) => s.setFontFamily);
  const setFontSize = useEditorStore((s) => s.setFontSize);

  return (
    <div className="flex h-8 items-center gap-3 border-b border-border bg-surface-1 px-3 text-[11px]">
      {(activeTool === "brush" || activeTool === "eraser" || activeTool === "eyedropper" || activeTool === "text") && (
        <ColorChip color={hoverColor ?? foreground} label={hoverColor ? "Hover" : "Color"} />
      )}
      {(activeTool === "brush" || activeTool === "eraser" || activeTool === "heal") && (
        <label className="flex w-44 items-center gap-2 text-text-muted">
          Size
          <Slider value={brushSize} min={1} max={120} onChange={setBrushSize} className="flex flex-1 items-center" />
          <span className="w-10 text-text">{formatBrushSize(brushSize)}</span>
        </label>
      )}
      {activeTool === "text" && (
        <>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="rounded border border-border bg-surface-2 px-2 py-0.5 text-text"
          >
            {systemFonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-text-muted">
            Size
            <input
              type="number"
              min={8}
              max={400}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-14 rounded border border-border bg-surface-2 px-1 py-0.5 text-text"
            />
          </label>
        </>
      )}
      {activeTool === "cursor" && <span className="text-text-muted">Click a layer on the canvas to select it.</span>}
      {activeTool === "marquee" && <span className="text-text-muted">Drag to select pixels. Move tool cuts and moves the selection.</span>}
      {activeTool === "lasso" && <span className="text-text-muted">Draw around the pixels to select.</span>}
      {activeTool === "wand" && <span className="text-text-muted">Click a color to select connected pixels.</span>}
      {activeTool === "crop" && <span className="text-text-muted">Drag a box or the canvas corners. Enter applies, Esc resets.</span>}
      {activeTool === "move" && <span className="text-text-muted">Drag a layer. Alt-drag moves the current selection.</span>}
      {activeTool === "brush" && <span className="text-text-muted">Paint. Ctrl+Alt+right-drag changes size.</span>}
      {activeTool === "eraser" && <span className="text-text-muted">Erase. Ctrl+Alt+right-drag changes size.</span>}
      {activeTool === "eyedropper" && <span className="text-text-muted">Hover to preview. Click to set the brush color.</span>}
    </div>
  );
}

function ColorChip({ color, label }: { color: { r: number; g: number; b: number; a: number }; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-5 w-5 rounded-sm border border-black/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
        style={{ background: colorToCss(color) }}
      />
      <span className="text-text-muted">{label}</span>
    </div>
  );
}
