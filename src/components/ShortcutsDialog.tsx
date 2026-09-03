import { TOOLS } from "./Toolbar";
import type { MenuDefinition } from "./MenuBar";
import { Modal } from "./ui/Modal";

interface ShortcutsDialogProps {
  /** The same definitions the menu bar renders, so the two cannot drift. */
  menus: MenuDefinition[];
  onClose: () => void;
}

interface Binding {
  keys: string;
  label: string;
}

/**
 * Bindings the menus do not show, either because they have no menu entry or
 * because the menu names only one of two accepted chords.
 */
const EXTRA_KEYS: Binding[] = [
  { keys: "Ctrl+Y", label: "Redo (alternative to Ctrl+Shift+Z)" },
  { keys: "Esc", label: "Deselect, or cancel a crop or text edit" },
  { keys: "[", label: "Decrease brush size" },
  { keys: "]", label: "Increase brush size" },
];

/** Pointer gestures on the canvas, which have no keyboard equivalent. */
const GESTURES: Binding[] = [
  { keys: "Space+drag", label: "Pan the canvas" },
  { keys: "Scroll", label: "Zoom in and out" },
  { keys: "Alt+right-drag", label: "Resize the brush without leaving the canvas" },
  { keys: "Drag in selection", label: "Move the selected pixels (Cursor tool)" },
  { keys: "Alt+drag in selection", label: "Move the selection outline only (Cursor tool)" },
  { keys: "Double-click text", label: "Reopen a text layer for editing" },
];

/**
 * A reference for every shortcut the app actually handles.
 *
 * The tool and menu sections are derived rather than retyped: tools come from
 * TOOLS, and menu entries from the same definitions the menu bar renders. A
 * menu entry is only listed when it has an action, which is what separates a
 * command that is merely unavailable right now (Cut, with nothing selected)
 * from one that is not implemented at all (Inverse) - the latter must not
 * appear here.
 */
export function ShortcutsDialog({ menus, onClose }: ShortcutsDialogProps) {
  const menuGroups = menus
    .map((menu) => ({
      title: menu.label,
      bindings: menu.items.flatMap<Binding>((item) =>
        !item.separator && item.shortcut && item.action
          ? [{ keys: item.shortcut, label: item.label }]
          : [],
      ),
    }))
    .filter((group) => group.bindings.length > 0);

  const groups = [
    {
      title: "Tools",
      bindings: TOOLS.map((tool) => ({ keys: tool.shortcut, label: tool.label })),
    },
    ...menuGroups,
    { title: "Other keys", bindings: EXTRA_KEYS },
    { title: "On the canvas", bindings: GESTURES },
  ];

  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} width={620}>
      <div className="max-h-[70vh] gap-x-8 overflow-y-auto text-[11px] sm:columns-2">
        {groups.map((group) => (
          <section key={group.title} className="mb-5 break-inside-avoid">
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              {group.title}
            </h3>
            <dl className="space-y-1">
              {group.bindings.map((binding) => (
                <div key={`${binding.keys}-${binding.label}`} className="flex items-baseline justify-between gap-4">
                  <dt className="min-w-0 truncate text-text">{binding.label}</dt>
                  <dd className="shrink-0">
                    <kbd className="rounded border border-border border-b-2 bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-muted">
                      {binding.keys}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
