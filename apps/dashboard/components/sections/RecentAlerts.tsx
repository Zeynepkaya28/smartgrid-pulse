"use client";

import Link from "next/link";

import { RelativeTime } from "@/components/ui/RelativeTime";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFleetStore } from "@/lib/store/fleet";

/** Latest open alerts, compact, live. */
export function RecentAlerts({ limit = 3 }: { limit?: number }) {
  const alerts = useFleetStore((s) => s.alerts);
  const items = alerts.filter((a) => !a.acknowledged).slice(0, limit);
  if (items.length === 0) {
    return <p className="text-lead text-ink-secondary">Açık alarm yok. Her şey yolunda.</p>;
  }
  return (
    <ul className="divide-y divide-hairline/10 border-y border-hairline/10">
      {items.map((alert) => (
        <li key={alert.id} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-start sm:gap-6">
          <StatusBadge status={alert.severity} className="w-fit shrink-0" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">
              <Link href={`/devices/${alert.device_id}`} className="hover:underline">
                {alert.device_name}
              </Link>
              <span className="font-normal text-ink-secondary">
                {" · "}
                <RelativeTime ts={alert.ts} />
              </span>
            </p>
            <p className="mt-1 break-words text-[15px] leading-snug text-ink">{alert.message}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
