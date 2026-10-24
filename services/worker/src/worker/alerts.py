"""Alert decisions and user-facing (Turkish) alert messages."""

from __future__ import annotations

from dataclasses import dataclass

from worker.limits import Metric
from worker.monitor import STATUS_RANK, DeviceState, Status

ALERT_COOLDOWN_S = 60.0

METRIC_LABEL: dict[Metric, str] = {
    "temperature": "Sıcaklık",
    "vibration": "Titreşim",
    "pressure": "Basınç",
    "current": "Akım",
}
METRIC_UNIT: dict[Metric, str] = {
    "temperature": "°C",
    "vibration": "mm/s",
    "pressure": "bar",
    "current": "A",
}
# "uyarı eşiği" is a noun compound (-> eşiğini), "kritik eşik" an adjective + noun (-> eşiği).
THRESHOLD_ACC: dict[str, str] = {"warning": "uyarı eşiğini", "critical": "kritik eşiği"}
THRESHOLD_GEN: dict[str, str] = {"warning": "uyarı eşiğinin", "critical": "kritik eşiğin"}


@dataclass(frozen=True, slots=True)
class Alert:
    ts: int  # epoch ms
    device_id: str
    device_name: str
    severity: Status
    metric: Metric
    value: float
    zscore: float
    message: str

    def to_payload(self) -> dict[str, object]:
        return {
            "ts": self.ts,
            "device_id": self.device_id,
            "device_name": self.device_name,
            "severity": self.severity,
            "metric": self.metric,
            "value": round(self.value, 3),
            "zscore": round(self.zscore, 2),
            "message": self.message,
        }


def _fmt(value: float) -> str:
    """97.2 / 4.99 / 95 (no trailing .0 on round limits)."""
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.2f}" if abs(value) < 10 else f"{value:.1f}"


def build_message(state: DeviceState, metric: Metric, severity: Status) -> str:
    label = METRIC_LABEL[metric]
    unit = METRIC_UNIT[metric]
    value = state.values[metric]
    zone = state.zones[metric]
    limit = state.limits[metric]
    high = limit["direction"] == "high"
    reading = f"{_fmt(value)} {unit}"

    if zone == severity:
        # The metric itself crossed the limit that matches the alert level.
        phrase = f"{THRESHOLD_ACC[zone]} aştı" if high else f"{THRESHOLD_GEN[zone]} altına düştü"
        threshold = float(limit[zone])
        text = f"{label} {phrase}: {reading} (limit {_fmt(threshold)} {unit})"
    elif zone == "warning":
        # Critical by health score while the metric is still in its warning band.
        crossed = "uyarı eşiğini aştı" if high else "uyarı eşiğinin altına düştü"
        critical = float(limit["critical"])
        text = (
            f"{label} {crossed} ve kritik eşiğe yaklaşıyor: {reading} "
            f"(kritik limit {_fmt(critical)} {unit})"
        )
    else:
        z = state.z[metric]
        direction = "yükseliyor" if z > 0 else "düşüyor"
        strength = "belirgin biçimde " if severity == "critical" else ""
        text = f"{label} normal davranıştan {strength}sapıyor ve {direction}: {reading} (z={z:.1f})"

    eta_metric = state.eta_metric
    if (
        state.eta_minutes is not None
        and eta_metric is not None
        and state.eta_minutes > 0
        and state.zones[eta_metric] != "critical"  # already past it: no forecast needed
    ):
        eta = max(1, round(state.eta_minutes))
        prefix = "" if eta_metric == metric else f"{METRIC_LABEL[eta_metric]} için "
        text += f" · {prefix}Tahmini kritik eşik: ~{eta} dk"
    return text


class AlertPolicy:
    """Raise an alert when a device's status escalates, with a per device+level cooldown."""

    def __init__(self, cooldown_s: float = ALERT_COOLDOWN_S) -> None:
        self.cooldown_ms = int(cooldown_s * 1000)
        self._status: dict[str, Status] = {}
        self._last_sent: dict[tuple[str, Status], int] = {}

    def check(self, state: DeviceState) -> Alert | None:
        previous = self._status.get(state.device_id, "normal")
        self._status[state.device_id] = state.status
        if STATUS_RANK[state.status] <= STATUS_RANK[previous]:
            return None

        key = (state.device_id, state.status)
        last = self._last_sent.get(key)
        if last is not None and state.ts - last < self.cooldown_ms:
            return None
        self._last_sent[key] = state.ts

        metric = state.cause_metric or "temperature"
        return Alert(
            ts=state.ts,
            device_id=state.device_id,
            device_name=state.name,
            severity=state.status,
            metric=metric,
            value=state.values[metric],
            zscore=state.z[metric],
            message=build_message(state, metric, state.status),
        )
