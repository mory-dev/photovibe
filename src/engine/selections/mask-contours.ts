export interface ContourPoint {
  x: number;
  y: number;
}

function on(mask: Uint8Array, width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height && mask[x + y * width] !== 0;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

export function maskEdgeSegments(mask: Uint8Array, width: number, height: number): Array<[ContourPoint, ContourPoint]> {
  const segments: Array<[ContourPoint, ContourPoint]> = [];
  const add = (ax: number, ay: number, bx: number, by: number) => {
    segments.push([
      { x: ax, y: ay },
      { x: bx, y: by },
    ]);
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!on(mask, width, height, x, y)) continue;
      if (!on(mask, width, height, x - 1, y)) add(x, y, x, y + 1);
      if (!on(mask, width, height, x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!on(mask, width, height, x, y - 1)) add(x, y, x + 1, y);
      if (!on(mask, width, height, x, y + 1)) add(x, y + 1, x + 1, y + 1);
    }
  }
  return segments;
}

export function maskContours(mask: Uint8Array, width: number, height: number): ContourPoint[][] {
  const segments = maskEdgeSegments(mask, width, height);
  if (!segments.length) return [];

  const neighbors = new Map<string, ContourPoint[]>();
  const addEdge = (from: ContourPoint, to: ContourPoint) => {
    const list = neighbors.get(key(from.x, from.y)) ?? [];
    list.push(to);
    neighbors.set(key(from.x, from.y), list);
  };
  for (const [a, b] of segments) {
    addEdge(a, b);
    addEdge(b, a);
  }

  const used = new Set<string>();
  const edgeId = (a: ContourPoint, b: ContourPoint) => {
    const left = a.x < b.x || (a.x === b.x && a.y <= b.y) ? a : b;
    const right = left === a ? b : a;
    return `${key(left.x, left.y)}>${key(right.x, right.y)}`;
  };

  const takeNext = (from: ContourPoint): ContourPoint | null => {
    const list = neighbors.get(key(from.x, from.y));
    if (!list) return null;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const next = list[i];
      const id = edgeId(from, next);
      if (used.has(id)) continue;
      used.add(id);
      list.splice(i, 1);
      return next;
    }
    return null;
  };

  const contours: ContourPoint[][] = [];
  for (const [a] of segments) {
    const first = takeNext(a);
    if (!first) continue;
    const contour: ContourPoint[] = [a, first];
    let current = first;
    while (current.x !== a.x || current.y !== a.y) {
      const next = takeNext(current);
      if (!next) break;
      contour.push(next);
      current = next;
      if (contour.length > width * height * 8) break;
    }
    if (contour.length >= 3) contours.push(contour);
  }

  return contours;
}
