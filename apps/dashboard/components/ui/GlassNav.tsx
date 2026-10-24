"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Genel Bakış" },
  { href: "/devices", label: "Cihazlar" },
  { href: "/alerts", label: "Alarmlar" },
  { href: "/simulator", label: "Simülasyon" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Sticky frosted-glass navigation, 48px tall; collapses to a simple menu on phones. */
export function GlassNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="glass-nav sticky top-0 z-50 border-b border-hairline/10">
      <nav aria-label="Ana menü" className="mx-auto flex h-12 max-w-content items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden="true">
            <path
              d="M1 10h4l2-5 3 10 2.5-7 1.5 2H19"
              fill="none"
              stroke="rgb(var(--accent))"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          SmartGrid Pulse
        </Link>

        <ul className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "text-[13px] transition-colors duration-200",
                    active ? "font-semibold text-ink" : "text-ink/80 hover:text-ink",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="-mr-2 grid size-11 place-items-center rounded-full md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
          onClick={() => setOpen((o) => !o)}
        >
          <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden="true">
            <path
              d={open ? "M4 4l12 12M16 4L4 16" : "M3 7h14M3 13h14"}
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </svg>
        </button>
      </nav>

      <div
        id={menuId}
        hidden={!open}
        className="glass-nav border-t border-hairline/10 md:hidden"
      >
        <ul className="mx-auto max-w-content px-4 pb-4 pt-2">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block border-b border-hairline/10 py-3 text-[24px] font-semibold tracking-tight",
                    active ? "text-ink" : "text-ink/85",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
