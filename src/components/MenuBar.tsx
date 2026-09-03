import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";

export interface MenuAction {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: false;
  action?: () => void;
  /** Present on a submenu; `action` is ignored when it is. */
  items?: MenuAction[];
}

export interface MenuSeparator {
  separator: true;
}

export type MenuItem = MenuAction | MenuSeparator;

export interface MenuDefinition {
  label: string;
  items: MenuItem[];
}

interface MenuBarProps {
  menus: MenuDefinition[];
}

export function MenuBar({ menus }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLElement>(null);

  const close = useCallback(() => setOpenMenu(null), []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close]);

  return (
    <header
      ref={barRef}
      className="relative flex h-7 items-center border-b border-border bg-surface-1 px-1"
      onContextMenu={(e) => e.preventDefault()}
    >
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            type="button"
            className={cn(
              "rounded px-2.5 py-0.5 text-[11px] text-text transition-colors",
              openMenu === menu.label
                ? "bg-surface-3 text-accent"
                : "hover:bg-surface-2",
            )}
            aria-haspopup="menu"
            aria-expanded={openMenu === menu.label}
            onClick={() =>
              setOpenMenu((prev) => (prev === menu.label ? null : menu.label))
            }
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div
              role="menu"
              className="absolute left-0 top-full z-50 mt-0.5 min-w-[200px] rounded-md border border-border bg-surface-2 py-1 shadow-xl"
            >
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={`sep-${i}`} className="my-1 border-t border-border" />
                ) : item.items ? (
                  <Submenu key={item.label} item={item} onPick={close} />
                ) : (
                  <MenuButton key={item.label} item={item} onPick={close} />
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </header>
  );
}

function MenuButton({ item, onPick }: { item: MenuAction; onPick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onClick={() => {
        if (item.disabled) return;
        item.action?.();
        onPick();
      }}
      className={cn(
        "flex w-full items-center justify-between gap-8 px-3 py-1.5 text-left text-[11px]",
        item.disabled ? "cursor-not-allowed text-text-muted/50" : "text-text hover:bg-surface-3 hover:text-accent",
      )}
    >
      <span>{item.label}</span>
      {item.shortcut && <span className="text-[10px] text-text-muted">{item.shortcut}</span>}
    </button>
  );
}

function Submenu({ item, onPick }: { item: MenuAction; onPick: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={item.disabled}
        // Hover already opens it, so a click must not toggle it shut again.
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-between gap-8 px-3 py-1.5 text-left text-[11px]",
          item.disabled ? "cursor-not-allowed text-text-muted/50" : "text-text hover:bg-surface-3 hover:text-accent",
        )}
      >
        <span>{item.label}</span>
        <span aria-hidden="true" className="text-[10px] text-text-muted">›</span>
      </button>

      {open && !item.disabled && (
        <div
          role="menu"
          className="absolute left-full top-0 z-50 -mt-1 ml-0.5 min-w-[190px] rounded-md border border-border bg-surface-2 py-1 shadow-xl"
        >
          {item.items?.map((child) => <MenuButton key={child.label} item={child} onPick={onPick} />)}
        </div>
      )}
    </div>
  );
}
