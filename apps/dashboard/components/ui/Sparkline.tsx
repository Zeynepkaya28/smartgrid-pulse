import { cn } from "@/lib/cn";

interface SparklineProps {
  values: number[];
  label: string;
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

/** Tiny trend line; scales to its container width. */
export function Sparkline({
  values,
  label,
  width = 160,
  height = 40,
  color = "rgb(var(--accent))",
  className,
}: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={cn("h-10 w-full", className)}
    >
      <polygon points={area} fill={color} opacity={0.08} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
