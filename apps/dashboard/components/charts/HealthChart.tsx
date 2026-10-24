"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatAxisTime, formatNumber } from "@/lib/format";
import type { HealthPoint } from "@/lib/types";

/** 24 h health score with the warning (70) and critical (40) bands marked. */
export function HealthChart({ data }: { data: HealthPoint[] }) {
  const latest = data.at(-1)?.health_avg;
  const summary =
    "Son 24 saat sağlık skoru." +
    (latest !== undefined && latest !== null ? ` Son değer ${formatNumber(latest)}.` : "") +
    " 70'in altı uyarı, 40'ın altı kritik.";
  return (
    <figure className="m-0">
      <figcaption className="sr-only">{summary}</figcaption>
      <div className="h-48 w-full" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="rgb(var(--hairline) / 0.08)" />
            <XAxis
              dataKey="bucket"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t: number) => formatAxisTime(t, false)}
              tick={{ fill: "rgb(var(--ink-secondary))", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={56}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 40, 70, 100]}
              tick={{ fill: "rgb(var(--ink-secondary))", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card-glass)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgb(var(--hairline) / 0.1)",
                borderRadius: 12,
                color: "rgb(var(--ink))",
                fontSize: 13,
              }}
              labelFormatter={(t) => formatAxisTime(Number(t), true)}
              formatter={(v, name) => [formatNumber(Number(v)), name === "health_min" ? "En düşük" : "Ortalama"]}
            />
            <ReferenceLine y={70} stroke="rgb(var(--status-warn-strong))" strokeDasharray="5 5" />
            <ReferenceLine y={40} stroke="rgb(var(--status-crit))" strokeDasharray="5 5" />
            <Line
              type="monotone"
              dataKey="health_min"
              stroke="rgb(var(--accent))"
              strokeOpacity={0.3}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="health_avg"
              stroke="rgb(var(--accent))"
              strokeWidth={2}
              dot={false}
              animationDuration={400}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
