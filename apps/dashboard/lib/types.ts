/**
 * Shared data contracts. They mirror the worker's Realtime payloads
 * (services/worker/src/worker/monitor.py · DeviceState.to_payload) and the
 * Supabase RPCs, so Phase 5 can validate live data with the same schemas.
 */
import { z } from "zod";

export const METRICS = ["temperature", "vibration", "pressure", "current"] as const;
export const MetricSchema = z.enum(METRICS);
export type Metric = z.infer<typeof MetricSchema>;

export const StatusSchema = z.enum(["normal", "warning", "critical"]);
export type Status = z.infer<typeof StatusSchema>;

export const DeviceTypeSchema = z.enum(["motor", "wind_turbine", "pump", "transformer"]);
export type DeviceType = z.infer<typeof DeviceTypeSchema>;

function perMetric<T extends z.ZodType>(schema: T) {
  return z.object({
    temperature: schema,
    vibration: schema,
    pressure: schema,
    current: schema,
  });
}

export const LimitSchema = z.object({
  warning: z.number(),
  critical: z.number(),
  direction: z.enum(["high", "low"]),
});
export type Limit = z.infer<typeof LimitSchema>;

export const DeviceStateSchema = z.object({
  device_id: z.string(),
  name: z.string(),
  type: DeviceTypeSchema,
  site: z.string(),
  ts: z.number().int(),
  values: perMetric(z.number()),
  z: perMetric(z.number()),
  zones: perMetric(StatusSchema),
  health: z.number().min(0).max(100),
  status: StatusSchema,
  iforest: z.number().min(0).max(1),
  max_abs_z: z.number(),
  eta_minutes: z.number().nullable(),
  eta_metric: MetricSchema.nullable(),
  cause_metric: MetricSchema.nullable(),
  model_ready: z.boolean(),
  limits: perMetric(LimitSchema),
});
export type DeviceState = z.infer<typeof DeviceStateSchema>;

export const FAULT_TYPES = ["overheat", "vibration", "pressure_leak", "current_surge"] as const;
export const FaultTypeSchema = z.enum(FAULT_TYPES);
export type FaultType = z.infer<typeof FaultTypeSchema>;

/** Active simulator faults per device, relayed by the worker from smartgrid/sim/faults. */
export const FaultMapSchema = z.record(
  z.string(),
  z.partialRecord(FaultTypeSchema, z.object({ intensity: z.number(), since: z.number() })),
);
export type FaultMap = z.infer<typeof FaultMapSchema>;

/** Realtime "state" event on the fleet channel (1 Hz). */
export const FleetStateSchema = z.object({
  ts: z.number().int(),
  devices: z.array(DeviceStateSchema),
  faults: FaultMapSchema.default({}),
});
export type FleetState = z.infer<typeof FleetStateSchema>;

/** Realtime "faults" event, sent when the fault map changes. */
export const FaultsEventSchema = z.object({ faults: FaultMapSchema });

export const AlertSchema = z.object({
  id: z.number().int(),
  ts: z.number().int(),
  device_id: z.string(),
  device_name: z.string(),
  severity: z.enum(["warning", "critical"]),
  metric: MetricSchema,
  value: z.number(),
  zscore: z.number().nullable(),
  message: z.string(),
  acknowledged: z.boolean(),
});
export type Alert = z.infer<typeof AlertSchema>;

/** Realtime "alert" event from the worker (not acknowledged yet; id set once stored). */
export const AlertEventSchema = AlertSchema.omit({ id: true, acknowledged: true }).extend({
  id: z.number().int().optional(),
});

export const RANGES = ["15m", "1h", "6h", "24h", "7d"] as const;
export const RangeSchema = z.enum(RANGES);
export type Range = z.infer<typeof RangeSchema>;

/** One row of the get_device_history RPC. */
export const HistoryPointSchema = z.object({
  bucket: z.number().int(), // epoch ms
  temperature_avg: z.number().nullable(),
  temperature_max: z.number().nullable(),
  vibration_avg: z.number().nullable(),
  vibration_max: z.number().nullable(),
  pressure_avg: z.number().nullable(),
  pressure_min: z.number().nullable(),
  current_avg: z.number().nullable(),
  current_max: z.number().nullable(),
  samples: z.number().int(),
});
export type HistoryPoint = z.infer<typeof HistoryPointSchema>;

/** get_fleet_stats RPC. */
export const FleetStatsSchema = z.object({
  device_count: z.number().int(),
  messages_per_second: z.number(),
  open_alerts: z.number().int(),
  telemetry_rows_estimate: z.number().int(),
  telemetry_bytes: z.number().int(),
  telemetry_1m_bytes: z.number().int(),
  device_health_bytes: z.number().int(),
  alerts_bytes: z.number().int(),
});
export type FleetStats = z.infer<typeof FleetStatsSchema>;

/** Health score per 5-minute bucket (get_health_history RPC). */
export const HealthPointSchema = z.object({
  bucket: z.number().int(),
  health_avg: z.number().nullable(),
  health_min: z.number().nullable(),
  worst_status: StatusSchema,
});
export type HealthPoint = z.infer<typeof HealthPointSchema>;
