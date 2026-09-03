import type { Layer } from "../engine/document/types";

export function layerCategory(layer: Layer): "Background" | "Image" | "Text" | "Paint" | "Fill" | "Adjustment" {
  if (layer.kind === "adjustment") return "Adjustment";
  if (layer.kind === "text" || layer.role === "text") return "Text";
  if (layer.role === "background" || (layer.locked && layer.name === "Background")) return "Background";
  if (layer.role === "fill") return "Fill";
  if (layer.role === "paint") return "Paint";
  return "Image";
}
