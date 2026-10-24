"use client";

import { useNow } from "@/hooks/useNow";
import { formatAgo, formatClock } from "@/lib/format";

/** "3 dk önce" after mount; the absolute clock time before (stable for SSR). */
export function RelativeTime({ ts }: { ts: number }) {
  const now = useNow();
  return (
    <time dateTime={new Date(ts).toISOString()} title={formatClock(ts)}>
      {now === null ? formatClock(ts) : formatAgo(ts, now)}
    </time>
  );
}
