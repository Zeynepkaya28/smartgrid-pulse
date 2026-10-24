"use client";

import { FleetHealthRing } from "@/components/ui/FleetHealthRing";
import { StatStrip } from "@/components/ui/StatStrip";
import { useDevices } from "@/hooks/useFleet";
import { formatBytes, formatCompact, formatNumber } from "@/lib/format";
import { useFleetStore } from "@/lib/store/fleet";
import type { FleetStats } from "@/lib/types";

export function FleetSubtitle() {
  const devices = useDevices();
  const attention = devices.filter((d) => d.status !== "normal").length;
  return (
    <span aria-live="polite">
      {formatNumber(devices.length)} cihaz, saniyede bir ölçüm.{" "}
      {attention > 0 ? `${attention} cihaz şu an dikkat istiyor.` : "Şu an her şey yolunda."}
    </span>
  );
}

export function LiveFleetRing() {
  const devices = useDevices();
  const live = devices.filter((d) => d.ts > 0);
  const avg = live.length ? live.reduce((s, d) => s + d.health, 0) / live.length : 100;
  return <FleetHealthRing value={avg} deviceCount={devices.length} />;
}

/** Headline numbers: DB stats from the server, alert count live. */
export function LiveStatStrip({ stats }: { stats: FleetStats | null }) {
  const devices = useDevices();
  const openAlerts = useFleetStore((s) => s.alerts.filter((a) => !a.acknowledged).length);
  const sites = new Set(devices.map((d) => d.site)).size;
  return (
    <StatStrip
      stats={[
        { label: "Cihaz", value: formatNumber(devices.length), hint: `${sites} saha` },
        {
          label: "Mesaj/sn",
          value: stats ? formatNumber(stats.messages_per_second, 0) : "—",
          hint: "MQTT telemetri",
        },
        { label: "Aktif alarm", value: formatNumber(openAlerts), hint: "Onay bekliyor" },
        {
          label: "Veri boyutu",
          value: stats ? formatBytes(stats.telemetry_bytes + stats.telemetry_1m_bytes + stats.device_health_bytes) : "—",
          hint: stats ? `~${formatCompact(stats.telemetry_rows_estimate)} ham satır` : undefined,
        },
      ]}
    />
  );
}
