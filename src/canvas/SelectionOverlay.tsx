import { selectionStore } from "../engine/selections/selection-store";
import { useSelectionGeneration } from "../hooks/use-selection";

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

  const outlinePoints =
    path?.kind === "lasso" || path?.kind === "wand"
      ? path.points
      : path?.kind === "rect"
        ? [
            { x: path.x, y: path.y },
            { x: path.x + path.width, y: path.y },
            { x: path.x + path.width, y: path.y + path.height },
            { x: path.x, y: path.y + path.height },
            { x: path.x, y: path.y },
          ]
        : null;

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
      {outlinePoints && outlinePoints.length > 1 && (
        <svg className="absolute inset-0 h-full w-full">
          <polyline
            fill="none"
            stroke="#fff"
            strokeWidth="1"
            strokeDasharray="5 4"
            className="pv-ants"
            points={outlinePoints
              .map((p) => `${viewX + (p.x + ox) * zoom},${viewY + (p.y + oy) * zoom}`)
              .join(" ")}
          />
        </svg>
      )}
      {selectionStore.floating && (
        <img
          alt=""
          src={selectionStore.floating.toDataURL()}
          className="absolute"
          style={{
            left: viewX + ox * zoom,
            top: viewY + oy * zoom,
            width: selectionStore.floating.width * zoom,
            height: selectionStore.floating.height * zoom,
          }}
        />
      )}
    </div>
  );
}
