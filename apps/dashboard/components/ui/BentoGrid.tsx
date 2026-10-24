import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface BentoGridProps {
  children: ReactNode;
  /** Columns at the widest breakpoint (1 on phones, 2 on tablets). */
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLUMNS: Record<NonNullable<BentoGridProps["columns"]>, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

export function BentoGrid({ children, columns = 4, className }: BentoGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:gap-5", COLUMNS[columns], className)}>
      {children}
    </div>
  );
}
