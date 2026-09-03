import { useEffect, useState, type ReactNode } from "react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * A modal for tools that edit the image live. It sits in the top-left corner
 * rather than centred, and dims everything *except* the canvas, so the picture
 * you are adjusting keeps its true colours while the rest of the interface
 * recedes.
 *
 * The dim is drawn as four panels around the canvas rather than one sheet with
 * a hole, so the canvas is never composited through a translucent layer.
 */
export function CanvasClearModal({
  title,
  children,
  onClose,
  width = 340,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
}) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const host = document.querySelector(".pv-canvas");
    if (!host) return;

    const measure = () => {
      const box = host.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(host);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shade = "fixed bg-black/55";

  return (
    <>
      {rect && (
        <div aria-hidden="true" className="pointer-events-none">
          <div className={shade} style={{ left: 0, top: 0, right: 0, height: rect.top }} />
          <div className={shade} style={{ left: 0, top: rect.top + rect.height, right: 0, bottom: 0 }} />
          <div className={shade} style={{ left: 0, top: rect.top, width: rect.left, height: rect.height }} />
          <div
            className={shade}
            style={{ left: rect.left + rect.width, top: rect.top, right: 0, height: rect.height }}
          />
        </div>
      )}

      <div
        role="dialog"
        aria-modal="false"
        aria-label={title}
        className="fixed left-3 top-11 z-[95] rounded-lg border border-border bg-surface-1 shadow-2xl"
        style={{ width }}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-[12px] font-semibold text-text">{title}</h2>
          <button type="button" className="text-text-muted hover:text-text" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </>
  );
}
