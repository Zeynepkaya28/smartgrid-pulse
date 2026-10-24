import { cn } from "@/lib/cn";
import { TYPE_LABEL } from "@/lib/labels";
import type { DeviceType } from "@/lib/types";

interface DeviceTypeIconProps {
  type: DeviceType;
  className?: string;
}

/** Simple line icons, SF Symbols style. */
export function DeviceTypeIcon({ type, className }: DeviceTypeIconProps) {
  return (
    <span
      className={cn(
        "inline-grid size-9 shrink-0 place-items-center rounded-xl bg-hairline/[0.06] text-ink",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={TYPE_LABEL[type]}
      >
        {type === "motor" ? (
          <>
            <rect x="3" y="7" width="14" height="10" rx="2" />
            <path d="M17 10h2.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5H17" />
            <path d="M7 7V5M11 7V5M7 19v-2M11 19v-2" />
          </>
        ) : null}
        {type === "wind_turbine" ? (
          <>
            <circle cx="12" cy="9" r="1.4" />
            <path d="M12 7.6V2.5M13.2 9.7l4.4 2.6M10.8 9.7l-4.4 2.6" />
            <path d="M12 10.4V21.5M9 21.5h6" />
          </>
        ) : null}
        {type === "pump" ? (
          <>
            <circle cx="10" cy="12" r="5" />
            <path d="M10 9.5v5M7.5 12h5" />
            <path d="M15 12h6M3 20h14M10 17v3" />
          </>
        ) : null}
        {type === "transformer" ? (
          <>
            <path d="M13 2.5 6 13h5l-1 8.5L18 10h-5z" />
          </>
        ) : null}
      </svg>
    </span>
  );
}
