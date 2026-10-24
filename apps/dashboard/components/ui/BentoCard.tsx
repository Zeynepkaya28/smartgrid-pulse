import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface BentoCardProps {
  children: ReactNode;
  /** "wide" spans two columns from tablet up; "large" spans two columns and two rows. */
  span?: "single" | "wide" | "large";
  as?: ElementType;
  className?: string;
  interactive?: boolean;
  "aria-labelledby"?: string;
}

const SPAN = {
  single: "",
  wide: "md:col-span-2",
  large: "md:col-span-2 md:row-span-2",
} as const;

/** Glass card with a hairline border, 22–28px radius and no heavy shadow. */
export function BentoCard({
  children,
  span = "single",
  as: Tag = "div",
  className,
  interactive = false,
  "aria-labelledby": labelledBy,
}: BentoCardProps) {
  return (
    <Tag
      aria-labelledby={labelledBy}
      className={cn(
        "glass-card relative min-w-0 overflow-hidden rounded-card border border-hairline/10 p-5 sm:p-6",
        span !== "single" && "md:rounded-card-lg",
        interactive &&
          "transition-transform duration-300 ease-apple motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01]",
        SPAN[span],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
