import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface HeroProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: ReactNode;
  actions?: ReactNode;
  visual?: ReactNode;
  className?: string;
}

/**
 * Apple product-page hero: centered eyebrow, huge headline, gray subtitle and pill
 * actions, with one large visual underneath.
 */
export function Hero({ eyebrow, title, subtitle, actions, visual, className }: HeroProps) {
  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-content flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 md:pb-24 md:pt-24",
        className,
      )}
    >
      <div className="fade-up">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-balance text-hero">{title}</h1>
        <p className="mx-auto mt-6 max-w-[38ch] text-balance text-lead text-ink-secondary">{subtitle}</p>
        {actions ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">{actions}</div>
        ) : null}
      </div>
      {visual ? (
        <div className="fade-up mt-14 grid place-items-center [animation-delay:120ms] md:mt-20">{visual}</div>
      ) : null}
    </section>
  );
}
