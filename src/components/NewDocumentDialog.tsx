import { useEffect, useState } from "react";
import { readClipboardImage } from "../lib/native";
import { Modal } from "./ui/Modal";

interface NewDocumentDialogProps {
  onCancel: () => void;
  onCreate: (options: { width: number; height: number; image?: Blob }) => void;
}

type ClipState = "loading" | "empty" | "ready";

export function NewDocumentDialog({ onCancel, onCreate }: NewDocumentDialogProps) {
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [preview, setPreview] = useState<string | null>(null);
  const [image, setImage] = useState<Blob | null>(null);
  const [clipState, setClipState] = useState<ClipState>("loading");

  useEffect(() => {
    void readClipboardImage()
      .then((clip) => {
        if (!clip) {
          setClipState("empty");
          return;
        }
        setWidth(clip.width);
        setHeight(clip.height);
        setPreview(clip.previewUrl);
        setImage(clip.blob);
        setClipState("ready");
      })
      .catch(() => setClipState("empty"));
  }, []);

  return (
    <Modal title="New" onClose={onCancel} width={560}>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1 space-y-3 text-[11px]">
          <label className="flex items-center justify-between gap-3 text-text-muted">
            Width
            <input
              type="number"
              min={1}
              value={width}
              onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))}
              className="w-28 rounded border border-border bg-surface-2 px-2 py-1 text-text"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-text-muted">
            Height
            <input
              type="number"
              min={1}
              value={height}
              onChange={(e) => setHeight(Math.max(1, Number(e.target.value)))}
              className="w-28 rounded border border-border bg-surface-2 px-2 py-1 text-text"
            />
          </label>
          {clipState === "ready" && <p className="text-text-muted">Clipboard image detected. Canvas matches its size.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded px-3 py-1 text-text-muted hover:bg-surface-2" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-accent px-3 py-1 text-[#1a1a1a] hover:bg-accent-hover"
              onClick={() => onCreate({ width, height, image: image ?? undefined })}
            >
              Create
            </button>
          </div>
        </div>
        <div className="w-40 shrink-0">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Clipboard</div>
          {clipState === "loading" && <div className="pv-skeleton aspect-[4/3] w-full rounded border border-border" />}
          {clipState === "empty" && (
            <div className="flex aspect-[4/3] flex-col items-center justify-center rounded border border-border bg-surface-2 px-2 text-center text-[10px] text-text-muted">
              <span>No clipboard image</span>
              <span className="mt-1 text-text">
                {width} × {height}
              </span>
            </div>
          )}
          {clipState === "ready" && preview && (
            <img src={preview} alt="" className="w-full rounded border border-border object-contain" />
          )}
        </div>
      </div>
    </Modal>
  );
}
