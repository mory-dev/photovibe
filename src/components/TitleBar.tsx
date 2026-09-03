import { useEffect, useState, type ReactNode } from "react";
import { Minus, Square, X } from "lucide-react";

async function currentWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void currentWindow()
      .then(async (win) => {
        setMaximized(await win.isMaximized());
        unlisten = await win.listen("tauri://resize", async () => {
          setMaximized(await win.isMaximized());
        });
      })
      .catch(() => undefined);
    return () => unlisten?.();
  }, []);

  async function run(action: "minimize" | "toggleMaximize" | "close") {
    try {
      const win = await currentWindow();
      if (action === "minimize") await win.minimize();
      if (action === "toggleMaximize") await win.toggleMaximize();
      if (action === "close") await win.close();
    } catch {
      /* running in a browser preview */
    }
  }

  return (
    <header className="flex h-8 shrink-0 items-center border-b border-border bg-[#141414] select-none">
      <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <img src="/logo.png" alt="" className="h-4 w-4 rounded-[3px] object-contain" />
        <span className="truncate text-[11px] font-medium tracking-wide text-text">Photovibe</span>
      </div>
      <div className="flex h-full">
        <WindowButton label="Minimize" onClick={() => void run("minimize")}>
          <Minus size={12} strokeWidth={1.75} />
        </WindowButton>
        <WindowButton label={maximized ? "Restore" : "Maximize"} onClick={() => void run("toggleMaximize")}>
          <Square size={10} strokeWidth={1.75} />
        </WindowButton>
        <WindowButton label="Close" danger onClick={() => void run("close")}>
          <X size={13} strokeWidth={1.75} />
        </WindowButton>
      </div>
    </header>
  );
}

function WindowButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={
        danger
          ? "flex h-8 w-11 items-center justify-center text-text-muted transition-colors hover:bg-[#c42b1c] hover:text-white"
          : "flex h-8 w-11 items-center justify-center text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
      }
    >
      {children}
    </button>
  );
}
