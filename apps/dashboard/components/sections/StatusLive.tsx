"use client";

import { useConnectionStatus } from "@/hooks/useFleet";
import { useNow } from "@/hooks/useNow";
import { useFleetStore } from "@/lib/store/fleet";

const LABEL = { live: "Canlı", connecting: "Bağlanıyor", reconnecting: "Yeniden bağlanıyor" } as const;

/** Realtime channel state and the age of the last "state" event, ticking every second. */
export function StatusLive() {
  const status = useConnectionStatus();
  const lastStateAt = useFleetStore((s) => s.lastStateAt);
  const now = useNow(1_000);
  const age = now !== null && lastStateAt > 0 ? Math.max(0, (now - lastStateAt) / 1000) : null;
  return (
    <>
      <div>
        <dt className="text-[13px] font-medium text-ink-secondary">Realtime kanalı</dt>
        <dd className="mt-1 text-[22px] font-semibold">{LABEL[status]}</dd>
      </div>
      <div>
        <dt className="text-[13px] font-medium text-ink-secondary">Son state olayı</dt>
        <dd className="mt-1 text-[22px] font-semibold tabular-nums">
          {age === null ? "—" : `${age.toFixed(age < 10 ? 1 : 0)} sn önce`}
        </dd>
      </div>
    </>
  );
}
