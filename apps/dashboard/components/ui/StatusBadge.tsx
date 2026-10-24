import { cn } from "@/lib/cn";
import { STATUS_LABEL } from "@/lib/labels";
import type { Status } from "@/lib/types";

const DOT: Record<Status, string> = {
  normal: "bg-ok",
  warning: "bg-warn-strong",
  critical: "bg-crit",
};

const TINT: Record<Status, string> = {
  normal: "bg-ok/15",
  warning: "bg-warn/25",
  critical: "bg-crit/15",
};

interface StatusDotProps {
  status: Status;
  className?: string;
}

/** Decorative dot; always pair it with a text label. */
export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        DOT[status],
        status === "critical" && "motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

/** Dot + label: color never carries meaning on its own. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[13px] font-semibold leading-none text-ink",
        TINT[status],
        className,
      )}
    >
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}
