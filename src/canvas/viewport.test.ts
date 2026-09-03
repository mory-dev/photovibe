import { describe, expect, it } from "vitest";
import { documentToScreen, documentRect, fitToView, screenToDocument, zoomAtPoint } from "./viewport";

const view = { width: 800, height: 600 };
const document = { width: 400, height: 200 };

describe("viewport", () => {
  it("places a 100% document in the center", () => {
    const viewport = { zoom: 1, panX: 0, panY: 0 };
    const rect = documentRect(viewport, view, document);
    expect(rect.x).toBe(200);
    expect(rect.y).toBe(200);
    expect(rect.width).toBe(400);
    expect(rect.height).toBe(200);
  });

  it("round-trips screen and document coordinates", () => {
    const viewport = { zoom: 2, panX: 40, panY: -20 };
    const screen = documentToScreen(viewport, view, document, 10, 20);
    const back = screenToDocument(viewport, view, document, screen.x, screen.y);
    expect(back.x).toBeCloseTo(10);
    expect(back.y).toBeCloseTo(20);
  });

  it("keeps the cursor anchored when zooming", () => {
    const viewport = { zoom: 1, panX: 0, panY: 0 };
    const cursor = { x: 300, y: 250 };
    const before = screenToDocument(viewport, view, document, cursor.x, cursor.y);
    const afterView = zoomAtPoint(viewport, view, document, cursor.x, cursor.y, 2);
    const after = screenToDocument(afterView, view, document, cursor.x, cursor.y);
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });

  it("fits a document inside the view", () => {
    const fitted = fitToView({ width: 1000, height: 500 }, { width: 2000, height: 2000 }, 0);
    expect(fitted.zoom).toBeCloseTo(0.25);
    expect(fitted.panX).toBe(0);
    expect(fitted.panY).toBe(0);
  });
});
