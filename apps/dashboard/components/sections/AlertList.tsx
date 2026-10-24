"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useSession } from "@/components/providers/SessionProvider";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { SegmentedControl, type SegmentOption } from "@/components/ui/SegmentedControl";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFleetStore } from "@/lib/store/fleet";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Filter = "all" | "critical" | "warning";

const FILTERS: SegmentOption<Filter>[] = [
  { value: "all", label: "Tümü" },
  { value: "critical", label: "Kritik" },
  { value: "warning", label: "Uyarı" },
];

/** Live alert list with a severity filter; signed-in users can acknowledge. */
export function AlertList() {
  const user = useSession();
  const alerts = useFleetStore((s) => s.alerts);
  const markAcknowledged = useFleetStore((s) => s.markAcknowledged);
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState("");

  const visible = useMemo(
    () => alerts.filter((a) => filter === "all" || a.severity === filter),
    [alerts, filter],
  );
  const openCount = alerts.filter((a) => !a.acknowledged).length;

  async function acknowledge(id: number) {
    if (!user) return;
    setPending(id);
    setError("");
    // RLS: authenticated users may update only acknowledged/acknowledged_by, and only as themselves.
    const { error: dbError } = await getBrowserSupabase()
      .from("alerts")
      .update({ acknowledged: true, acknowledged_by: user.id })
      .eq("id", id);
    setPending(null);
    if (dbError) setError("Alarm onaylanamadı. Tekrar dene.");
    else markAcknowledged(id);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[17px] text-ink-secondary" aria-live="polite">
          {error || (openCount === 0 ? "Onay bekleyen alarm yok." : `${openCount} alarm onay bekliyor.`)}
        </p>
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} label="Önem derecesi" />
      </div>

      {!user ? (
        <p className="mb-6 text-[15px] text-ink-secondary">
          Alarmları onaylamak için{" "}
          <Link href="/login?next=/alerts" className="text-accent underline underline-offset-2">
            giriş yap
          </Link>
          .
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="py-16 text-center text-lead text-ink-secondary">Bu filtrede alarm yok.</p>
      ) : (
        <ul className="divide-y divide-hairline/10 border-y border-hairline/10">
          {visible.map((alert) => (
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
                    <RelativeTime ts={alert.ts} />
                  </span>
                </p>
                <p className="mt-1 break-words text-[15px] leading-snug">{alert.message}</p>
              </div>
              {alert.acknowledged ? (
                <p className="text-[14px] font-medium text-ink-secondary sm:text-right">Onaylandı</p>
              ) : user && alert.id > 0 ? (
                <button
                  type="button"
                  disabled={pending === alert.id}
                  onClick={() => void acknowledge(alert.id)}
                  className="inline-flex min-h-9 w-fit items-center rounded-pill bg-hairline/[0.06] px-4 text-[14px] font-medium text-ink transition-colors duration-200 hover:bg-hairline/10 disabled:opacity-60 sm:justify-self-end"
                >
                  {pending === alert.id ? "Onaylanıyor…" : "Onayla"}
                  <span className="sr-only">: {alert.device_name}, {alert.message}</span>
                </button>
              ) : (
                <span aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
