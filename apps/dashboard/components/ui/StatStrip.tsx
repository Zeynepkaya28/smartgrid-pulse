import { cn } from "@/lib/cn";

export interface Stat {
  label: string;
  value: string;
  hint?: string;
}

interface StatStripProps {
  stats: Stat[];
  className?: string;
}

/** Row of headline numbers (Cihaz, Mesaj/sn, Aktif alarm, Veri boyutu). */
export function StatStrip({ stats, className }: StatStripProps) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4",
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="min-w-0 border-t border-hairline/10 pt-4">
          <dt className="text-[14px] font-medium text-ink-secondary">{s.label}</dt>
          <dd className="mt-1 text-[clamp(32px,4.5vw,48px)] font-semibold leading-none tracking-tight tabular-nums">
            {s.value}
          </dd>
          {s.hint ? <dd className="mt-2 text-[14px] text-ink-secondary">{s.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
