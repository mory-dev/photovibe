import { useDocumentStore } from "../store/document-store";

interface StatusBarProps {
  activeTool: string;
  zoom: number;
  documentReady?: boolean;
}

export function StatusBar({ activeTool, zoom, documentReady = true }: StatusBarProps) {
  const document = useDocumentStore((s) => s.document);

  return (
    <footer
      className="flex h-6 items-center justify-between border-t border-border bg-surface-1 px-3 text-[10px] text-text-muted"
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="capitalize">Tool: {activeTool}</span>
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
