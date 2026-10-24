import Link from "next/link";

import { formatEta, formatMetric, formatNumber } from "@/lib/format";
import { METRIC_LABEL } from "@/lib/labels";
import type { DeviceState } from "@/lib/types";

import { BentoCard } from "./BentoCard";
import { DeviceTypeIcon } from "./DeviceTypeIcon";
import { Sparkline } from "./Sparkline";
import { StatusBadge } from "./StatusBadge";

interface DeviceCardProps {
  device: DeviceState;
  sparkline: number[];
  span?: "single" | "wide" | "large";
}

const SPARK_COLOR = {
  normal: "rgb(var(--accent))",
  warning: "rgb(var(--status-warn-strong))",
  critical: "rgb(var(--status-crit))",
} as const;

export function DeviceCard({ device, sparkline, span = "single" }: DeviceCardProps) {
  const eta = device.eta_minutes;
  const waiting = device.ts === 0; // registered but no telemetry yet
  return (
    <BentoCard span={span} interactive className="group p-0 sm:p-0">
      <Link
        href={`/devices/${device.device_id}`}
        className="flex h-full flex-col gap-4 rounded-[inherit] p-5 sm:p-6"
      >
        <div>
          <div className="flex items-center justify-between gap-3">
            <DeviceTypeIcon type={device.type} />
            <StatusBadge status={device.status} />
          </div>
          <h3 className="mt-3 truncate text-[17px] font-semibold leading-tight">{device.name}</h3>
          <p className="truncate text-[14px] text-ink-secondary">{device.site}</p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <p className="leading-none">
            <span className="block text-[13px] font-medium text-ink-secondary">Sağlık</span>
            <span className="text-[44px] font-semibold tabular-nums tracking-tight">
              {waiting ? "—" : formatNumber(Math.round(device.health))}
            </span>
          </p>
          <p className="text-right text-[14px] leading-tight">
            <span className="block text-ink-secondary">{METRIC_LABEL.temperature}</span>
            <span className="font-semibold tabular-nums">
              {waiting ? "Veri bekleniyor" : formatMetric("temperature", device.values.temperature)}
            </span>
          </p>
        </div>

        {sparkline.length > 1 ? (
          <Sparkline
            values={sparkline}
            label={`${device.name} son 60 saniye sıcaklık eğilimi`}
            color={SPARK_COLOR[device.status]}
          />
        ) : (
          <div className="h-10" aria-hidden="true" />
        )}

        {eta !== null && device.eta_metric ? (
          <p className="-mt-1 text-[14px] font-medium text-ink">
            <span className="text-ink-secondary">{METRIC_LABEL[device.eta_metric]}: </span>
            {formatEta(eta)}
          </p>
        ) : null}
      </Link>
    </BentoCard>
  );
}
