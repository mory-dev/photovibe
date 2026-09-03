import { create } from "zustand";
import {
  actualSize,
  clampZoom,
  fitToView,
  type Size,
  type ViewportState,
  zoomAtPoint,
} from "../canvas/viewport";

interface ViewportStore extends ViewportState {
  viewSize: Size;
  spaceDown: boolean;
  setViewSize: (size: Size) => void;
  setSpaceDown: (down: boolean) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screenX: number, screenY: number, factor: number, document: Size) => void;
  fit: (document: Size) => void;
  reset: () => void;
  setZoom: (zoom: number) => void;
}

export const useViewportStore = create<ViewportStore>((set, get) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  viewSize: { width: 1, height: 1 },
  spaceDown: false,

  setViewSize: (viewSize) => set({ viewSize }),
  setSpaceDown: (spaceDown) => set({ spaceDown }),

  panBy: (dx, dy) => {
    set((state) => ({ panX: state.panX + dx, panY: state.panY + dy }));
  },

  zoomAt: (screenX, screenY, factor, document) => {
    const state = get();
    set(
      zoomAtPoint(
        state,
        state.viewSize,
        document,
        screenX,
        screenY,
        state.zoom * factor,
      ),
    );
  },

  fit: (document) => {
    set(fitToView(get().viewSize, document));
  },

  reset: () => set(actualSize()),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom), panX: 0, panY: 0 }),
}));
