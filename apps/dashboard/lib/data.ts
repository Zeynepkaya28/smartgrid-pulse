/**
 * Server-side reads for the first paint. Everything goes through the anon key and RLS;
 * the browser then keeps the data fresh over Realtime.
 */
import "server-only";

import { limitsFor, zoneOf } from "./limits";
import { createSupabaseServer } from "./supabase/server";
import {
  DeviceTypeSchema,
  FleetStatsSchema,
  METRICS,
  MetricSchema,
  StatusSchema,
  type Alert,
  type DeviceState,
  type FleetStats,
  type Metric,
  type Status,
} from "./types";

const ROLLUP_LOOKBACK_MS = 10 * 60_000;

/** Latest known state per device: health from device_latest, values from the 1-min rollup. */
export async function getInitialFleet(): Promise<DeviceState[]> {
  const supabase = await createSupabaseServer();
  const since = new Date(Date.now() - ROLLUP_LOOKBACK_MS).toISOString();
  const [latest, rollup] = await Promise.all([
    supabase.from("device_latest").select("*").order("device_id"),
    supabase
      .from("telemetry_1m")
      .select("device_id,bucket,temperature_avg,vibration_avg,pressure_avg,current_avg")
      .gte("bucket", since)
      .order("bucket", { ascending: false })
      .limit(500),
  ]);
  if (latest.error) throw new Error(`device_latest: ${latest.error.message}`);

  const lastValues = new Map<string, { ts: number; values: Record<Metric, number> }>();
  for (const row of rollup.data ?? []) {
    if (lastValues.has(row.device_id)) continue; // rows are newest first
    if (
      row.temperature_avg === null ||
      row.vibration_avg === null ||
      row.pressure_avg === null ||
      row.current_avg === null
    ) {
      continue;
    }
    lastValues.set(row.device_id, {
      ts: Date.parse(row.bucket),
      values: {
        temperature: row.temperature_avg,
        vibration: row.vibration_avg,
        pressure: row.pressure_avg,
        current: row.current_avg,
      },
    });
  }

  return (latest.data ?? []).flatMap((row): DeviceState[] => {
    const type = DeviceTypeSchema.safeParse(row.type);
    if (!type.success) return [];
    const limits = limitsFor(type.data);
    const last = lastValues.get(row.device_id);
    const values = last?.values ?? { temperature: 0, vibration: 0, pressure: 0, current: 0 };
    const zones = Object.fromEntries(
      METRICS.map((m) => [m, last ? zoneOf(limits[m], values[m]) : "normal"]),
    ) as Record<Metric, Status>;
    const etaMetric = MetricSchema.safeParse(row.eta_metric);
    return [
      {
        device_id: row.device_id,
        name: row.name,
        type: type.data,
        site: row.site,
        ts: last?.ts ?? 0, // 0 = no telemetry yet
        values,
        z: { temperature: 0, vibration: 0, pressure: 0, current: 0 },
        zones,
        health: row.health_score ?? 100,
        status: StatusSchema.catch("normal").parse(row.status ?? "normal"),
        iforest: row.iforest_score ?? 0,
        max_abs_z: row.max_abs_z ?? 0,
        eta_minutes: row.eta_minutes,
        eta_metric: etaMetric.success ? etaMetric.data : null,
        cause_metric: null,
        model_ready: false,
        limits,
      },
    ];
  });
}

export async function getRecentAlerts(limit = 20): Promise<Alert[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("alerts")
    .select("id,time,device_id,severity,metric,value,zscore,message,acknowledged,devices(name)")
    .order("time", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`alerts: ${error.message}`);
  return (data ?? []).flatMap((row): Alert[] => {
    const metric = MetricSchema.safeParse(row.metric);
    const severity = row.severity === "critical" || row.severity === "warning" ? row.severity : null;
    if (!metric.success || !severity) return [];
    return [
      {
        id: row.id,
        ts: Date.parse(row.time),
        device_id: row.device_id,
        device_name: row.devices?.name ?? row.device_id,
        severity,
        metric: metric.data,
        value: row.value ?? 0,
        zscore: row.zscore,
        message: row.message,
        acknowledged: row.acknowledged,
      },
    ];
  });
}

export async function getFleetStats(): Promise<FleetStats | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("get_fleet_stats");
  if (error || !data?.[0]) return null;
  return FleetStatsSchema.parse(data[0]);
}

export async function deviceExists(id: string): Promise<boolean> {
  const supabase = await createSupabaseServer();
  const { count } = await supabase
    .from("devices")
    .select("device_id", { count: "exact", head: true })
    .eq("device_id", id);
  return (count ?? 0) > 0;
}
