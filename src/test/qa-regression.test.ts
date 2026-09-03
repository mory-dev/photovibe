import { describe, expect, it } from "vitest";
import { MARCHING_ANTS } from "../canvas/marching-ants";
import { hideLayer } from "../engine/document/hide-layer";
import { createBlankDocument, createRasterLayer } from "../engine/document/factories";
import { textOverlayLayout, textRasterMetrics } from "../engine/pixels/text-metrics";
import { floodSelect } from "../engine/selections/flood-select";
import { maskContours } from "../engine/selections/mask-contours";
import { formatBrushSize, roundBrushSize } from "../lib/round-brush-size";
import { saveStatus } from "../lib/save-status";

function solidImage(width: number, height: number, r: number, g: number, b: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  }
  return { width, height, data };
}

function stampRect(
  image: { width: number; height: number; data: Uint8ClampedArray },
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const o = (px + py * image.width) * 4;
      image.data[o] = r;
      image.data[o + 1] = g;
      image.data[o + 2] = b;
      image.data[o + 3] = 255;
    }
  }
}

describe("QA regressions", () => {
  it("rounds brush size to a whole pixel", () => {
    expect(roundBrushSize(111.42783428974392)).toBe(111);
    expect(formatBrushSize(111.42783428974392)).toBe("111px");
    expect(roundBrushSize(0.2)).toBe(1);
    expect(roundBrushSize(999)).toBe(200);
  });

  it("marks in-memory and dirty files as unsaved with a yellow dot", () => {
    expect(saveStatus(undefined, true)).toMatchObject({ kind: "unsaved", label: "(unsaved)", dot: "yellow" });
    expect(saveStatus("C:\\Photos\\shot.png", true)).toMatchObject({
      kind: "unsaved",
      path: "C:\\Photos\\shot.png",
      dot: "yellow",
    });
  });

  it("shows a saved file path with a green dot", () => {
    expect(saveStatus("C:\\Photos\\shot.png", false)).toMatchObject({
      kind: "saved",
      path: "C:\\Photos\\shot.png",
      label: "C:\\Photos\\shot.png",
      dot: "green",
    });
  });

  it("keeps the text overlay aligned with no extra vertical offset", () => {
    expect(textRasterMetrics(48).extraOffsetY).toBe(0);
    const layout = textOverlayLayout(10, 20, 5, 7, 48, 2);
    expect(layout.left).toBe(20);
    expect(layout.top).toBe(34);
    expect(layout.lineHeight).toBe("96px");
  });

  it("uses dual-tone marching ants like the marquee", () => {
    expect(MARCHING_ANTS.back).toBe("#111");
    expect(MARCHING_ANTS.front).toBe("#fff");
    expect(MARCHING_ANTS.front).not.toBe(MARCHING_ANTS.back);
  });

  it("hides the source text layer while the overlay is up", () => {
    const doc = createBlankDocument(64, 64);
    const layer = createRasterLayer("Text");
    const withLayer = { ...doc, layers: [...doc.layers, layer] };
    const hidden = hideLayer(withLayer, layer.id);
    expect(hidden.layers.find((item) => item.id === layer.id)?.visible).toBe(false);
    expect(withLayer.layers.find((item) => item.id === layer.id)?.visible).toBe(true);
    expect(hideLayer(withLayer, undefined)).toBe(withLayer);
  });

  it("magic wand keeps a hole where a different-colored layer sits", () => {
    const image = solidImage(16, 16, 255, 255, 255);
    stampRect(image, 6, 6, 4, 4, 0, 0, 0);

    const onWhite = floodSelect(image, 0, 0, 10);
    expect(onWhite).not.toBeNull();
    expect(onWhite!.mask[0]).toBe(1);
    expect(onWhite!.mask[6 + 6 * 16]).toBe(0);
    expect(onWhite!.mask[7 + 7 * 16]).toBe(0);
    expect(onWhite!.count).toBe(256 - 16);

    const contours = maskContours(onWhite!.mask, 16, 16);
    expect(contours.length).toBeGreaterThanOrEqual(2);

    const onBlack = floodSelect(image, 7, 7, 10);
    expect(onBlack).not.toBeNull();
    expect(onBlack!.mask[7 + 7 * 16]).toBe(1);
    expect(onBlack!.mask[0]).toBe(0);
    expect(onBlack!.count).toBe(16);
  });
});
