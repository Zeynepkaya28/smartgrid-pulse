"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { FAULT_LABEL } from "@/lib/labels";
import { FAULT_TYPES, type FaultType } from "@/lib/types";

interface SimulationControlsProps {
  deviceName: string;
  initialFaults: FaultType[];
  compact?: boolean;
  /** Called after a local change; Phase 5 sends the MQTT command here. */
  onChange?: (faults: FaultType[]) => void;
}

/** Fault pills for one device. Preview only in Phase 4: state stays in the browser. */
export function SimulationControls({
  deviceName,
  initialFaults,
  compact = false,
  onChange,
}: SimulationControlsProps) {
  const [active, setActive] = useState<FaultType[]>(initialFaults);

  function update(next: FaultType[]) {
    setActive(next);
    onChange?.(next);
  }

  function toggle(fault: FaultType) {
    update(active.includes(fault) ? active.filter((f) => f !== fault) : [...active, fault]);
  }

  return (
    <div role="group" aria-label={`${deviceName} arıza komutları`} className="flex flex-wrap gap-2">
      {FAULT_TYPES.map((fault) => {
        const on = active.includes(fault);
        return (
          <button
            key={fault}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(fault)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3.5 font-medium transition-colors duration-200 ease-apple",
              compact ? "text-[13px]" : "text-[14px]",
              on
                ? "bg-crit/15 text-ink ring-1 ring-inset ring-crit/40"
                : "bg-hairline/[0.06] text-ink hover:bg-hairline/10",
            )}
          >
            {on ? <span aria-hidden="true" className="size-1.5 rounded-full bg-crit" /> : null}
            {FAULT_LABEL[fault]}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => update([])}
        disabled={active.length === 0}
        className={cn(
          "inline-flex min-h-9 items-center rounded-pill px-3.5 font-medium text-accent transition-opacity duration-200 disabled:opacity-40",
          compact ? "text-[13px]" : "text-[14px]",
        )}
      >
        Temizle
      </button>
    </div>
  );
}
