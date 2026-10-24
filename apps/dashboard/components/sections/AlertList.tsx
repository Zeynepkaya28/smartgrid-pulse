"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SegmentedControl, type SegmentOption } from "@/components/ui/SegmentedControl";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAgo, formatClock } from "@/lib/format";
import type { Alert } from "@/lib/types";

type Filter = "all" | "critical" | "warning";

const FILTERS: SegmentOption<Filter>[] = [
  { value: "all", label: "Tümü" },
  { value: "critical", label: "Kritik" },
  { value: "warning", label: "Uyarı" },
];

interface AlertListProps {
  alerts: Alert[];
  now: number;
}

/** Plain alert list with a severity filter and an acknowledge action. */
export function AlertList({ alerts, now }: AlertListProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [acknowledged, setAcknowledged] = useState<Set<number>>(
    () => new Set(alerts.filter((a) => a.acknowledged).map((a) => a.id)),
  );

  const visible = useMemo(
    () => alerts.filter((a) => filter === "all" || a.severity === filter),
    [alerts, filter],
  );
  const openCount = alerts.filter((a) => !acknowledged.has(a.id)).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[17px] text-ink-secondary" aria-live="polite">
          {openCount === 0 ? "Onay bekleyen alarm yok." : `${openCount} alarm onay bekliyor.`}
        </p>
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} label="Önem derecesi" />
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-lead text-ink-secondary">Bu filtrede alarm yok.</p>
      ) : (
        <ul className="divide-y divide-hairline/10 border-y border-hairline/10">
          {visible.map((alert) => {
            const done = acknowledged.has(alert.id);
            return (
              <li
                key={alert.id}
                className="grid gap-3 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-6"
              >
                <StatusBadge status={alert.severity} className="w-fit" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">
                    <Link href={`/devices/${alert.device_id}`} className="hover:underline">
                      {alert.device_name}
                    </Link>
                    <span className="font-normal text-ink-secondary">
                      {" · "}
                      <time dateTime={new Date(alert.ts).toISOString()} title={formatClock(alert.ts)}>
                        {formatAgo(alert.ts, now)}
                      </time>
                    </span>
                  </p>
                  <p className="mt-1 break-words text-[15px] leading-snug">{alert.message}</p>
                </div>
                {done ? (
                  <p className="text-[14px] font-medium text-ink-secondary sm:text-right">Onaylandı</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAcknowledged((prev) => new Set(prev).add(alert.id))}
                    className="inline-flex min-h-9 w-fit items-center rounded-pill bg-hairline/[0.06] px-4 text-[14px] font-medium text-ink transition-colors duration-200 hover:bg-hairline/10 sm:justify-self-end"
                  >
                    Onayla
                    <span className="sr-only">: {alert.device_name}, {alert.message}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
