import { useEffect, type ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
  width = 420,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rounded-lg border border-border bg-surface-1 shadow-2xl"
        style={{ width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-[12px] font-semibold text-text">{title}</h2>
          <button type="button" className="text-text-muted hover:text-text" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
