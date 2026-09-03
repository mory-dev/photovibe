export const MARCHING_ANTS = {
  back: "#111",
  front: "#fff",
  dash: "4 4",
  frontOffset: 4,
} as const;

export function antsPoints(
  points: Array<{ x: number; y: number }>,
  viewX: number,
  viewY: number,
  zoom: number,
  ox = 0,
  oy = 0,
): string {
  return points.map((p) => `${viewX + (p.x + ox) * zoom},${viewY + (p.y + oy) * zoom}`).join(" ");
}
