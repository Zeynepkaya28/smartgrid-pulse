"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useSession } from "@/components/providers/SessionProvider";
import { IntensitySlider } from "@/components/ui/IntensitySlider";
import { useActiveFaults } from "@/hooks/useFleet";
import { cn } from "@/lib/cn";
import { FAULT_LABEL } from "@/lib/labels";
import { sendSimCommand, type SimCommand } from "@/lib/sim";
import { FAULT_TYPES, type FaultType } from "@/lib/types";

interface SimulationControlsProps {
  deviceId: string;
  deviceName: string;
  compact?: boolean;
  /** Controlled intensity (simulator page shares one slider); otherwise a local slider is shown. */
  intensity?: number;
}

/**
 * Fault pills for one device. Active faults come from the live fault map, so a pill
 * fills once the simulator has actually applied the command (~1 s).
 */
export function SimulationControls({
  deviceId,
  deviceName,
  compact = false,
  intensity: controlledIntensity,
}: SimulationControlsProps) {
  const user = useSession();
  const pathname = usePathname();
  const active = useActiveFaults(deviceId);
  const [localIntensity, setLocalIntensity] = useState(1);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const intensity = controlledIntensity ?? localIntensity;
  const disabled = !user || pending !== null;

  async function run(key: string, command: SimCommand, success: string) {
    setPending(key);
    setMessage("");
    const result = await sendSimCommand(command);
    setPending(null);
    setMessage(result.ok ? success : (result.message ?? "Komut gönderilemedi."));
  }

  function toggle(fault: FaultType) {
    if (active.includes(fault)) {
      void run(fault, { action: "clear", device_id: deviceId, type: fault }, `${FAULT_LABEL[fault]} durduruldu.`);
    } else {
      void run(
        fault,
        { action: "inject", device_id: deviceId, type: fault, intensity },
        `${FAULT_LABEL[fault]} başlatıldı.`,
      );
    }
  }

  const text = compact ? "text-[13px]" : "text-[14px]";

  return (
    <div className="min-w-0">
      <div role="group" aria-label={`${deviceName} arıza komutları`} className="flex flex-wrap gap-2">
        {FAULT_TYPES.map((fault) => {
          const on = active.includes(fault);
          return (
            <button
              key={fault}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => toggle(fault)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3.5 font-medium transition-colors duration-200 ease-apple disabled:cursor-not-allowed",
                text,
                on
                  ? "bg-crit-strong text-white hover:bg-crit-strong/90"
                  : "bg-hairline/[0.06] text-ink hover:bg-hairline/10 disabled:text-ink/50",
                pending === fault && "motion-safe:animate-pulse",
              )}
            >
              {on ? <span aria-hidden="true" className="size-1.5 rounded-full bg-white" /> : null}
              {FAULT_LABEL[fault]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() =>
            void run("clear", { action: "clear", device_id: deviceId }, "Normale döndürülüyor; skor yavaşça toparlanacak.")
          }
          disabled={disabled || active.length === 0}
          className={cn(
            "inline-flex min-h-9 items-center rounded-pill px-3.5 font-medium text-accent transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-40",
            text,
          )}
        >
          Normale Döndür
        </button>
      </div>

      {controlledIntensity === undefined ? (
        <IntensitySlider value={localIntensity} onChange={setLocalIntensity} disabled={!user} className="mt-5" />
      ) : null}

      <p aria-live="polite" className="mt-3 min-h-5 text-[13px] text-ink-secondary">
        {!user ? (
          <>
            Komut göndermek için{" "}
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="text-accent underline underline-offset-2">
              giriş yap
            </Link>
            .
          </>
        ) : (
          message
        )}
      </p>
    </div>
  );
}
