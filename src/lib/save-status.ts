export type SaveStatusKind = "saved" | "unsaved";

export interface SaveStatus {
  kind: SaveStatusKind;
  path?: string;
  label: string;
  dot: "green" | "yellow";
}

export function saveStatus(filePath: string | undefined, dirty: boolean): SaveStatus {
  if (filePath && !dirty) {
    return { kind: "saved", path: filePath, label: filePath, dot: "green" };
  }
  return {
    kind: "unsaved",
    path: filePath,
    label: filePath ?? "(unsaved)",
    dot: "yellow",
  };
}
