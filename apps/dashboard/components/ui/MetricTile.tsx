import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { METRIC_DECIMALS, METRIC_LABEL, METRIC_UNIT } from "@/lib/labels";
import type { Metric, Status } from "@/lib/types";

import { StatusDot } from "./StatusBadge";

interface MetricTileProps {
  metric: Metric;
  value: number;
  z: number;
  zone: Status;
  className?: string;
}

/** Value + unit + z-score, with the limit zone shown as dot + text. */
export function MetricTile({ metric, value, z, zone, className }: MetricTileProps) {
  const zoneText = zone === "normal" ? "Limit içinde" : zone === "warning" ? "Uyarı bölgesi" : "Kritik bölge";
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[14px] font-medium text-ink-secondary">{METRIC_LABEL[metric]}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-[32px] font-semibold tabular-nums tracking-tight">
          {formatNumber(value, METRIC_DECIMALS[metric])}
        </span>
        <span className="text-[15px] text-ink-secondary">{METRIC_UNIT[metric]}</span>
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        <span className="inline-flex items-center gap-1.5">
          <StatusDot status={zone} />
          {zoneText}
        </span>
        <span className="tabular-nums text-ink-secondary">
          z {z >= 0 ? "+" : "−"}
          {formatNumber(Math.abs(z), 1)}
        </span>
      </p>
    </div>
  );
}
