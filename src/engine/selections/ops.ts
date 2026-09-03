import type { Selection } from "../document/types";

export function normalizeRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

export function rectSelection(bounds: { x: number; y: number; width: number; height: number }): Selection {
  return { mask: null, bounds };
}

export function pointInPolygon(x: number, y: number, points: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.00001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function lassoBounds(points: Array<{ x: number; y: number }>) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function magicWandBounds(
  image: ImageData,
  startX: number,
  startY: number,
  tolerance = 32,
): { x: number; y: number; width: number; height: number } | null {
  const { width, height, data } = image;
  const x0 = Math.floor(startX);
  const y0 = Math.floor(startY);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return null;

  const idx = (x0 + y0 * width) * 4;
  const tr = data[idx];
  const tg = data[idx + 1];
  const tb = data[idx + 2];
  const ta = data[idx + 3];
  const seen = new Uint8Array(width * height);
  const queue = [x0, y0];
  seen[x0 + y0 * width] = 1;

  let minX = x0;
  let minY = y0;
  let maxX = x0;
  let maxY = y0;

  const matches = (x: number, y: number) => {
    const i = (x + y * width) * 4;
    return (
      Math.abs(data[i] - tr) <= tolerance &&
      Math.abs(data[i + 1] - tg) <= tolerance &&
      Math.abs(data[i + 2] - tb) <= tolerance &&
      Math.abs(data[i + 3] - ta) <= tolerance
    );
  };

  while (queue.length) {
    const y = queue.pop() as number;
    const x = queue.pop() as number;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    const neighbors = [x - 1, y, x + 1, y, x, y - 1, x, y + 1];
    for (let n = 0; n < neighbors.length; n += 2) {
      const nx = neighbors[n];
      const ny = neighbors[n + 1];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const key = nx + ny * width;
      if (seen[key]) continue;
      if (!matches(nx, ny)) continue;
      seen[key] = 1;
      queue.push(nx, ny);
    }
  }

  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
