import { describe, expect, it } from "vitest";
import { selectionGeometry } from "./clip";
import type { SelectionPath } from "./selection-store";

describe("selectionGeometry", () => {
  it("builds a path for a rectangle", () => {
    const path: SelectionPath = { kind: "rect", x: 10, y: 20, width: 30, height: 40 };
    expect(selectionGeometry(path, 0, 0)).not.toBeNull();
  });

  it("rejects a rectangle with no area", () => {
    expect(selectionGeometry({ kind: "rect", x: 0, y: 0, width: 0, height: 10 }, 0, 0)).toBeNull();
    expect(selectionGeometry({ kind: "rect", x: 0, y: 0, width: 10, height: 0 }, 0, 0)).toBeNull();
  });

  it("builds a path for a lasso with at least three points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 8 },
    ];
    expect(selectionGeometry({ kind: "lasso", points }, 0, 0)).not.toBeNull();
  });

  it("rejects a lasso that cannot enclose anything", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(selectionGeometry({ kind: "lasso", points }, 0, 0)).toBeNull();
  });

  it("builds a path from wand contours, skipping degenerate ones", () => {
    const path: SelectionPath = {
      kind: "wand",
      points: [],
      contours: [
        [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 4, y: 4 },
        ],
        [{ x: 9, y: 9 }],
      ],
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    };
    expect(selectionGeometry(path, 0, 0)).not.toBeNull();
  });

  it("rejects a wand result with no usable contour", () => {
    const path: SelectionPath = {
      kind: "wand",
      points: [],
      contours: [[{ x: 1, y: 1 }]],
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    };
    expect(selectionGeometry(path, 0, 0)).toBeNull();
  });
  it("applies the offset to every point", () => {
    const geometry = selectionGeometry({ kind: "rect", x: 10, y: 20, width: 5, height: 5 }, -3, 7);
    expect(geometry?.rect).toEqual({ x: 7, y: 27, width: 5, height: 5 });
  });

  it("shifts lasso points by the offset", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 8 },
    ];
    const geometry = selectionGeometry({ kind: "lasso", points }, 2, 3);
    expect(geometry?.polygons[0]).toEqual([
      { x: 2, y: 3 },
      { x: 12, y: 3 },
      { x: 7, y: 11 },
    ]);
  });
});
