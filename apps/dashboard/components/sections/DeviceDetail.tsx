"use client";

import { useMemo, useState } from "react";

import { MetricChart } from "@/components/charts/MetricChart";
import { BentoCard } from "@/components/ui/BentoCard";
import { MetricTile } from "@/components/ui/MetricTile";
import { SegmentedControl, type SegmentOption } from "@/components/ui/SegmentedControl";
import { useDevice } from "@/hooks/useFleet";
import { useDeviceHistory } from "@/hooks/useHistory";
import { RANGE_LABEL, RANGE_LONG_LABEL } from "@/lib/labels";
import { LIVE_POINTS, useFleetStore, type LivePoint } from "@/lib/store/fleet";
import { METRICS, RANGES, type HistoryPoint, type Range } from "@/lib/types";

const RANGE_OPTIONS: SegmentOption<Range>[] = RANGES.map((r) => ({
  value: r,
  label: RANGE_LABEL[r],
  title: RANGE_LONG_LABEL[r],
}));

const FIFTEEN_MIN_MS = 15 * 60_000;
const EMPTY: LivePoint[] = [];

function toHistoryPoint(p: LivePoint): HistoryPoint {
  return {
    bucket: p.t,
    temperature_avg: p.temperature,
    temperature_max: p.temperature,
    vibration_avg: p.vibration,
    vibration_max: p.vibration,
    pressure_avg: p.pressure,
    pressure_min: p.pressure,
    current_avg: p.current,
    current_max: p.current,
    samples: 1,
  };
}

/** RPC history (5 s buckets) up to the first live point, then the 1 Hz live stream. */
function mergeLive(history: HistoryPoint[], live: LivePoint[]): HistoryPoint[] {
  const firstLive = live[0]?.t ?? Number.POSITIVE_INFINITY;
  const merged = [...history.filter((p) => p.bucket < firstLive), ...live.map(toHistoryPoint)];
  const end = merged.at(-1)?.bucket ?? 0;
  return merged.filter((p) => p.bucket > end - FIFTEEN_MIN_MS).slice(-LIVE_POINTS);
}

/** Range selector + four metric charts with limit lines; "15d" streams live. */
export function DeviceDetail({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId);
  const [range, setRange] = useState<Range>("15m");
  const history = useDeviceHistory(deviceId, range);
  const live = useFleetStore((s) => s.live[deviceId] ?? EMPTY);
  const isLive = range === "15m";

  const data = useMemo(
    () => (isLive ? mergeLive(history.data ?? [], live) : (history.data ?? [])),
    [isLive, history.data, live],
  );

  if (!device) return null;
  const hasData = device.ts > 0;

  return (
    <section aria-labelledby="metrics-title" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6 md:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{isLive ? "Telemetri · canlı" : "Telemetri"}</p>
          <h2 id="metrics-title" className="mt-2 text-section">
            {RANGE_LONG_LABEL[range]}.
          </h2>
        </div>
        <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} label="Zaman aralığı" />
      </div>

      {history.isError ? (
        <p role="alert" className="mb-6 text-[15px] text-ink-secondary">
          Geçmiş veri alınamadı; 30 saniye içinde yeniden denenecek.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        {METRICS.map((metric) => (
          <BentoCard key={metric}>
            <MetricTile
              metric={metric}
              value={hasData ? device.values[metric] : null}
              z={device.z[metric]}
              zone={device.zones[metric]}
            />
            <div className="mt-4">
              {data.length > 1 ? (
                <MetricChart
                  metric={metric}
                  data={data}
                  limit={device.limits[metric]}
                  range={range}
                  live={isLive}
                />
              ) : (
                <p className="grid h-56 place-items-center text-[15px] text-ink-secondary">
                  {history.isLoading ? "Yükleniyor…" : "Bu aralıkta henüz veri yok."}
                </p>
              )}
            </div>
          </BentoCard>
        ))}
      </div>
    </section>
  );
}
