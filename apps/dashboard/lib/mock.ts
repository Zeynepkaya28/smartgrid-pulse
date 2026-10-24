/**
 * Deterministic mock data for Phase 4 (replaced by Supabase + Realtime in Phase 5).
 *
 * Profiles and limits mirror the simulator (services/simulator/src/simulator/devices.py)
 * and the worker (services/worker/src/worker/config/limits.toml). A fixed MOCK_NOW and a
 * seeded PRNG keep server and client renders identical.
 */
import {
  AlertSchema,
  DeviceStateSchema,
  FleetStatsSchema,
  HistoryPointSchema,
  METRICS,
  type Alert,
  type DeviceState,
  type DeviceType,
  type FaultType,
  type FleetStats,
  type HistoryPoint,
  type Limit,
  type Metric,
  type Range,
  type Status,
} from "./types";

export const MOCK_NOW = Date.UTC(2026, 9, 24, 9, 30, 0);

// -- deterministic randomness --------------------------------------------------------

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

// -- catalog -----------------------------------------------------------------------

interface Profile {
  ambient: number;
  rise: number;
  vibration: number;
  pressure: number;
  current: number;
  period: number;
}

const PROFILES: Record<DeviceType, Profile> = {
  motor: { ambient: 24, rise: 38, vibration: 1.6, pressure: 3.2, current: 48, period: 180 },
  wind_turbine: { ambient: 14, rise: 42, vibration: 2.1, pressure: 2.6, current: 310, period: 420 },
  pump: { ambient: 22, rise: 30, vibration: 1.9, pressure: 6.4, current: 36, period: 240 },
  transformer: { ambient: 26, rise: 34, vibration: 0.6, pressure: 0.35, current: 520, period: 600 },
};

const TEMP_LIMITS: Record<DeviceType, [number, number]> = {
  motor: [80, 95],
  wind_turbine: [75, 90],
  pump: [70, 85],
  transformer: [85, 105],
};

export function limitsFor(type: DeviceType): Record<Metric, Limit> {
  const p = PROFILES[type];
  const [tw, tc] = TEMP_LIMITS[type];
  const vib: [number, number] = type === "transformer" ? [2.0, 3.5] : [4.5, 7.1];
  return {
    temperature: { warning: tw, critical: tc, direction: "high" },
    vibration: { warning: vib[0], critical: vib[1], direction: "high" },
    pressure: { warning: p.pressure * 0.78, critical: p.pressure * 0.6, direction: "low" },
    current: { warning: p.current * 1.15, critical: p.current * 1.35, direction: "high" },
  };
}

const TYPE_ORDER: DeviceType[] = ["motor", "wind_turbine", "pump", "transformer"];
const PREFIX: Record<DeviceType, string> = {
  motor: "mt",
  wind_turbine: "wt",
  pump: "pm",
  transformer: "tr",
};
const NAME: Record<DeviceType, string> = {
  motor: "Motor",
  wind_turbine: "Türbin",
  pump: "Pompa",
  transformer: "Trafo",
};
const SITE: Record<DeviceType, string> = {
  motor: "Bursa Fabrika A",
  wind_turbine: "Aliağa Rüzgar Santrali",
  pump: "Kocaeli Fabrika B",
  transformer: "İzmir Şebeke TM-3",
};

interface CatalogEntry {
  device_id: string;
  name: string;
  type: DeviceType;
  site: string;
}

export const CATALOG: CatalogEntry[] = Array.from({ length: 12 }, (_, i) => {
  const type = TYPE_ORDER[i % 4] as DeviceType;
  const n = String(Math.floor(i / 4) + 1).padStart(2, "0");
  const prefix = PREFIX[type];
  return {
    device_id: `${prefix}-${n}`,
    name: `${NAME[type]} ${prefix.toUpperCase()}-${n}`,
    type,
    site: SITE[type],
  };
});

// -- normal physics (same shape as the simulator) ---------------------------------

function normalValues(entry: CatalogEntry, tMs: number, rand: () => number): Record<Metric, number> {
  const p = PROFILES[entry.type];
  const phase = (hash(entry.device_id) % 628) / 100;
  const load = Math.min(
    1,
    Math.max(0.1, 0.62 + 0.25 * Math.sin((2 * Math.PI * tMs) / 1000 / p.period + phase)),
  );
  return {
    temperature: p.ambient + p.rise * (0.62 + 0.55 * (load - 0.62)) + gauss(rand) * 0.15,
    vibration: p.vibration * (0.75 + 0.35 * load) + gauss(rand) * 0.04 * p.vibration,
    pressure: p.pressure * (0.92 + 0.12 * load) + gauss(rand) * 0.01 * p.pressure,
    current: p.current * (0.35 + 0.65 * load) + gauss(rand) * 0.01 * p.current,
  };
}

