"use client";

import Link from "next/link";
import { useState } from "react";

import { useSession } from "@/components/providers/SessionProvider";
import { BentoCard } from "@/components/ui/BentoCard";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { DeviceTypeIcon } from "@/components/ui/DeviceTypeIcon";
import { IntensitySlider } from "@/components/ui/IntensitySlider";
import { PillButton } from "@/components/ui/PillButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDevices } from "@/hooks/useFleet";
import { sendSimCommand } from "@/lib/sim";
import { useFleetStore } from "@/lib/store/fleet";

import { SimulationControls } from "./SimulationControls";

/** Device grid with fault pills on every card, one shared intensity slider and a global reset. */
export function SimulatorPanel() {
  const user = useSession();
  const devices = useDevices();
  const activeCount = useFleetStore((s) => Object.values(s.faults).filter((f) => Object.keys(f).length > 0).length);
  const [intensity, setIntensity] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function resetAll() {
    setBusy(true);
    const result = await sendSimCommand({ action: "reset", device_id: "all" });
    setBusy(false);
    setMessage(result.ok ? "Tüm arızalar temizlendi." : (result.message ?? ""));
  }

  return (
    <div>
      <div className="mb-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <IntensitySlider value={intensity} onChange={setIntensity} disabled={!user} className="max-w-sm" />
        <div className="flex flex-wrap items-center gap-4 md:justify-end">
          <p className="text-[15px] text-ink-secondary" aria-live="polite">
            {message || (activeCount === 0 ? "Aktif arıza yok." : `${activeCount} cihazda aktif arıza var.`)}
          </p>
          <PillButton variant="tinted" onClick={() => void resetAll()} disabled={!user || busy || activeCount === 0}>
            Tümünü sıfırla
          </PillButton>
        </div>
      </div>

      {devices.length === 0 ? (
        <p className="py-16 text-center text-lead text-ink-secondary">Henüz cihaz yok. Simülatör çalışınca burada görünecek.</p>
      ) : (
        <BentoGrid columns={3}>
          {devices.map((device) => (
            <BentoCard key={device.device_id} as="article">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <DeviceTypeIcon type={device.type} />
                  <div className="min-w-0">
                    <h2 className="truncate text-[17px] font-semibold leading-tight">
                      <Link href={`/devices/${device.device_id}`} className="hover:underline">
                        {device.name}
                      </Link>
                    </h2>
                    <p className="truncate text-[14px] text-ink-secondary">{device.site}</p>
                  </div>
                </div>
                <StatusBadge status={device.status} />
              </div>
              <SimulationControls
                compact
                deviceId={device.device_id}
                deviceName={device.name}
                intensity={intensity}
              />
            </BentoCard>
          ))}
        </BentoGrid>
      )}
    </div>
  );
}
