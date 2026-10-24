/**
 * Operating limits per device type. Mirrors services/worker/src/worker/config/limits.toml;
 * used only for the first server render, after which the worker's Realtime payload
 * (which carries its own limits) takes over.
 */
import type { DeviceType, Limit, Metric, Status } from "./types";

const NOMINAL: Record<DeviceType, { pressure: number; current: number }> = {
  motor: { pressure: 3.2, current: 48 },
  wind_turbine: { pressure: 2.6, current: 310 },
  pump: { pressure: 6.4, current: 36 },
  transformer: { pressure: 0.35, current: 520 },
};

const TEMPERATURE: Record<DeviceType, [number, number]> = {
  motor: [80, 95],
  wind_turbine: [75, 90],
  pump: [70, 85],
  transformer: [85, 105],
};

export function limitsFor(type: DeviceType): Record<Metric, Limit> {
  const n = NOMINAL[type];
  const [tw, tc] = TEMPERATURE[type];
  const [vw, vc] = type === "transformer" ? [2.0, 3.5] : [4.5, 7.1];
  return {
    temperature: { warning: tw, critical: tc, direction: "high" },
    vibration: { warning: vw, critical: vc, direction: "high" },
    pressure: { warning: n.pressure * 0.78, critical: n.pressure * 0.6, direction: "low" },
    current: { warning: n.current * 1.15, critical: n.current * 1.35, direction: "high" },
  };
}

export function zoneOf(limit: Limit, value: number): Status {
  if (limit.direction === "high") {
    if (value >= limit.critical) return "critical";
    return value >= limit.warning ? "warning" : "normal";
  }
  if (value <= limit.critical) return "critical";
  return value <= limit.warning ? "warning" : "normal";
}
