export const TEXT_RASTER_HEIGHT_RATIO = 1.2;

export function textRasterMetrics(fontSize: number) {
  return {
    lineHeight: fontSize,
    canvasHeight: Math.max(1, Math.ceil(fontSize * TEXT_RASTER_HEIGHT_RATIO)),
    extraOffsetY: 0,
  };
}

export function textOverlayLayout(
  viewX: number,
  viewY: number,
  x: number,
  y: number,
  fontSize: number,
  zoom: number,
) {
  const metrics = textRasterMetrics(fontSize);
  return {
    left: viewX + x * zoom,
    top: viewY + (y + metrics.extraOffsetY) * zoom,
    fontSize: fontSize * zoom,
    lineHeight: `${metrics.lineHeight * zoom}px`,
    height: metrics.canvasHeight * zoom,
  };
}
