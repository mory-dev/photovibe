import type { Document } from "./types";

export function hideLayer(document: Document, layerId: string | undefined): Document {
  if (!layerId) return document;
  let changed = false;
  const layers = document.layers.map((layer) => {
    if (layer.id !== layerId || !layer.visible) return layer;
    changed = true;
    return { ...layer, visible: false };
  });
  return changed ? { ...document, layers } : document;
}
