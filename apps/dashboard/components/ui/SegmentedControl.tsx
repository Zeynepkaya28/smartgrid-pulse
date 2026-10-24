"use client";

import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Accessible name when the visible label is an abbreviation. */
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** iOS-style segmented control (radio group, arrow-key navigation). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    const option = options[next];
    if (option) {
      onChange(option.value);
      refs.current[next]?.focus();
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative inline-grid rounded-[10px] bg-hairline/[0.07] p-0.5",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 rounded-[8px] bg-canvas shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-apple dark:bg-[rgb(99_99_102)]"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.title}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "relative z-10 min-h-8 min-w-11 rounded-[8px] px-3 text-[13px] font-semibold transition-colors duration-200",
              // ink at 75 % keeps unselected labels above 4.5:1 on the gray track.
              selected ? "text-ink" : "text-ink/75 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
