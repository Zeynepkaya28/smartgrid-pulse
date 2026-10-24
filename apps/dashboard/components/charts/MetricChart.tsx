"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatAxisTime, formatNumber } from "@/lib/format";
import { METRIC_DECIMALS, METRIC_LABEL, METRIC_UNIT, RANGE_LONG_LABEL } from "@/lib/labels";
import type { HistoryPoint, Limit, Metric, Range } from "@/lib/types";

interface MetricChartProps {
  metric: Metric;
  data: HistoryPoint[];
  limit: Limit;
  range: Range;
  /** Live streaming mode: no Recharts animation so new points slide in smoothly. */
  live?: boolean;
}

interface Row {
  t: number;
  avg: number | null;
  extreme: number | null;
}

const EXTREME_KEY: Record<Metric, keyof HistoryPoint> = {
  temperature: "temperature_max",
  vibration: "vibration_max",
  pressure: "pressure_min",
  current: "current_max",
};

function domain(rows: Row[], limit: Limit): [number, number] {
  const values = rows.flatMap((r) => [r.avg, r.extreme]).filter((v): v is number => v !== null);
  if (values.length === 0) return [Math.min(limit.warning, limit.critical) * 0.5, Math.max(limit.warning, limit.critical) * 1.1];
  const lo = Math.min(...values, limit.warning, limit.critical);
  const hi = Math.max(...values, limit.warning, limit.critical);
  const pad = (hi - lo) * 0.08 || 1;
  return [Math.max(0, lo - pad), hi + pad];
}

/** Area chart for one metric with dashed warning/critical limit lines. */
export function MetricChart({ metric, data, limit, range, live = false }: MetricChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const decimals = METRIC_DECIMALS[metric];
  const unit = METRIC_UNIT[metric];
  const withDay = range === "7d" || range === "24h";
  const rows: Row[] = data.map((p) => ({
    t: p.bucket,
    avg: p[`${metric}_avg`],
    extreme: p[EXTREME_KEY[metric]] as number | null,
  }));
  const latest = rows.at(-1)?.avg;
  const summary =
    `${METRIC_LABEL[metric]}, ${RANGE_LONG_LABEL[range].toLowerCase()}. ` +
    (latest !== undefined && latest !== null
      ? `Son değer ${formatNumber(latest, decimals)} ${unit}. `
      : "") +
    `Uyarı limiti ${formatNumber(limit.warning, decimals)} ${unit}, kritik limit ${formatNumber(limit.critical, decimals)} ${unit}.`;

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{summary}</figcaption>
      <div className="h-56 w-full" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.22} />
                <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgb(var(--hairline) / 0.08)" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={(t: number) => formatAxisTime(t, withDay)}
              tick={{ fill: "rgb(var(--ink-secondary))", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
            />
            <YAxis
              domain={domain(rows, limit)}
              tickFormatter={(v: number) => formatNumber(v, decimals > 1 ? 1 : 0)}
              tick={{ fill: "rgb(var(--ink-secondary))", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ stroke: "rgb(var(--hairline) / 0.2)" }}
              contentStyle={{
                background: "var(--card-glass)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgb(var(--hairline) / 0.1)",
                borderRadius: 12,
                color: "rgb(var(--ink))",
                fontSize: 13,
              }}
              labelFormatter={(t) => formatAxisTime(Number(t), true)}
              formatter={(v, name) => [
                `${formatNumber(Number(v), decimals)} ${unit}`,
                name === "avg" ? "Ortalama" : metric === "pressure" ? "Minimum" : "Maksimum",
              ]}
            />
            <ReferenceLine
              y={limit.warning}
              stroke="rgb(var(--status-warn-strong))"
              strokeDasharray="5 5"
              label={{ value: "Uyarı", position: "insideTopRight", fill: "rgb(var(--ink-secondary))", fontSize: 11 }}
            />
            <ReferenceLine
              y={limit.critical}
              stroke="rgb(var(--status-crit))"
              strokeDasharray="5 5"
              label={{ value: "Kritik", position: "insideTopRight", fill: "rgb(var(--ink-secondary))", fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="extreme"
              stroke="rgb(var(--accent))"
              strokeOpacity={0.35}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="avg"
              stroke="rgb(var(--accent))"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={!live}
              animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
