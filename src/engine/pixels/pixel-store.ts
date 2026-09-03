export type TextureSource = HTMLCanvasElement | OffscreenCanvas | ImageBitmap | ImageData;

class PixelStore {
  private sources = new Map<string, TextureSource>();
  private generation = 0;
  private layerGeneration = new Map<string, number>();
  private listeners = new Set<() => void>();

  get(layerId: string): TextureSource | undefined {
    return this.sources.get(layerId);
  }

  set(layerId: string, source: TextureSource): void {
    this.sources.set(layerId, source);
    this.bumpLayer(layerId);
    this.bump();
  }

  delete(layerId: string): void {
    this.sources.delete(layerId);
    this.layerGeneration.delete(layerId);
    this.bump();
  }

  clear(): void {
    this.sources.clear();
    this.layerGeneration.clear();
    this.bump();
  }

  clone(fromId: string, toId: string): void {
    const source = this.sources.get(fromId);
    if (!source) return;
    this.sources.set(toId, cloneTextureSource(source));
    this.bumpLayer(toId);
    this.bump();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getGeneration(): number {
    return this.generation;
  }

  getLayerGeneration(layerId: string): number {
    return this.layerGeneration.get(layerId) ?? 0;
  }

  entries(): IterableIterator<[string, TextureSource]> {
    return this.sources.entries();
  }

  touch(): void {
    this.bump();
  }

  touchLayer(layerId: string, notify = true): void {
    this.bumpLayer(layerId);
    if (notify) this.bump();
  }

  replaceAll(sources: Record<string, TextureSource>): void {
    this.sources.clear();
    this.layerGeneration.clear();
    for (const [id, source] of Object.entries(sources)) {
      this.sources.set(id, source);
      this.bumpLayer(id);
    }
    this.bump();
  }

  private bumpLayer(layerId: string): void {
    this.layerGeneration.set(layerId, (this.layerGeneration.get(layerId) ?? 0) + 1);
  }

  private bump(): void {
    this.generation += 1;
    for (const listener of this.listeners) listener();
  }
}

export function cloneTextureSource(source: TextureSource): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  if (source instanceof ImageData) {
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    ctx?.putImageData(source, 0, 0);
    return canvas;
  }
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(source, 0, 0);
  return canvas;
}

export const pixelStore = new PixelStore();
