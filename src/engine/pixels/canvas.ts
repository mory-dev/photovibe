import { cloneTextureSource, pixelStore } from "./pixel-store";

export function getMutableCanvas(layerId: string): HTMLCanvasElement | null {
  const source = pixelStore.get(layerId);
  if (!source) return null;
  if (source instanceof HTMLCanvasElement) return source;
  const canvas = cloneTextureSource(source);
  pixelStore.set(layerId, canvas);
  return canvas;
}

export function sampleCanvasAlpha(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return 0;
  return ctx.getImageData(px, py, 1, 1).data[3];
}
