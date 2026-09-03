import type { Color } from "../document/types";
import { colorToCss } from "./generate";

export function stampBrush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: Color,
  erase: boolean,
): void {
  ctx.save();
  ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
  ctx.fillStyle = erase ? "rgba(0,0,0,1)" : colorToCss(color);
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function strokeBrushes(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
  color: Color,
  erase: boolean,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(1, radius * 0.35);
  const count = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    stampBrush(ctx, from.x + dx * t, from.y + dy * t, radius, color, erase);
  }
}
