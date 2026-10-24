"use client";

import { useMemo, useState } from "react";

import { MetricChart } from "@/components/charts/MetricChart";
import { BentoCard } from "@/components/ui/BentoCard";
import { MetricTile } from "@/components/ui/MetricTile";
import { SegmentedControl, type SegmentOption } from "@/components/ui/SegmentedControl";
import { RANGE_LABEL, RANGE_LONG_LABEL } from "@/lib/labels";
import { getMockHistory } from "@/lib/mock";
import { METRICS, RANGES, type DeviceState, type Range } from "@/lib/types";

const RANGE_OPTIONS: SegmentOption<Range>[] = RANGES.map((r) => ({
  value: r,
  label: RANGE_LABEL[r],
  title: RANGE_LONG_LABEL[r],
}));

interface DeviceDetailProps {
  device: DeviceState;
}

/** Range selector + four metric charts with limit lines. */
export function DeviceDetail({ device }: DeviceDetailProps) {
  const [range, setRange] = useState<Range>("1h");
  const history = useMemo(() => getMockHistory(device.device_id, range), [device.device_id, range]);

  return (
    <section aria-labelledby="metrics-title" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6 md:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Telemetri</p>
          <h2 id="metrics-title" className="mt-2 text-section">
            {RANGE_LONG_LABEL[range]}.
          </h2>
        </div>
        <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} label="Zaman aralığı" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        {METRICS.map((metric) => (
          <BentoCard key={metric}>
            <MetricTile
              metric={metric}
              value={device.values[metric]}
              z={device.z[metric]}
              zone={device.zones[metric]}
            />
            <div className="mt-4">
              <MetricChart metric={metric} data={history} limit={device.limits[metric]} range={range} />
            </div>
          </BentoCard>
        ))}
      </div>
    </section>
  );
}
