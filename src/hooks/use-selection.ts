import { useSyncExternalStore } from "react";
import { selectionStore } from "../engine/selections/selection-store";

export function useSelectionGeneration(): number {
  return useSyncExternalStore(
    (onStoreChange) => selectionStore.subscribe(onStoreChange),
    () => selectionStore.getGeneration(),
    () => 0,
  );
}
