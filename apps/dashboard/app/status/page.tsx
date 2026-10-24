import type { Metadata } from "next";
import { z } from "zod";

import { StatusLive } from "@/components/sections/StatusLive";
import { BentoCard } from "@/components/ui/BentoCard";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { StatusDot } from "@/components/ui/StatusBadge";
import { getFleetStats } from "@/lib/data";
import { formatBytes, formatCompact, formatNumber } from "@/lib/format";
import { createSupabaseServer } from "@/lib/supabase/server";

// Hidden operations page: not linked from the nav and not indexed.
export const metadata: Metadata = { title: "Durum", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const Ts = z.string().nullable().transform((v) => (v ? Date.parse(v) : null));

const SystemStatusSchema = z.object({
  last_telemetry_at: Ts,
  last_rollup_at: Ts,
  last_health_at: Ts,
  devices_total: z.number(),
  devices_seen_1m: z.number(),
  partitions: z.array(
    z.object({
      parent: z.string(),
      retention: z.string().nullable(),
      premake: z.number(),
      count: z.number(),
      oldest: z.string().nullable(),
      newest: z.string().nullable(),
    }),
  ),
  cron: z.array(
    z.object({
      jobname: z.string(),
      schedule: z.string(),
      active: z.boolean(),
      last_status: z.string().nullable(),
      last_run: Ts,
    }),
  ),
});

function Freshness({ label, ts }: { label: string; ts: number | null }) {
  return (
    <div>
      <dt className="text-[13px] font-medium text-ink-secondary">{label}</dt>
      <dd className="mt-1 text-[22px] font-semibold">{ts === null ? "Veri yok" : <RelativeTime ts={ts} />}</dd>
    </div>
  );
}

export default async function StatusPage() {
  const supabase = await createSupabaseServer();
  const [statusResult, stats] = await Promise.all([supabase.rpc("get_system_status"), getFleetStats()]);
  const parsed = SystemStatusSchema.safeParse(statusResult.data);

  return (
    <div className="mx-auto w-full max-w-content px-4 pb-24 pt-16 sm:px-6 md:pt-20">
      <header className="mb-12">
        <p className="eyebrow">Durum</p>
        <h1 className="mt-2 text-hero">Sistem.</h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-secondary">
          Veri tazeliği, Realtime bağlantısı, tablo boyutları ve bölümler. Bu sayfa menüde yer almaz.
        </p>
      </header>

      {!parsed.success ? (
        <p role="alert" className="text-lead text-ink-secondary">
          Sistem durumu alınamadı.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <BentoCard as="section" aria-labelledby="fresh-title">
            <h2 id="fresh-title" className="text-[22px] font-semibold tracking-tight">
              Tazelik
            </h2>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
              <StatusLive />
              <Freshness label="Son ham telemetri" ts={parsed.data.last_telemetry_at} />
              <Freshness label="Son dakika özeti" ts={parsed.data.last_rollup_at} />
              <Freshness label="Son sağlık kaydı" ts={parsed.data.last_health_at} />
              <div>
                <dt className="text-[13px] font-medium text-ink-secondary">Son 1 dk görülen cihaz</dt>
                <dd className="mt-1 text-[22px] font-semibold tabular-nums">
                  {parsed.data.devices_seen_1m} / {parsed.data.devices_total}
                </dd>
              </div>
            </dl>
          </BentoCard>

          <BentoCard as="section" aria-labelledby="size-title">
            <h2 id="size-title" className="text-[22px] font-semibold tracking-tight">
              Tablo boyutları
            </h2>
            {stats ? (
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
                {[
                  ["telemetry (ham)", stats.telemetry_bytes, `~${formatCompact(stats.telemetry_rows_estimate)} satır`],
                  ["telemetry_1m", stats.telemetry_1m_bytes, null],
                  ["device_health", stats.device_health_bytes, null],
                  ["alerts", stats.alerts_bytes, null],
                ].map(([name, bytes, hint]) => (
                  <div key={String(name)}>
                    <dt className="font-mono text-[13px] text-ink-secondary">{name}</dt>
                    <dd className="mt-1 text-[22px] font-semibold tabular-nums">{formatBytes(Number(bytes))}</dd>
                    {hint ? <dd className="text-[13px] text-ink-secondary">{hint}</dd> : null}
                  </div>
                ))}
                <div>
                  <dt className="text-[13px] font-medium text-ink-secondary">Mesaj/sn (son 1 dk)</dt>
                  <dd className="mt-1 text-[22px] font-semibold tabular-nums">
                    {formatNumber(stats.messages_per_second, 1)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-5 text-ink-secondary">İstatistik alınamadı.</p>
            )}
          </BentoCard>

          <BentoCard as="section" aria-labelledby="parts-title">
            <h2 id="parts-title" className="text-[22px] font-semibold tracking-tight">
              Bölümler (pg_partman)
            </h2>
            <ul className="mt-5 divide-y divide-hairline/10">
              {parsed.data.partitions.map((p) => (
                <li key={p.parent} className="py-3">
                  <p className="font-mono text-[14px]">{p.parent}</p>
                  <p className="mt-1 text-[15px]">
                    <span className="font-semibold tabular-nums">{p.count}</span> bölüm · saklama {p.retention ?? "—"} ·
                    önceden {p.premake} gün
                  </p>
                  <p className="text-[13px] text-ink-secondary">
                    {p.oldest} → {p.newest}
                  </p>
                </li>
              ))}
            </ul>
          </BentoCard>

          <BentoCard as="section" aria-labelledby="cron-title">
            <h2 id="cron-title" className="text-[22px] font-semibold tracking-tight">
              Zamanlanmış işler (pg_cron)
            </h2>
            <ul className="mt-5 divide-y divide-hairline/10">
              {parsed.data.cron.map((job) => {
                const ok = job.last_status === "succeeded";
                return (
                  <li key={job.jobname} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[14px]">{job.jobname}</p>
                      <p className="text-[13px] text-ink-secondary">{job.schedule}</p>
                    </div>
                    <p className="flex shrink-0 items-center gap-1.5 text-[14px]">
                      <StatusDot status={job.last_status === null ? "normal" : ok ? "normal" : "critical"} />
                      {job.last_status === null ? "Henüz çalışmadı" : ok ? "Başarılı" : "Hata"}
                      {job.last_run !== null ? (
                        <span className="text-ink-secondary">
                          {" · "}
                          <RelativeTime ts={job.last_run} />
                        </span>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          </BentoCard>
        </div>
      )}
    </div>
  );
}
