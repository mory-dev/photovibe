import {
  Brush,
  Crop,
  Eraser,
  GraduationCap,
  Lasso,
  MousePointer2,
  Move,
  Pipette,
  Bandage,
  SquareDashed,
  Type,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

/** Also drives the shortcuts reference, so it stays the single source. */
export const TOOLS = [
  { id: "cursor", label: "Cursor", shortcut: "A", icon: MousePointer2 },
  { id: "move", label: "Move", shortcut: "V", icon: Move },
  { id: "marquee", label: "Marquee", shortcut: "M", icon: SquareDashed },
  { id: "lasso", label: "Lasso", shortcut: "L", icon: Lasso },
  { id: "brush", label: "Brush", shortcut: "B", icon: Brush },
  { id: "wand", label: "Magic Wand", shortcut: "W", icon: Wand2 },
  { id: "crop", label: "Crop", shortcut: "C", icon: Crop },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: Eraser },
  { id: "eyedropper", label: "Eyedropper", shortcut: "I", icon: Pipette },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "heal", label: "Healing", shortcut: "J", icon: Bandage },
  { id: "gradient", label: "Gradient", shortcut: "G", icon: GraduationCap },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}>;

interface ToolbarProps {
  activeTool: string;
  onToolChange: (toolId: string) => void;
}

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <aside
      className="flex w-11 flex-col border-r border-border bg-surface-1 py-1.5"
      onContextMenu={(e) => e.preventDefault()}
    >
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            type="button"
            title={`${tool.label} (${tool.shortcut})`}
            aria-label={tool.label}
            aria-pressed={isActive}
            onClick={() => onToolChange(tool.id)}
            className={cn(
              "group relative mx-1.5 mb-0.5 flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150",
              isActive
                ? "bg-surface-3 text-accent shadow-[inset_0_0_0_1px_rgba(196,165,116,0.35)]"
                : "text-text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            <Icon
              size={16}
              strokeWidth={isActive ? 2 : 1.5}
              className={cn(
                "transition-transform duration-150",
                !isActive && "group-hover:scale-105",
              )}
            />
            {isActive && (
              <span className="absolute -left-1.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </aside>
  );
}

export type ToolId = (typeof TOOLS)[number]["id"];
