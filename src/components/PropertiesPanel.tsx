import { useActiveLayer, useDocumentStore } from "../store/document-store";
import { PropertiesPanelSkeleton } from "./ui/Skeleton";

interface PropertiesPanelProps {
  loading?: boolean;
}

export function PropertiesPanel({ loading }: PropertiesPanelProps) {
  const document = useDocumentStore((s) => s.document);
  const activeLayer = useActiveLayer();

  if (loading || !document) return <PropertiesPanelSkeleton />;

  return (
    <aside className="flex h-full w-56 flex-col border-l border-border bg-surface-1">
      <header className="flex h-7 items-center border-b border-border px-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        Properties
      </header>
      <div className="flex-1 overflow-y-auto p-3 text-[11px]">
        {activeLayer ? (
          <dl className="space-y-3">
            <div>
              <dt className="text-text-muted">Document</dt>
              <dd className="mt-0.5 text-text">
                {document.width} × {document.height}px
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Active layer</dt>
              <dd className="mt-0.5 text-text">{activeLayer.name}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Type</dt>
              <dd className="mt-0.5 capitalize text-text">{activeLayer.kind}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Blend mode</dt>
              <dd className="mt-0.5 capitalize text-text">{activeLayer.blendMode}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-text-muted">No layer selected</p>
        )}
      </div>
    </aside>
  );
}
