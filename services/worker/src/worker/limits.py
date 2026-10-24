"""Per-type operating limits loaded from config/limits.toml."""

from __future__ import annotations

import tomllib
from dataclasses import dataclass
from functools import cache
from importlib import resources
from typing import Literal

Metric = Literal["temperature", "vibration", "pressure", "current"]
METRICS: tuple[Metric, ...] = ("temperature", "vibration", "pressure", "current")
Zone = Literal["normal", "warning", "critical"]


@dataclass(frozen=True, slots=True)
class MetricLimit:
    warning: float
    critical: float
    direction: Literal["high", "low"]  # high: alarm above, low: alarm below

    def zone(self, value: float) -> Zone:
        if self.direction == "high":
            if value >= self.critical:
                return "critical"
            return "warning" if value >= self.warning else "normal"
        if value <= self.critical:
            return "critical"
        return "warning" if value <= self.warning else "normal"

    def severity(self, value: float) -> float:
        """0 below warning, 0..1 between warning and critical, 1 at/after critical."""
        span = self.critical - self.warning
        frac = (value - self.warning) / span
        return min(1.0, max(0.0, frac))

    def toward_critical(self, slope: float) -> bool:
        return slope > 0 if self.direction == "high" else slope < 0

    def as_dict(self) -> dict[str, float | str]:
        return {"warning": self.warning, "critical": self.critical, "direction": self.direction}


DeviceLimits = dict[Metric, MetricLimit]


@cache
def _config() -> dict[str, dict[str, object]]:
    text = resources.files("worker.config").joinpath("limits.toml").read_text(encoding="utf-8")
    return tomllib.loads(text)


def limits_for(device_type: str) -> DeviceLimits:
    cfg = _config()
    if device_type not in cfg or device_type == "defaults":
        raise KeyError(f"no limits configured for device type {device_type!r}")
    d = cfg["defaults"]
    t = cfg[device_type]
    temp = t["temperature"]
    vib = t["vibration"]
    assert isinstance(temp, dict) and isinstance(vib, dict)
    p_nom = float(t["pressure_nominal"])  # type: ignore[arg-type]
    i_nom = float(t["current_nominal"])  # type: ignore[arg-type]
    return {
        "temperature": MetricLimit(float(temp["warning"]), float(temp["critical"]), "high"),
        "vibration": MetricLimit(float(vib["warning"]), float(vib["critical"]), "high"),
        "pressure": MetricLimit(
            p_nom * float(d["pressure_warning_ratio"]),  # type: ignore[arg-type]
            p_nom * float(d["pressure_critical_ratio"]),  # type: ignore[arg-type]
            "low",
        ),
        "current": MetricLimit(
            i_nom * float(d["current_warning_ratio"]),  # type: ignore[arg-type]
            i_nom * float(d["current_critical_ratio"]),  # type: ignore[arg-type]
            "high",
        ),
    }
