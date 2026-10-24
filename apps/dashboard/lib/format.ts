/**
 * Formatting helpers. Everything uses a fixed locale and time zone so server and
 * browser render identical strings (no hydration mismatch).
 */
import { METRIC_DECIMALS, METRIC_UNIT } from "./labels";
import type { Metric } from "./types";

const LOCALE = "tr-TR";
const TIME_ZONE = "Europe/Istanbul";

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatMetric(metric: Metric, value: number): string {
  return `${formatNumber(value, METRIC_DECIMALS[metric])} ${METRIC_UNIT[metric]}`;
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${formatNumber(value, value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

/** "~6 dk içinde kritik" */
export function formatEta(minutes: number): string {
  if (minutes < 1) return "1 dk içinde kritik";
  if (minutes >= 120) return `~${formatNumber(minutes / 60, 0)} sa içinde kritik`;
  return `~${Math.round(minutes)} dk içinde kritik`;
}

export function formatClock(ts: number): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: TIME_ZONE,
  }).format(ts);
}

export function formatAxisTime(ts: number, withDay: boolean): string {
  return new Intl.DateTimeFormat(LOCALE, {
    ...(withDay ? { day: "2-digit", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(ts);
}

/** "3 dk önce", relative to an explicit `now` so renders are deterministic. */
export function formatAgo(ts: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - ts) / 1000));
  if (seconds < 60) return `${seconds} sn önce`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.round(hours / 24)} gün önce`;
}
