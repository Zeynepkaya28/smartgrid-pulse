import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

interface HealthRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
  /** Scale with the container width instead of a fixed pixel size. */
  fluid?: boolean;
  className?: string;
}

function ringColor(value: number): string {
  if (value < 40) return "rgb(var(--status-crit))";
  if (value < 70) return "rgb(var(--status-warn-strong))";
  return "rgb(var(--status-ok))";
}

/** SVG health ring. The fill animates in with CSS (skipped under reduced motion). */
export function HealthRing({
  value,
  size = 120,
  stroke = 10,
  label = "Sağlık skoru",
  caption,
  fluid = false,
  className,
}: HealthRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const rounded = Math.round(clamped);

  return (
    <figure className={cn("relative grid place-items-center", !fluid && "w-fit", className)}>
      <svg
        width={fluid ? undefined : size}
        height={fluid ? undefined : size}
        style={fluid ? { width: "100%", height: "auto" } : undefined}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${rounded} / 100`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--hairline) / 0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor(clamped)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="health-ring-arc"
          style={{ "--ring-c": `${circumference}` } as CSSProperties}
        />
      </svg>
      <figcaption className="absolute inset-0 grid place-items-center text-center" aria-hidden="true">
        <span>
          <span
            className="block font-semibold tabular-nums tracking-tight"
            style={{ fontSize: fluid ? `min(${size * 0.3}px, 24vw)` : size * 0.3, lineHeight: 1 }}
          >
            {formatNumber(rounded)}
          </span>
          {caption ? (
            <span className="mt-1 block text-[13px] font-medium text-ink-secondary">{caption}</span>
          ) : null}
        </span>
      </figcaption>
    </figure>
  );
}
