import { useEffect } from "react";
import { cn } from "../lib/utils";

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  action?: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  menu: ContextMenuState | null;
  onClose: () => void;
}

export function ContextMenu({ menu, onClose }: ContextMenuProps) {
  useEffect(() => {
    if (!menu) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointer() {
      onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const left = Math.min(menu.x, window.innerWidth - 220);
  const top = Math.min(menu.y, window.innerHeight - menu.items.length * 28 - 16);

  return (
    <div
      role="menu"
      className="fixed z-[80] min-w-[188px] rounded-md border border-border bg-surface-2 py-1 shadow-2xl"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {menu.items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            if (item.disabled) return;
            item.action?.();
            onClose();
          }}
          className={cn(
            "flex w-full items-center justify-between gap-8 px-3 py-1.5 text-left text-[11px]",
            item.disabled
              ? "cursor-not-allowed text-text-muted/50"
              : item.danger
                ? "text-red-300 hover:bg-surface-3"
                : "text-text hover:bg-surface-3 hover:text-accent",
          )}
        >
          <span>{item.label}</span>
          {item.shortcut && <span className="text-[10px] text-text-muted">{item.shortcut}</span>}
        </button>
      ))}
    </div>
  );
}
