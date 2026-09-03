import { describe, expect, it } from "vitest";
import { createBlankDocument, createRasterLayer } from "./factories";
import * as layerOps from "./layer-ops";

describe("layer-ops", () => {
  it("creates a blank document with one background layer", () => {
    const doc = createBlankDocument(800, 600);
    expect(doc.width).toBe(800);
    expect(doc.height).toBe(600);
    expect(doc.layers).toHaveLength(1);
    expect(doc.activeLayerId).toBe(doc.layers[0].id);
  });

  it("adds and removes layers", () => {
    const doc = createBlankDocument();
    const layer = createRasterLayer("Test Layer");
    const withLayer = layerOps.addLayer(doc, layer);
    expect(withLayer.layers).toHaveLength(2);
    expect(withLayer.activeLayerId).toBe(layer.id);

    const removed = layerOps.removeLayer(withLayer, layer.id);
    expect(removed.layers).toHaveLength(1);
  });

  it("reorders layers", () => {
    const doc = createBlankDocument();
    const layerA = createRasterLayer("A");
    const layerB = createRasterLayer("B");
    let current = layerOps.addLayer(doc, layerA);
    current = layerOps.addLayer(current, layerB);
    expect(current.layers.map((l) => l.name)).toEqual(["Background", "A", "B"]);

    current = layerOps.reorderLayer(current, layerB.id, 0);
    expect(current.layers.map((l) => l.name)).toEqual(["B", "Background", "A"]);
  });

  it("clamps opacity between 0 and 1", () => {
    const doc = createBlankDocument();
    const layerId = doc.layers[0].id;
    const updated = layerOps.setLayerOpacity(doc, layerId, 1.5);
    expect(updated.layers[0].opacity).toBe(1);
  });

  it("updates blend mode and visibility", () => {
    const doc = createBlankDocument();
    const layerId = doc.layers[0].id;
    let updated = layerOps.setLayerBlendMode(doc, layerId, "multiply");
    expect(updated.layers[0].blendMode).toBe("multiply");

    updated = layerOps.setLayerVisibility(updated, layerId, false);
    expect(updated.layers[0].visible).toBe(false);
  });
});

describe("createBlankDocument", () => {
  it("uses default 1920x1080 dimensions", () => {
    const doc = createBlankDocument();
    expect(doc.width).toBe(1920);
    expect(doc.height).toBe(1080);
  });
});
