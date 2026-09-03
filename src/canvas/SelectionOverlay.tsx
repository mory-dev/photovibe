import { selectionStore } from "../engine/selections/selection-store";
import { useSelectionGeneration } from "../hooks/use-selection";
import { antsPoints } from "./marching-ants";
import { MarchingAntsPolyline } from "./MarchingAntsPolyline";

interface SelectionOverlayProps {
  viewX: number;
  viewY: number;
  zoom: number;
}

export function SelectionOverlay({ viewX, viewY, zoom }: SelectionOverlayProps) {
  useSelectionGeneration();
  const mask = selectionStore.mask;
  const path = selectionStore.path;
  const ox = selectionStore.offsetX + selectionStore.floatX;
  const oy = selectionStore.offsetY + selectionStore.floatY;

  if (!mask && !selectionStore.floating) return null;

  const outlines: Array<Array<{ x: number; y: number }>> =
    path?.kind === "wand" && path.contours && path.contours.length > 0
      ? path.contours
      : path?.kind === "lasso" || path?.kind === "wand"
        ? [path.points]
        : path?.kind === "rect"
          ? [
              [
                { x: path.x, y: path.y },
                { x: path.x + path.width, y: path.y },
                { x: path.x + path.width, y: path.y + path.height },
                { x: path.x, y: path.y + path.height },
                { x: path.x, y: path.y },
              ],
            ]
          : [];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {mask && path?.kind !== "lasso" && (
        <canvas
          className="absolute"
          width={mask.width}
          height={mask.height}
          style={{
            left: viewX + ox * zoom,
            top: viewY + oy * zoom,
            width: mask.width * zoom,
            height: mask.height * zoom,
            opacity: 0.28,
          }}
          ref={(node) => {
            if (!node) return;
            const ctx = node.getContext("2d");
            if (!ctx) return;
            ctx.clearRect(0, 0, node.width, node.height);
            ctx.drawImage(mask, 0, 0);
            ctx.globalCompositeOperation = "source-in";
            ctx.fillStyle = "#c4a574";
            ctx.fillRect(0, 0, node.width, node.height);
          }}
        />
      )}
      {outlines.length > 0 && (
        <svg className="absolute inset-0 h-full w-full">
          {outlines.map((outline, index) =>
            outline.length > 1 ? (
              <MarchingAntsPolyline key={index} points={antsPoints(outline, viewX, viewY, zoom, ox, oy)} />
            ) : null,
          )}
        </svg>
      )}
      {selectionStore.floating && (
        // Drawn rather than encoded: this repaints on every pointer move, and
        // toDataURL would re-encode a document-sized PNG each frame.
        <canvas
          className="absolute"
          width={selectionStore.floating.width}
          height={selectionStore.floating.height}
          style={{
            left: viewX + ox * zoom,
            top: viewY + oy * zoom,
            width: selectionStore.floating.width * zoom,
            height: selectionStore.floating.height * zoom,
          }}
          ref={(node) => {
            const floating = selectionStore.floating;
            if (!node || !floating) return;
            const ctx = node.getContext("2d");
            if (!ctx) return;
            ctx.clearRect(0, 0, node.width, node.height);
            ctx.drawImage(floating, 0, 0);
          }}
        />
      )}
    </div>
  );
}
