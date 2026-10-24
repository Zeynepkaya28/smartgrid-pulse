"use client";

import { useId, type CSSProperties } from "react";

import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

interface IntensitySliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

/** iOS-style slider for fault intensity (0.5x – 3x). Native range input underneath. */
export function IntensitySlider({
  value,
  onChange,
  min = 0.5,
  max = 3,
  step = 0.1,
  disabled = false,
  className,
}: IntensitySliderProps) {
  const id = useId();
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[14px] font-medium text-ink-secondary">
          Şiddet
        </label>
        <output htmlFor={id} className="text-[15px] font-semibold tabular-nums">
          {formatNumber(value, 1)}×
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${formatNumber(value, 1)} kat`}
        className="ios-slider mt-2 w-full disabled:opacity-40"
        style={{ "--fill": `${percent}%` } as CSSProperties}
      />
      <div className="mt-1 flex justify-between text-[12px] text-ink-secondary" aria-hidden="true">
        <span>Hafif</span>
        <span>Şiddetli</span>
      </div>
    </div>
  );
}
