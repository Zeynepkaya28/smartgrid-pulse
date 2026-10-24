"use client";

import { DeviceTypeIcon } from "@/components/ui/DeviceTypeIcon";
import { HealthRing } from "@/components/ui/HealthRing";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDevice } from "@/hooks/useFleet";
import { formatEta } from "@/lib/format";
import { METRIC_LABEL, TYPE_LABEL } from "@/lib/labels";

/** Device hero: name, live status, ETA and health ring. */
export function DeviceHeader({ deviceId }: { deviceId: string }) {
  const device = useDevice(deviceId);
  if (!device) return null;
  return (
    <section className="mx-auto grid w-full max-w-content items-center gap-10 px-4 pb-4 pt-16 sm:px-6 md:grid-cols-[1fr_auto] md:pt-24">
      <div className="fade-up min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <DeviceTypeIcon type={device.type} />
          <p className="eyebrow">
            {TYPE_LABEL[device.type]} · {device.site}
          </p>
        </div>
        <h1 className="mt-4 text-balance text-hero">{device.name}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2" aria-live="polite">
          <StatusBadge status={device.status} className="px-3 py-1.5 text-[15px]" />
          {device.ts === 0 ? (
            <p className="text-lead text-ink-secondary">Veri bekleniyor.</p>
          ) : device.eta_minutes !== null && device.eta_metric ? (
            <p className="text-lead font-medium">
              {METRIC_LABEL[device.eta_metric]} {formatEta(device.eta_minutes)}
            </p>
          ) : (
            <p className="text-lead text-ink-secondary">Kritik eğilim yok.</p>
          )}
        </div>
      </div>
      <HealthRing
        value={device.health}
        size={200}
        stroke={14}
        label={`${device.name} sağlık skoru`}
        caption="Sağlık"
        className="fade-up mx-auto [animation-delay:120ms]"
      />
    </section>
  );
}
