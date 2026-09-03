import type { Document } from "../document/types";
import { pixelStore } from "./pixel-store";
import { colorToCss } from "./generate";

export function flattenDocumentToCanvas(doc: Document): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = colorToCss(doc.backgroundColor);
  ctx.fillRect(0, 0, doc.width, doc.height);
  for (const layer of doc.layers) {
    if (!layer.visible || layer.kind === "adjustment") continue;
    const source = pixelStore.get(layer.id);
    if (!source) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(source as CanvasImageSource, layer.transform.x, layer.transform.y);
    ctx.restore();
  }
  return canvas;
}

export async function flattenToBytes(doc: Document, path: string): Promise<Uint8Array> {
  const canvas = flattenDocumentToCanvas(doc);
  const ext = path.split(".").pop()?.toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Could not encode image"))), mime, 0.92);
  });
  return new Uint8Array(await blob.arrayBuffer());
}
