import { useSyncExternalStore } from "react";
import { pixelStore } from "../engine/pixels/pixel-store";

export function usePixelGeneration(): number {
  return useSyncExternalStore(
    (onStoreChange) => pixelStore.subscribe(onStoreChange),
    () => pixelStore.getGeneration(),
    () => 0,
  );
}
