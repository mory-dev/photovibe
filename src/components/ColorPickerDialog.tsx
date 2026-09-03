import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Color } from "../engine/document/types";
import { colorToCss } from "../engine/pixels/generate";
import { colorToHex, hexToRgb, hslToRgb, hsvToRgb, rgbToHsl, rgbToHsv, type Hsv } from "../lib/color";
import { Modal } from "./ui/Modal";

interface ColorPickerDialogProps {
  color: Color;
  onChange: (color: Color) => void;
  onClose: () => void;
}

const WHEEL = 168;
const RADIUS = WHEEL / 2;

/**
 * Hue/saturation wheel plus a value slider, with RGB, HSL, alpha and hex
 * fields. HSV is the source of truth while the dialog is open so that dragging
 * through black or grey does not lose the hue you picked.
 */
export function ColorPickerDialog({ color, onChange, onClose }: ColorPickerDialogProps) {
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(color));
  const [alpha, setAlpha] = useState(color.a);
  const [hexDraft, setHexDraft] = useState(() => colorToHex(color));
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);

  const rgb = useMemo(() => hsvToRgb(hsv), [hsv]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const current: Color = useMemo(() => ({ ...rgb, a: alpha }), [rgb, alpha]);

  useEffect(() => {
    setHexDraft(colorToHex(rgb));
  }, [rgb.r, rgb.g, rgb.b]);

  // Repaint the wheel whenever value changes so it previews the current shade.
  useEffect(() => {
    const canvas = wheelRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const image = ctx.createImageData(WHEEL, WHEEL);
    for (let y = 0; y < WHEEL; y += 1) {
      for (let x = 0; x < WHEEL; x += 1) {
        const dx = x - RADIUS + 0.5;
        const dy = y - RADIUS + 0.5;
        const distance = Math.hypot(dx, dy);
        const offset = (x + y * WHEEL) * 4;
        if (distance > RADIUS) {
          image.data[offset + 3] = 0;
          continue;
        }
        const hue = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        const { r, g, b } = hsvToRgb({ h: hue, s: Math.min(1, distance / RADIUS), v: hsv.v });
        image.data[offset] = r;
        image.data[offset + 1] = g;
        image.data[offset + 2] = b;
        // Feather the rim so the circle does not look jagged.
        image.data[offset + 3] = Math.round(255 * Math.min(1, RADIUS - distance));
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [hsv.v]);

  const pickFromWheel = useCallback((clientX: number, clientY: number) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = clientX - rect.left - RADIUS;
    const dy = clientY - rect.top - RADIUS;
    const distance = Math.hypot(dx, dy);
    const hue = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    setHsv((prev) => ({ ...prev, h: (hue + 360) % 360, s: Math.min(1, distance / RADIUS) }));
  }, []);

  const markerX = RADIUS + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * RADIUS;
  const markerY = RADIUS - Math.cos((hsv.h * Math.PI) / 180) * hsv.s * RADIUS;

  const setChannel = (channel: "r" | "g" | "b", value: number) => {
    const next = { ...rgb, [channel]: Math.min(255, Math.max(0, Math.round(value || 0))) };
    setHsv(rgbToHsv(next));
  };

  const setHslPart = (part: "h" | "s" | "l", value: number) => {
    const next = { ...hsl, [part]: part === "h" ? value : value / 100 };
    setHsv(rgbToHsv(hslToRgb(next)));
  };

  return (
    <Modal title="Color" onClose={onClose} width={420}>
      <div className="flex gap-5 text-[11px]">
        <div className="shrink-0">
          <div className="relative" style={{ width: WHEEL, height: WHEEL }}>
            <canvas
              ref={wheelRef}
              width={WHEEL}
              height={WHEEL}
              className="cursor-crosshair rounded-full"
              style={{ width: WHEEL, height: WHEEL }}
              onPointerDown={(e) => {
                draggingRef.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                pickFromWheel(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => draggingRef.current && pickFromWheel(e.clientX, e.clientY)}
              onPointerUp={() => (draggingRef.current = false)}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: markerX, top: markerY }}
            />
          </div>

          <label className="mt-3 flex flex-col gap-1 text-text-muted">
            Value
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(hsv.v * 100)}
              onChange={(e) => setHsv((prev) => ({ ...prev, v: Number(e.target.value) / 100 }))}
              className="pv-slider"
              style={{ ["--pv-fill" as string]: `${hsv.v * 100}%` }}
            />
          </label>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className="h-9 w-9 shrink-0 rounded-md border border-border"
              style={{ background: colorToCss(current) }}
            />
            <label className="flex min-w-0 flex-1 items-center gap-2 text-text-muted">
              Hex
              <input
                value={hexDraft}
                onChange={(e) => {
                  setHexDraft(e.target.value);
                  const parsed = hexToRgb(e.target.value);
                  if (parsed) setHsv(rgbToHsv(parsed));
                }}
                spellCheck={false}
                className="w-full min-w-0 rounded border border-border bg-surface-2 px-2 py-1 font-mono text-text"
              />
            </label>
          </div>

          <Row label="R" value={rgb.r} max={255} onChange={(v) => setChannel("r", v)} />
          <Row label="G" value={rgb.g} max={255} onChange={(v) => setChannel("g", v)} />
          <Row label="B" value={rgb.b} max={255} onChange={(v) => setChannel("b", v)} />

          <Row label="H" value={Math.round(hsl.h)} max={360} suffix="°" onChange={(v) => setHslPart("h", v)} />
          <Row label="S" value={Math.round(hsl.s * 100)} max={100} suffix="%" onChange={(v) => setHslPart("s", v)} />
          <Row label="L" value={Math.round(hsl.l * 100)} max={100} suffix="%" onChange={(v) => setHslPart("l", v)} />

          <Row
            label="A"
            value={Math.round(alpha * 100)}
            max={100}
            suffix="%"
            onChange={(v) => setAlpha(Math.min(1, Math.max(0, v / 100)))}
          />

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="rounded px-3 py-1 text-text-muted hover:bg-surface-2" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-accent px-3 py-1 text-[#1a1a1a] hover:bg-accent-hover"
              onClick={() => {
                onChange(current);
                onClose();
              }}
            >
              Use color
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Row({
  label,
  value,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-text-muted">
      <span className="w-3 text-text">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pv-slider flex-1"
        style={{ ["--pv-fill" as string]: `${(value / max) * 100}%` }}
      />
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-right text-text"
      />
      {suffix && <span className="w-3">{suffix}</span>}
    </label>
  );
}
