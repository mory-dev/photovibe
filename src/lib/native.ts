import type { Color } from "../engine/document/types";

const FALLBACK_FONTS = ["Segoe UI", "Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"];

export async function sampleScreenColor(): Promise<Color | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<Color>("sample_screen_color");
  } catch {
    return null;
  }
}

export async function listSystemFonts(): Promise<string[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const fonts = await invoke<string[]>("list_system_fonts");
    return fonts.length ? fonts : FALLBACK_FONTS;
  } catch {
    return FALLBACK_FONTS;
  }
}

export async function readClipboardImage(): Promise<{ blob: Blob; width: number; height: number; previewUrl: string } | null> {
  try {
    const { readImage } = await import("@tauri-apps/plugin-clipboard-manager");
    const image = await readImage();
    const size = await image.size();
    const rgba = await image.rgba();
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), size.width, size.height), 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return null;
    return { blob, width: size.width, height: size.height, previewUrl: canvas.toDataURL("image/png") };
  } catch {
    return null;
  }
}

export async function openImagePath(): Promise<{ blob: Blob; name: string; path: string } | null> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readFile } = await import("@tauri-apps/plugin-fs");
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (!selected || Array.isArray(selected)) return null;
    const bytes = await readFile(selected);
    const name = selected.replace(/^.*[/\\]/, "");
    return { blob: new Blob([bytes]), name, path: selected };
  } catch {
    return null;
  }
}

export async function saveBytes(path: string, bytes: Uint8Array): Promise<void> {
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  await writeFile(path, bytes);
}

export async function pickSavePath(defaultName: string): Promise<string | null> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  return path ?? null;
}

export async function openExternal(url: string): Promise<void> {
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}
