import type { BlendMode, Document, Layer } from "../engine/document/types";
import { sampleCanvasAlpha } from "../engine/pixels/canvas";
import { pixelStore } from "../engine/pixels/pixel-store";
import type { ViewportState } from "./viewport";
import { documentRect } from "./viewport";

const BLEND_TO_COMPOSITE: Record<BlendMode, GlobalCompositeOperation> = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  softLight: "soft-light",
  hardLight: "hard-light",
  colorDodge: "color-dodge",
  colorBurn: "color-burn",
  darken: "darken",
  lighten: "lighten",
  difference: "difference",
  exclusion: "exclusion",
  luminosity: "luminosity",
};

export function drawDocument2D(
  ctx: CanvasRenderingContext2D,
  document: Document,
  camera: ViewportState,
  viewWidth: number,
  viewHeight: number,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#161616";
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  const rect = documentRect(camera, { width: viewWidth, height: viewHeight }, document);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();

  drawCheckerboard(ctx, rect.x, rect.y, rect.width, rect.height, 8 * Math.max(camera.zoom, 0.5));

  ctx.translate(rect.x, rect.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.imageSmoothingEnabled = camera.zoom < 1;
  paintDocumentLayers(ctx, document);
  ctx.restore();
}

export function paintDocumentLayers(ctx: CanvasRenderingContext2D, document: Document, skipLayerId?: string): void {
  for (const layer of document.layers) {
    if (!layer.visible || layer.opacity <= 0 || layer.kind === "adjustment") continue;
    if (skipLayerId && layer.id === skipLayerId) continue;
    const source = pixelStore.get(layer.id);
    if (!source) continue;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = BLEND_TO_COMPOSITE[layer.blendMode] ?? "source-over";
    ctx.translate(layer.transform.x, layer.transform.y);
    ctx.scale(layer.transform.scaleX, layer.transform.scaleY);
    ctx.drawImage(source as CanvasImageSource, 0, 0);
    ctx.restore();
  }
}

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  size: number,
): void {
  ctx.fillStyle = "#262626";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#2e2e2e";
  const startCol = 0;
  const startRow = 0;
  const cols = Math.ceil(width / size);
  const rows = Math.ceil(height / size);
  for (let row = startRow; row < rows; row += 1) {
    for (let col = startCol; col < cols; col += 1) {
      if ((row + col) % 2 === 0) continue;
      ctx.fillRect(x + col * size, y + row * size, size, size);
    }
  }
}

/** Document-space slop around a text layer, so near misses still grab it. */
const TEXT_HIT_PADDING = 6;

export function hitTestLayer(document: Document, docX: number, docY: number): Layer | undefined {
  for (let i = document.layers.length - 1; i >= 0; i -= 1) {
    const layer = document.layers[i];
    if (!layer.visible || layer.kind === "adjustment") continue;
    const source = pixelStore.get(layer.id);
    if (!source) continue;
    const x = layer.transform.x;
    const y = layer.transform.y;
    const scaleX = layer.transform.scaleX;
    const scaleY = layer.transform.scaleY;
    const width = source.width * scaleX;
    const height = source.height * scaleY;
    // Text rasters sit tight around the glyphs and are mostly transparent
    // between them, so a per-pixel alpha test makes text slip out from under
    // the cursor. Text is picked by its whole box, plus a little slop at the
    // edges, and that box is what both dragging and click-to-edit use.
    const isText = layer.kind === "text" || layer.role === "text";
    const pad = isText ? TEXT_HIT_PADDING : 0;
    if (docX < x - pad || docY < y - pad || docX > x + width + pad || docY > y + height + pad) continue;
    if (isText) return layer;

    const localX = (docX - x) / scaleX;
    const localY = (docY - y) / scaleY;
    if (source instanceof HTMLCanvasElement && sampleCanvasAlpha(source, localX, localY) < 10) {
      continue;
    }
    return layer;
  }
  return undefined;
}
