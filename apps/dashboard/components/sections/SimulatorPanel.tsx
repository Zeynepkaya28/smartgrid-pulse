"use client";

import Link from "next/link";
import { useState } from "react";

import { BentoCard } from "@/components/ui/BentoCard";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { DeviceTypeIcon } from "@/components/ui/DeviceTypeIcon";
import { PillButton } from "@/components/ui/PillButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { DeviceState, FaultType } from "@/lib/types";

import { SimulationControls } from "./SimulationControls";

interface SimulatorPanelProps {
  devices: DeviceState[];
  initialFaults: Record<string, FaultType[]>;
}

/** Device grid with fault pills on every card and a global reset. */
export function SimulatorPanel({ devices, initialFaults }: SimulatorPanelProps) {
  // Bumping the key remounts every card, which resets their local fault state.
  const [resetKey, setResetKey] = useState(0);
  const [faults, setFaults] = useState(initialFaults);
  const activeCount = Object.values(faults).filter((f) => f.length > 0).length;

  function resetAll() {
    setFaults({});
    setResetKey((k) => k + 1);
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[17px] text-ink-secondary" aria-live="polite">
          {activeCount === 0 ? "Aktif arıza yok." : `${activeCount} cihazda aktif arıza var.`}
        </p>
        <PillButton variant="tinted" onClick={resetAll} disabled={activeCount === 0}>
          Tümünü sıfırla
        </PillButton>
      </div>
      <BentoGrid columns={3}>
        {devices.map((device) => (
          <BentoCard key={`${device.device_id}-${resetKey}`} as="article">
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
              deviceName={device.name}
              initialFaults={faults[device.device_id] ?? []}
              onChange={(next) => setFaults((prev) => ({ ...prev, [device.device_id]: next }))}
            />
          </BentoCard>
        ))}
      </BentoGrid>
    </div>
  );
}
