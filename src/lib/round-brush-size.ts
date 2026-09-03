export const BRUSH_SIZE_MIN = 1;
export const BRUSH_SIZE_MAX = 200;

export function roundBrushSize(size: number): number {
  if (!Number.isFinite(size)) return BRUSH_SIZE_MIN;
  return Math.min(BRUSH_SIZE_MAX, Math.max(BRUSH_SIZE_MIN, Math.round(size)));
}

export function formatBrushSize(size: number): string {
  return `${roundBrushSize(size)}px`;
}