// -- current fleet state ------------------------------------------------------------

interface Scenario {
  fault: FaultType;
  values: Partial<Record<Metric, number>>;
  z: Partial<Record<Metric, number>>;
  health: number;
  status: Status;
  iforest: number;
  eta: [number, Metric] | null;
  cause: Metric;
}

/** A few devices are mid-fault so every UI state is visible. */
const SCENARIOS: Record<string, Scenario> = {
  "mt-01": {
    fault: "overheat",
    values: { temperature: 91.4 },
    z: { temperature: 6.8 },
    health: 34,
    status: "critical",
    iforest: 0.82,
    eta: [4.2, "temperature"],
    cause: "temperature",
  },
  "pm-02": {
    fault: "pressure_leak",
    values: { pressure: 4.62 },
    z: { pressure: -5.1 },
    health: 58,
    status: "warning",
    iforest: 0.41,
    eta: [9.6, "pressure"],
    cause: "pressure",
  },
  "wt-02": {
    fault: "current_surge",
    values: { current: 338.2, temperature: 47.9 },
    z: { current: 3.9, temperature: 2.1 },
    health: 66,
    status: "warning",
    iforest: 0.37,
    eta: null,
    cause: "current",
  },
};

const FAULT_START_MS = MOCK_NOW - 8 * 60_000;

function zoneOf(limit: Limit, value: number): Status {
  if (limit.direction === "high") {
    if (value >= limit.critical) return "critical";
    return value >= limit.warning ? "warning" : "normal";
  }
  if (value <= limit.critical) return "critical";
  return value <= limit.warning ? "warning" : "normal";
}

function buildState(entry: CatalogEntry): DeviceState {
  const rand = mulberry32(hash(`${entry.device_id}:now`));
  const scenario = SCENARIOS[entry.device_id];
  const values = { ...normalValues(entry, MOCK_NOW, rand), ...(scenario?.values ?? {}) };
  const limits = limitsFor(entry.type);
  const z = Object.fromEntries(
    METRICS.map((m) => [m, scenario?.z[m] ?? Number((gauss(rand) * 0.8).toFixed(2))]),
  ) as Record<Metric, number>;
  const zones = Object.fromEntries(
    METRICS.map((m) => [m, zoneOf(limits[m], values[m])]),
  ) as Record<Metric, Status>;
  const health = scenario?.health ?? 92 + Math.round(rand() * 8);
  return DeviceStateSchema.parse({
    device_id: entry.device_id,
    name: entry.name,
    type: entry.type,
    site: entry.site,
    ts: MOCK_NOW,
    values,
    z,
    zones,
    health,
    status: scenario?.status ?? "normal",
    iforest: scenario?.iforest ?? Number((rand() * 0.05).toFixed(3)),
    max_abs_z: Math.max(...METRICS.map((m) => Math.abs(z[m]))),
    eta_minutes: scenario?.eta?.[0] ?? null,
    eta_metric: scenario?.eta?.[1] ?? null,
    cause_metric: scenario?.cause ?? null,
    model_ready: true,
    limits,
  });
}

export const MOCK_DEVICES: DeviceState[] = CATALOG.map(buildState);

export function getMockDevice(id: string): DeviceState | undefined {
  return MOCK_DEVICES.find((d) => d.device_id === id);
}

export const MOCK_FAULTS: Record<string, FaultType[]> = Object.fromEntries(
  Object.entries(SCENARIOS).map(([id, s]) => [id, [s.fault]]),
);

// -- history ------------------------------------------------------------------------

const RANGE_SPEC: Record<Range, { points: number; stepMs: number }> = {
  "15m": { points: 180, stepMs: 5_000 },
  "1h": { points: 240, stepMs: 15_000 },
  "6h": { points: 360, stepMs: 60_000 },
  "24h": { points: 288, stepMs: 300_000 },
  "7d": { points: 336, stepMs: 1_800_000 },
};

