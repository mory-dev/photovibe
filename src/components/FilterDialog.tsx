import { useEffect, useMemo, useRef, useState } from "react";
import type { Filter } from "../engine/filters/adjustments";
import { beginFilter, previewFilter, revertFilter, type FilterTarget } from "../engine/filters/apply";
import type { Layer } from "../engine/document/types";
import { Modal } from "./ui/Modal";
import { Slider } from "./ui/Slider";

export interface FilterParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  initial: number;
  suffix?: string;
}

export interface FilterSpec {
  name: string;
  params: FilterParam[];
  build: (values: Record<string, number>) => Filter;
}

interface FilterDialogProps {
  spec: FilterSpec;
  layer: Layer;
  scopedToSelection: boolean;
  onApply: (filter: Filter) => void;
  onClose: () => void;
}

/**
 * Runs a filter live on the layer so the canvas itself is the preview, then
 * either commits it through the caller (which wraps it in a history step) or
 * puts the original pixels back.
 */
export function FilterDialog({ spec, layer, scopedToSelection, onApply, onClose }: FilterDialogProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(spec.params.map((param) => [param.key, param.initial])),
  );
  const targetRef = useRef<FilterTarget | null>(null);
  const committedRef = useRef(false);

  // Capture the untouched pixels once, and restore them if the dialog closes
  // without applying.
  useEffect(() => {
    targetRef.current = beginFilter(layer);
    return () => {
      if (targetRef.current && !committedRef.current) revertFilter(targetRef.current);
      targetRef.current = null;
    };
  }, [layer]);

  const filter = useMemo(() => spec.build(values), [spec, values]);

  useEffect(() => {
    if (targetRef.current) previewFilter(targetRef.current, filter);
  }, [filter]);

  return (
    <Modal title={spec.name} onClose={onClose} width={380}>
      <div className="space-y-4 text-[11px]">
        {spec.params.length === 0 && (
          <p className="text-text-muted">
            Applies immediately with no settings to adjust.
          </p>
        )}

        {spec.params.map((param) => (
          <Slider
            key={param.key}
            label={`${param.label} ${formatValue(values[param.key], param)}`}
            min={param.min}
            max={param.max}
            value={values[param.key]}
            onChange={(value) => setValues((prev) => ({ ...prev, [param.key]: value }))}
          />
        ))}

        <p className="text-text-muted">
          {scopedToSelection ? "Applies to the current selection." : "Applies to the whole layer."}
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="rounded px-3 py-1 text-text-muted hover:bg-surface-2" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-accent px-3 py-1 text-[#1a1a1a] hover:bg-accent-hover"
            onClick={() => {
              // Hand back the original pixels so the caller can open a history
              // step before the change lands.
              if (targetRef.current) revertFilter(targetRef.current);
              committedRef.current = true;
              onApply(filter);
              onClose();
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}

function formatValue(value: number, param: FilterParam): string {
  const rounded = param.step && param.step < 1 ? value.toFixed(1) : String(Math.round(value));
  return `${rounded}${param.suffix ?? ""}`;
}
