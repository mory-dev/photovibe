import { describe, expect, it } from "vitest";
import { mirrorTransform } from "./flip";
import type { Transform2D } from "../document/types";
import { mirrorSelectionPath } from "../selections/selection-store";

const transform: Transform2D = {
  x: 37,
  y: 19,
  scaleX: 1.5,
  scaleY: 0.75,
  rotation: 12,
};

describe("mirrorTransform", () => {
  it("mirrors a layer horizontally around the document bounds", () => {
    const flipped = mirrorTransform(transform, 400, 300, 80, 40, "horizontal");
    expect(flipped).toEqual({
      ...transform,
      x: 243,
      y: 19,
    });
    expect(mirrorTransform(flipped, 400, 300, 80, 40, "horizontal")).toEqual(transform);
  });

  it("mirrors a layer vertically around the document bounds", () => {
    const flipped = mirrorTransform(transform, 400, 300, 80, 40, "vertical");
    expect(flipped).toEqual({
      ...transform,
      x: 37,
      y: 251,
    });
    expect(mirrorTransform(flipped, 400, 300, 80, 40, "vertical")).toEqual(transform);
  });
});

describe("mirrorSelectionPath", () => {
  it("keeps a rectangular selection aligned with its mirrored mask", () => {
    const path = { kind: "rect" as const, x: 24, y: 18, width: 80, height: 36 };
    expect(mirrorSelectionPath(path, 320, 240, "horizontal")).toEqual({
      ...path,
      x: 216,
    });
    expect(mirrorSelectionPath(path, 320, 240, "vertical")).toEqual({
      ...path,
      y: 186,
    });
  });

  it("mirrors wand contours as well as the bounding box", () => {
    const path = {
      kind: "wand" as const,
      points: [{ x: 12, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 16 }],
      contours: [[{ x: 12, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 16 }]],
      x: 12,
      y: 10,
      width: 8,
      height: 6,
    };
    expect(mirrorSelectionPath(path, 100, 80, "horizontal")).toMatchObject({
      x: 80,
      points: [{ x: 88 }, { x: 80 }, { x: 80 }],
      contours: [[{ x: 88 }, { x: 80 }, { x: 80 }]],
    });
  });
});