/** Series ending at MOCK_NOW; faulted devices drift towards their current value. */
export function getMockHistory(deviceId: string, range: Range): HistoryPoint[] {
  const entry = CATALOG.find((c) => c.device_id === deviceId);
  const state = getMockDevice(deviceId);
  if (!entry || !state) return [];
  const { points, stepMs } = RANGE_SPEC[range];
  const rand = mulberry32(hash(`${deviceId}:${range}`));
  const nowNormal = normalValues(entry, MOCK_NOW, mulberry32(1));
  const scenario = SCENARIOS[deviceId];
  const out: HistoryPoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const t = MOCK_NOW - i * stepMs;
    const v = normalValues(entry, t, rand);
    if (scenario && t > FAULT_START_MS) {
      const frac = (t - FAULT_START_MS) / (MOCK_NOW - FAULT_START_MS);
      for (const m of METRICS) {
        const target = scenario.values[m];
        if (target !== undefined) v[m] += frac * frac * (target - nowNormal[m]);
      }
    }
    const spread = (m: Metric) => Math.abs(gauss(rand)) * 0.02 * PROFILES[entry.type][
      m === "temperature" ? "rise" : m
    ];
    out.push(
      HistoryPointSchema.parse({
        bucket: t,
        temperature_avg: v.temperature,
        temperature_max: v.temperature + spread("temperature"),
        vibration_avg: v.vibration,
        vibration_max: v.vibration + spread("vibration"),
        pressure_avg: v.pressure,
        pressure_min: v.pressure - spread("pressure"),
        current_avg: v.current,
        current_max: v.current + spread("current"),
        samples: Math.round(stepMs / 1000),
      }),
    );
  }
  return out;
}

/** Last 60 s of temperature for the card sparkline. */
export function getMockSparkline(deviceId: string): number[] {
  return getMockHistory(deviceId, "15m")
    .slice(-60)
    .map((p) => p.temperature_avg ?? 0);
}

// -- alerts and stats ---------------------------------------------------------------

export const MOCK_ALERTS: Alert[] = AlertSchema.array().parse([
  {
    id: 6,
    ts: MOCK_NOW - 40_000,
    device_id: "mt-01",
    device_name: "Motor MT-01",
    severity: "critical",
    metric: "temperature",
    value: 91.4,
    zscore: 6.8,
    message:
      "Sıcaklık uyarı eşiğini aştı ve kritik eşiğe yaklaşıyor: 91.4 °C (kritik limit 95 °C) · Tahmini kritik eşik: ~4 dk",
    acknowledged: false,
  },
  {
    id: 5,
    ts: MOCK_NOW - 150_000,
    device_id: "wt-02",
    device_name: "Türbin WT-02",
    severity: "warning",
    metric: "current",
    value: 338.2,
    zscore: 3.9,
    message: "Akım normal davranıştan sapıyor ve yükseliyor: 338.2 A (z=3.9)",
    acknowledged: false,
  },
  {
    id: 4,
    ts: MOCK_NOW - 190_000,
    device_id: "pm-02",
    device_name: "Pompa PM-02",
    severity: "warning",
    metric: "pressure",
    value: 4.62,
    zscore: -5.1,
    message: "Basınç uyarı eşiğinin altına düştü: 4.62 bar (limit 4.99 bar) · Tahmini kritik eşik: ~10 dk",
    acknowledged: false,
  },
  {
    id: 3,
    ts: MOCK_NOW - 360_000,
    device_id: "mt-01",
    device_name: "Motor MT-01",
    severity: "warning",
    metric: "temperature",
    value: 66.2,
    zscore: 4.8,
    message:
      "Sıcaklık normal davranıştan sapıyor ve yükseliyor: 66.2 °C (z=4.8) · Tahmini kritik eşik: ~6 dk",
    acknowledged: false,
  },
  {
    id: 2,
    ts: MOCK_NOW - 2 * 3_600_000,
    device_id: "mt-02",
    device_name: "Motor MT-02",
    severity: "critical",
    metric: "vibration",
    value: 9.2,
    zscore: 12.4,
    message: "Titreşim kritik eşiği aştı: 9.20 mm/s (limit 7.10 mm/s)",
    acknowledged: true,
  },
  {
    id: 1,
    ts: MOCK_NOW - 5 * 3_600_000,
    device_id: "tr-01",
    device_name: "Trafo TR-01",
    severity: "warning",
    metric: "temperature",
    value: 85.4,
    zscore: 3.2,
    message: "Sıcaklık uyarı eşiğini aştı: 85.4 °C (limit 85 °C)",
    acknowledged: true,
  },
]);

export const MOCK_STATS: FleetStats = FleetStatsSchema.parse({
  device_count: MOCK_DEVICES.length,
  messages_per_second: 12,
  open_alerts: MOCK_ALERTS.filter((a) => !a.acknowledged).length,
  telemetry_rows_estimate: 2_847_312,
  telemetry_bytes: 392_118_272,
  telemetry_1m_bytes: 18_350_080,
  device_health_bytes: 9_437_184,
  alerts_bytes: 65_536,
});

export function fleetHealth(devices: DeviceState[]): number {
  if (devices.length === 0) return 100;
  return devices.reduce((sum, d) => sum + d.health, 0) / devices.length;
}
