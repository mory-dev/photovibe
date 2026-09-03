import type { CSSProperties } from "react";

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  onChange,
  label,
  className,
}: SliderProps) {
  const fill = ((value - min) / (max - min)) * 100;

  return (
    <label className={className ?? "flex flex-col gap-1"}>
      {label && (
        <span className="text-[10px] text-text-muted">{label}</span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pv-slider"
        style={{ "--pv-fill": `${fill}%` } as CSSProperties}
      />
    </label>
  );
}
