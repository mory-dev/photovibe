import { useState } from "react";
import { Modal } from "./ui/Modal";

interface ImageSizeDialogProps {
  width: number;
  height: number;
  onCancel: () => void;
  onApply: (width: number, height: number) => void;
}

export function ImageSizeDialog({ width, height, onCancel, onApply }: ImageSizeDialogProps) {
  const ratio = width / Math.max(1, height);
  const [nextWidth, setNextWidth] = useState(width);
  const [nextHeight, setNextHeight] = useState(height);
  const [lock, setLock] = useState(true);

  function changeWidth(value: number) {
    const w = Math.max(1, Math.round(value));
    setNextWidth(w);
    if (lock) setNextHeight(Math.max(1, Math.round(w / ratio)));
  }

  function changeHeight(value: number) {
    const h = Math.max(1, Math.round(value));
    setNextHeight(h);
    if (lock) setNextWidth(Math.max(1, Math.round(h * ratio)));
  }

  return (
    <Modal title="Image Size" onClose={onCancel} width={360}>
      <div className="space-y-3 text-[11px]">
        <label className="flex items-center justify-between gap-3 text-text-muted">
          Width (px)
          <input
            type="number"
            min={1}
            value={nextWidth}
            onChange={(e) => changeWidth(Number(e.target.value))}
            className="w-28 rounded border border-border bg-surface-2 px-2 py-1 text-text"
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-text-muted">
          Height (px)
          <input
            type="number"
            min={1}
            value={nextHeight}
            onChange={(e) => changeHeight(Number(e.target.value))}
            className="w-28 rounded border border-border bg-surface-2 px-2 py-1 text-text"
          />
        </label>
        <label className="flex items-center gap-2 text-text">
          <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} />
          Lock aspect ratio
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="rounded px-3 py-1 text-text-muted hover:bg-surface-2" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-accent px-3 py-1 text-[#1a1a1a] hover:bg-accent-hover"
            onClick={() => onApply(nextWidth, nextHeight)}
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}
