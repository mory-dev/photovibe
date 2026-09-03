import type { Color } from "../document/types";
import { pixelStore } from "./pixel-store";

export function colorToCss(color: Color): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
}

export function createSolidCanvas(width: number, height: number, color: Color): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = colorToCss(color);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export function rasterizeText(
  text: string,
  fontFamily: string,
  fontSize: number,
  color: Color,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d");
  if (!measure) return canvas;
  measure.font = `${fontSize}px "${fontFamily}"`;
  canvas.width = Math.max(1, Math.ceil(measure.measureText(text).width));
  canvas.height = Math.max(1, Math.ceil(fontSize * 1.2));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.font = `${fontSize}px "${fontFamily}"`;
  ctx.fillStyle = colorToCss(color);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(text, 0, 0);
  return canvas;
}

export function createTransparentCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function createSoftCircleCanvas(
  size: number,
  color: Color,
  padding = 0.18,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * (0.5 - padding);
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius);
  gradient.addColorStop(0, colorToCss({ ...color, a: color.a }));
  gradient.addColorStop(1, colorToCss({ ...color, a: 0 }));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export async function canvasFromFile(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

export function assignLayerPixels(layerId: string, source: HTMLCanvasElement): void {
  pixelStore.set(layerId, source);
}
