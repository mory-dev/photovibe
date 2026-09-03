export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export interface FloodSelectResult {
  mask: Uint8Array;
  bounds: { x: number; y: number; width: number; height: number };
  count: number;
}

export function colorsMatch(
  data: Uint8ClampedArray | Uint8Array,
  offset: number,
  tr: number,
  tg: number,
  tb: number,
  ta: number,
  tolerance: number,
): boolean {
  const da = Math.abs(data[offset + 3] - ta);
  if (ta < 8 && data[offset + 3] < 8) return true;
  const dist = Math.hypot(data[offset] - tr, data[offset + 1] - tg, data[offset + 2] - tb) + da * 0.35;
  return dist <= tolerance;
}

export function floodSelect(
  image: PixelBuffer,
  startX: number,
  startY: number,
  tolerance = 40,
): FloodSelectResult | null {
  const { width, height, data } = image;
  if (width < 1 || height < 1) return null;
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(startX)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(startY)));
  const i0 = (x0 + y0 * width) * 4;
  const tr = data[i0];
  const tg = data[i0 + 1];
  const tb = data[i0 + 2];
  const ta = data[i0 + 3];
  const seen = new Uint8Array(width * height);
  const mask = new Uint8Array(width * height);
  const stack = [x0, y0];

  const match = (x: number, y: number) => colorsMatch(data, (x + y * width) * 4, tr, tg, tb, ta, tolerance);

  let minX = x0;
  let minY = y0;
  let maxX = x0;
  let maxY = y0;
  let count = 0;

  while (stack.length) {
    const y = stack.pop() as number;
    let x = stack.pop() as number;
    while (x >= 0 && !seen[x + y * width] && match(x, y)) x -= 1;
    x += 1;
    let spanUp = false;
    let spanDown = false;
    while (x < width && !seen[x + y * width] && match(x, y)) {
      const key = x + y * width;
      seen[key] = 1;
      mask[key] = 1;
      count += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (y > 0) {
        const up = !seen[x + (y - 1) * width] && match(x, y - 1);
        if (!spanUp && up) {
          stack.push(x, y - 1);
          spanUp = true;
        } else if (spanUp && !up) {
          spanUp = false;
        }
      }
      if (y < height - 1) {
        const down = !seen[x + (y + 1) * width] && match(x, y + 1);
        if (!spanDown && down) {
          stack.push(x, y + 1);
          spanDown = true;
        } else if (spanDown && !down) {
          spanDown = false;
        }
      }
      x += 1;
    }
  }

  if (count === 0) return null;
  return { mask, bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }, count };
}

export function rectOutline(bounds: { x: number; y: number; width: number; height: number }) {
  const { x, y, width, height } = bounds;
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
    { x, y },
  ];
}
