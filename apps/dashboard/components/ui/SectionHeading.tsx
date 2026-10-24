import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({ id, eyebrow, title, lead, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 id={id} className="mt-2 text-balance text-section">
          {title}
        </h2>
        {lead ? <p className="mt-4 text-balance text-lead text-ink-secondary">{lead}</p> : null}
      </div>
      {action}
    </div>
  );
}
