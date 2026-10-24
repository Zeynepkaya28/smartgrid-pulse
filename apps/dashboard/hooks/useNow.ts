"use client";

import { useEffect, useState } from "react";

/**
 * Current time, ticking every `intervalMs`. Returns null during SSR and the first
 * client render so relative times never cause a hydration mismatch.
 */
export function useNow(intervalMs = 15_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
