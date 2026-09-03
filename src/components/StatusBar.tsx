import { saveStatus } from "../lib/save-status";
import { useDocumentStore } from "../store/document-store";

interface StatusBarProps {
  activeTool: string;
  zoom: number;
  documentReady?: boolean;
}

export function StatusBar({ activeTool, zoom, documentReady = true }: StatusBarProps) {
  const document = useDocumentStore((s) => s.document);
  const dirty = useDocumentStore((s) => s.dirty);
  const status = saveStatus(document?.filePath, dirty);

  return (
    <footer
      className="flex h-6 items-center justify-between gap-3 border-t border-border bg-surface-1 px-3 text-[10px] text-text-muted"
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="capitalize">Tool: {activeTool}</span>
        {documentReady && document && (
          <span className="flex min-w-0 items-center gap-1.5" title={status.path ?? "(unsaved)"}>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: status.dot === "green" ? "#4ade80" : "#fbbf24" }}
              aria-label={status.kind}
            />
            <span className="truncate">
              {status.path ? status.path : "(unsaved)"}
              {status.path && status.kind === "unsaved" ? " (unsaved)" : ""}
            </span>
          </span>
        )}
      </span>
      <span>
        {!documentReady ? (
          <span className="pv-skeleton inline-block h-2.5 w-20 rounded" />
        ) : document ? (
          `${document.width} × ${document.height}`
        ) : (
          "No document"
        )}
      </span>
      <span>{Math.round(zoom * 100)}%</span>
    </footer>
  );
}
