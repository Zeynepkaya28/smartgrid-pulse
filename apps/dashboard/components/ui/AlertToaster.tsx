"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useFleetStore, type Toast } from "@/lib/store/fleet";

import { StatusBadge } from "./StatusBadge";

const TOAST_MS = 8_000;

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useFleetStore((s) => s.dismissToast);
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(toast.key), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [dismiss, toast.key]);

  const { alert } = toast;
  return (
    <li className="glass-card fade-up pointer-events-auto w-full rounded-card border border-hairline/10 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={alert.severity} />
        <button
          type="button"
          onClick={() => dismiss(toast.key)}
          className="-mr-1 -mt-1 grid size-8 place-items-center rounded-full text-ink-secondary hover:bg-hairline/10"
          aria-label="Bildirimi kapat"
        >
          <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className="mt-2 text-[15px] font-semibold">
        <Link href={`/devices/${alert.device_id}`} className="hover:underline">
          {alert.device_name}
        </Link>
      </p>
      <p className="mt-1 text-[14px] leading-snug">{alert.message}</p>
    </li>
  );
}

/** Frosted-glass alert toasts in the top-right corner, announced politely. */
export function AlertToaster() {
  const toasts = useFleetStore((s) => s.toasts);
  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Alarm bildirimleri"
      className="pointer-events-none fixed right-4 top-16 z-[55] w-[min(360px,calc(100vw-32px))]"
    >
      <ul className="flex flex-col gap-3">
        {toasts.map((t) => (
          <ToastCard key={t.key} toast={t} />
        ))}
      </ul>
    </div>
  );
}
