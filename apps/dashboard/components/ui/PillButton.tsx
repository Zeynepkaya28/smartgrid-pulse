import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "tinted";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent-fill text-white hover:bg-accent-fill/90 active:bg-accent-fill/80",
  secondary: "bg-transparent text-accent hover:underline underline-offset-4",
  tinted: "bg-hairline/[0.06] text-ink hover:bg-hairline/10 active:bg-hairline/15",
};

const SIZE: Record<Size, string> = {
  sm: "min-h-8 px-3.5 text-[14px]",
  md: "min-h-10 px-5 text-[15px]",
  lg: "min-h-12 px-6 text-[17px]",
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type LinkProps = BaseProps & { href: string };
type ButtonProps = BaseProps & { href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className" | "children"
  >;

/**
 * Apple-style pill (border-radius 980px). `secondary` is a text link with a "›" chevron.
 * Renders a Next link when `href` is given, otherwise a button.
 */
export function PillButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: LinkProps | ButtonProps) {
  const classes = cn(
    "inline-flex select-none items-center justify-center gap-1 rounded-pill font-medium",
    "transition-colors duration-200 ease-apple disabled:cursor-not-allowed disabled:opacity-40",
    variant !== "secondary" && SIZE[size],
    variant === "secondary" && "min-h-10 px-1 text-[17px]",
    VARIANT[variant],
    className,
  );
  const content = (
    <>
      {children}
      {variant === "secondary" ? (
        <span aria-hidden="true" className="text-[1.15em] leading-none">
          ›
        </span>
      ) : null}
    </>
  );

  if (rest.href !== undefined) {
    return (
      <Link href={rest.href} className={classes}>
        {content}
      </Link>
    );
  }
  const { href: _href, type, ...buttonProps } = rest;
  return (
    <button type={type ?? "button"} className={classes} {...buttonProps}>
      {content}
    </button>
  );
}
