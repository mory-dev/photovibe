import type { CSSProperties } from "react";
import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={cn("pv-skeleton", className)} style={style} aria-hidden="true" />;
}

export function LayerPanelSkeleton() {
  return (
    <aside className="flex h-full w-56 flex-col border-l border-border bg-surface-1">
      <header className="flex h-7 items-center border-b border-border px-2">
        <Skeleton className="h-3 w-12" />
      </header>
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded px-2 py-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <Skeleton className="h-3 flex-1" style={{ width: `${60 + i * 10}%` }} />
          </div>
        ))}
      </div>
    </aside>
  );
}

export function PropertiesPanelSkeleton() {
  return (
    <aside className="flex h-full w-56 flex-col border-l border-border bg-surface-1">
      <header className="flex h-7 items-center border-b border-border px-2">
        <Skeleton className="h-3 w-16" />
      </header>
      <div className="space-y-3 p-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </aside>
  );
}

export function CanvasSkeleton() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-canvas-bg">
      <Skeleton className="h-[min(600px,70vh)] w-[min(800px,80vw)] rounded-sm shadow-2xl ring-1 ring-border" />
    </div>
  );
}
