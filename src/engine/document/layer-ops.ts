import type { BlendMode, Document, Layer } from "./types";

export function getLayerById(document: Document, layerId: string): Layer | undefined {
  return document.layers.find((layer) => layer.id === layerId);
}

export function getActiveLayer(document: Document): Layer | undefined {
  return getLayerById(document, document.activeLayerId);
}

export function addLayer(document: Document, layer: Layer, index?: number): Document {
  const layers = [...document.layers];
  const insertAt = index ?? layers.length;
  layers.splice(insertAt, 0, layer);
  return { ...document, layers, activeLayerId: layer.id };
}

export function removeLayer(document: Document, layerId: string): Document {
  const layers = document.layers.filter((layer) => layer.id !== layerId);
  if (layers.length === 0) {
    return document;
  }

  const activeLayerId =
    document.activeLayerId === layerId
      ? layers[Math.max(0, document.layers.findIndex((l) => l.id === layerId) - 1)]?.id ??
        layers[0].id
      : document.activeLayerId;

  return { ...document, layers, activeLayerId };
}

export function reorderLayer(document: Document, layerId: string, newIndex: number): Document {
  const layers = [...document.layers];
  const currentIndex = layers.findIndex((layer) => layer.id === layerId);
  if (currentIndex === -1) return document;

  const [layer] = layers.splice(currentIndex, 1);
  layers.splice(newIndex, 0, layer);
  return { ...document, layers };
}

export function duplicateLayer(document: Document, layerId: string, newLayer: Layer): Document {
  const index = document.layers.findIndex((layer) => layer.id === layerId);
  if (index === -1) return document;
  return addLayer(document, newLayer, index + 1);
}

export function updateLayer(document: Document, layerId: string, patch: Partial<Layer>): Document {
  return {
    ...document,
    layers: document.layers.map((layer) =>
      layer.id === layerId ? ({ ...layer, ...patch } as Layer) : layer,
    ),
  };
}

export function setActiveLayer(document: Document, layerId: string): Document {
  if (!getLayerById(document, layerId)) return document;
  return { ...document, activeLayerId: layerId };
}

export function setLayerOpacity(document: Document, layerId: string, opacity: number): Document {
  return updateLayer(document, layerId, { opacity: Math.min(1, Math.max(0, opacity)) });
}

export function setLayerBlendMode(document: Document, layerId: string, blendMode: BlendMode): Document {
  return updateLayer(document, layerId, { blendMode });
}

export function setLayerVisibility(document: Document, layerId: string, visible: boolean): Document {
  return updateLayer(document, layerId, { visible });
}

export function getVisibleLayers(document: Document): Layer[] {
  return document.layers.filter((layer) => layer.visible);
}
