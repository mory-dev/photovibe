import { create } from "zustand";
import type { Color } from "../engine/document/types";
import { roundBrushSize } from "../lib/round-brush-size";

interface EditorStore {
  foreground: Color;
  hoverColor: Color | null;
  brushSize: number;
  fontFamily: string;
  fontSize: number;
  systemFonts: string[];
  setForeground: (color: Color) => void;
  setHoverColor: (color: Color | null) => void;
  setBrushSize: (size: number) => void;
  setFontFamily: (fontFamily: string) => void;
  setFontSize: (fontSize: number) => void;
  setSystemFonts: (systemFonts: string[]) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  foreground: { r: 32, g: 32, b: 32, a: 1 },
  hoverColor: null,
  brushSize: 24,
  fontFamily: "Segoe UI",
  fontSize: 48,
  systemFonts: ["Segoe UI", "Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"],
  setForeground: (foreground) => set({ foreground }),
  setHoverColor: (hoverColor) => set({ hoverColor }),
  setBrushSize: (brushSize) => set({ brushSize: roundBrushSize(brushSize) }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setFontSize: (fontSize) => set({ fontSize: Math.min(400, Math.max(8, fontSize)) }),
  setSystemFonts: (systemFonts) => set({ systemFonts }),
}));
