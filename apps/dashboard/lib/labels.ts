/** User-facing (Turkish) labels. */
import type { DeviceType, FaultType, Metric, Range, Status } from "./types";

export const METRIC_LABEL: Record<Metric, string> = {
  temperature: "Sıcaklık",
  vibration: "Titreşim",
  pressure: "Basınç",
  current: "Akım",
};

export const METRIC_UNIT: Record<Metric, string> = {
  temperature: "°C",
  vibration: "mm/s",
  pressure: "bar",
  current: "A",
};

export const METRIC_DECIMALS: Record<Metric, number> = {
  temperature: 1,
  vibration: 2,
  pressure: 2,
  current: 1,
};

export const TYPE_LABEL: Record<DeviceType, string> = {
  motor: "Motor",
  wind_turbine: "Rüzgâr türbini",
  pump: "Pompa",
  transformer: "Trafo",
};

export const STATUS_LABEL: Record<Status, string> = {
  normal: "Normal",
  warning: "Uyarı",
  critical: "Kritik",
};

export const FAULT_LABEL: Record<FaultType, string> = {
  overheat: "Motoru Isıt",
  vibration: "Titreşimi Artır",
  pressure_leak: "Basınç Kaçağı",
  current_surge: "Akım Dalgalanması",
};

/** Segmented control labels: dakika / saat / gün. */
export const RANGE_LABEL: Record<Range, string> = {
  "15m": "15d",
  "1h": "1s",
  "6h": "6s",
  "24h": "24s",
  "7d": "7g",
};

export const RANGE_LONG_LABEL: Record<Range, string> = {
  "15m": "Son 15 dakika",
  "1h": "Son 1 saat",
  "6h": "Son 6 saat",
  "24h": "Son 24 saat",
  "7d": "Son 7 gün",
};
