"use client";

import { useShallow } from "zustand/react/shallow";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { DeviceCard } from "@/components/ui/DeviceCard";
import { useDevices } from "@/hooks/useFleet";
import { useFleetStore } from "@/lib/store/fleet";
import type { DeviceState } from "@/lib/types";

const SPARK_POINTS = 60;

function LiveDeviceCard({ device, span }: { device: DeviceState; span: "single" | "wide" }) {
  const sparkline = useFleetStore(
    useShallow((s) => (s.live[device.device_id] ?? []).slice(-SPARK_POINTS).map((p) => p.temperature)),
  );
  return <DeviceCard device={device} sparkline={sparkline} span={span} />;
}

interface DeviceGridProps {
  columns?: 3 | 4;
  /** Give the first card two columns when it is critical. */
  highlightCritical?: boolean;
  site?: string;
}

/** Live device cards, most urgent first. */
export function DeviceGrid({ columns = 4, highlightCritical = false, site }: DeviceGridProps) {
  const all = useDevices();
  const devices = site ? all.filter((d) => d.site === site) : all;
  if (devices.length === 0) {
    return (
      <p className="py-12 text-center text-lead text-ink-secondary">
        Henüz cihaz yok. Simülatör çalıştığında cihazlar burada görünür.
      </p>
    );
  }
  return (
    <BentoGrid columns={columns}>
      {devices.map((device, i) => (
        <LiveDeviceCard
          key={device.device_id}
          device={device}
          span={highlightCritical && i === 0 && device.status === "critical" ? "wide" : "single"}
        />
      ))}
    </BentoGrid>
  );
}

/** Devices grouped by site (for /devices). */
export function DevicesBySite() {
  const devices = useDevices();
  const sites = [...new Set(devices.map((d) => d.site))].sort((a, b) => a.localeCompare(b, "tr"));
  return (
    <>
      {sites.map((site, i) => {
        const id = `saha-${i}`;
        return (
          <section key={site} aria-labelledby={id} className="mb-16 last:mb-0">
            <h2 id={id} className="mb-6 text-[28px] font-semibold tracking-tight sm:text-[32px]">
              {site}
            </h2>
            <DeviceGrid columns={3} site={site} />
          </section>
        );
      })}
    </>
  );
}
