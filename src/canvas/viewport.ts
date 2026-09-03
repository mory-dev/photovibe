export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 16;

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface Size {
  width: number;
  height: number;
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function documentRect(
  viewport: ViewportState,
  view: Size,
  document: Size,
): { x: number; y: number; width: number; height: number } {
  const width = document.width * viewport.zoom;
  const height = document.height * viewport.zoom;
  return {
    x: view.width / 2 + viewport.panX - width / 2,
    y: view.height / 2 + viewport.panY - height / 2,
    width,
    height,
  };
}

export function screenToDocument(
  viewport: ViewportState,
  view: Size,
  document: Size,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  const rect = documentRect(viewport, view, document);
  return {
    x: (screenX - rect.x) / viewport.zoom,
    y: (screenY - rect.y) / viewport.zoom,
  };
}

export function documentToScreen(
  viewport: ViewportState,
  view: Size,
  document: Size,
  docX: number,
  docY: number,
): { x: number; y: number } {
  const rect = documentRect(viewport, view, document);
  return {
    x: rect.x + docX * viewport.zoom,
    y: rect.y + docY * viewport.zoom,
  };
}

export function zoomAtPoint(
  viewport: ViewportState,
  view: Size,
  document: Size,
  screenX: number,
  screenY: number,
  nextZoom: number,
): ViewportState {
  const zoom = clampZoom(nextZoom);
  const before = screenToDocument(viewport, view, document, screenX, screenY);
  const next = { ...viewport, zoom };
  const after = screenToDocument(next, view, document, screenX, screenY);
  return {
    zoom,
    panX: viewport.panX + (after.x - before.x) * zoom,
    panY: viewport.panY + (after.y - before.y) * zoom,
  };
}

export function fitToView(view: Size, document: Size, padding = 48): ViewportState {
  const availableW = Math.max(1, view.width - padding * 2);
  const availableH = Math.max(1, view.height - padding * 2);
  const zoom = clampZoom(Math.min(availableW / document.width, availableH / document.height));
  return { zoom, panX: 0, panY: 0 };
}

export function actualSize(): ViewportState {
  return { zoom: 1, panX: 0, panY: 0 };
}
