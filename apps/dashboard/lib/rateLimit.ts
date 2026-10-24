/**
 * Simple sliding-window rate limit kept in memory. On Vercel each warm function
 * instance has its own window, so this is a guard against button mashing, not a
 * hard global quota.
 */
const windows = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterS: number;
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const recent = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    windows.set(key, recent);
    const oldest = recent[0] ?? now;
    return { ok: false, retryAfterS: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
  }
  recent.push(now);
  windows.set(key, recent);
  return { ok: true, retryAfterS: 0 };
}
