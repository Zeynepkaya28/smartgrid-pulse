"""Per-device anomaly monitor: z-scores, Isolation Forest, trend/ETA and health score."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Literal

import numpy as np
from numpy.typing import NDArray

from worker.detection.iforest import ModelBundle
from worker.detection.trend import TrendWindow, minutes_to_limit
from worker.detection.zscore import RollingZ
from worker.limits import METRICS, DeviceLimits, Metric, Zone

Status = Literal["normal", "warning", "critical"]
STATUS_RANK: dict[Status, int] = {"normal": 0, "warning": 1, "critical": 2}

# Isolation Forest training schedule.
IF_FIRST_TRAIN = 180
IF_RETRAIN_EVERY = 600
IF_BUFFER = 1800
NORMAL_Z = 3.0  # a sample is "normal" for training only if every |z| is below this
# The first model (180 samples) covers less than one transformer load cycle and flags
# normal swings, so its score is reported but only counts towards health once the
# model has seen this many samples.
IF_READY_SAMPLES = 600

# Trend / ETA gating.
TREND_WINDOW = 90
ETA_MIN_ABS_Z = 2.5
ETA_MIN_R2 = 0.35

# Health score.
SMOOTH_DOWN = 0.6  # react fast when health drops
SMOOTH_UP = 0.08  # recover slowly
CRITICAL_BELOW = 40.0
WARNING_BELOW = 70.0


@dataclass(slots=True)
class DeviceState:
    """Snapshot sent to the dashboard and stored in device_health."""

    device_id: str
    name: str
    type: str
    site: str
    ts: int
    values: dict[Metric, float]
    z: dict[Metric, float]
    zones: dict[Metric, Zone]
    health: float
    status: Status
    iforest: float
    max_abs_z: float
    eta_minutes: float | None
    eta_metric: Metric | None
    cause_metric: Metric | None
    model_ready: bool
    limits: dict[str, dict[str, float | str]] = field(default_factory=dict)

    def to_payload(self) -> dict[str, object]:
        return {
            "device_id": self.device_id,
            "name": self.name,
            "type": self.type,
            "site": self.site,
            "ts": self.ts,
            "values": {k: round(v, 3) for k, v in self.values.items()},
            "z": {k: round(v, 2) for k, v in self.z.items()},
            "zones": self.zones,
            "health": round(self.health, 1),
            "status": self.status,
            "iforest": round(self.iforest, 3),
            "max_abs_z": round(self.max_abs_z, 2),
            "eta_minutes": None if self.eta_minutes is None else round(self.eta_minutes, 1),
            "eta_metric": self.eta_metric,
            "cause_metric": self.cause_metric,
            "model_ready": self.model_ready,
            "limits": self.limits,
        }


class DeviceMonitor:
    def __init__(
        self, device_id: str, name: str, device_type: str, site: str, limits: DeviceLimits
    ) -> None:
        self.device_id = device_id
        self.name = name
        self.type = device_type
        self.site = site
        self.limits = limits
        self.zscores: dict[Metric, RollingZ] = {m: RollingZ() for m in METRICS}
        self.trends: dict[Metric, TrendWindow] = {m: TrendWindow(TREND_WINDOW) for m in METRICS}
        self._normal_rows: deque[list[float]] = deque(maxlen=IF_BUFFER)
        self._new_normals = 0
        self.training = False
        self.model: ModelBundle | None = None
        self.health = 100.0
        self.state: DeviceState | None = None
        self.samples = 0

    # -- Isolation Forest lifecycle ---------------------------------------------

    def training_data(self) -> NDArray[np.float64] | None:
        """Return a copy of the normal buffer when (re)training is due, else None."""
        if self.training:
            return None
        due_first = self.model is None and len(self._normal_rows) >= IF_FIRST_TRAIN
        due_retrain = self.model is not None and self._new_normals >= IF_RETRAIN_EVERY
        if not (due_first or due_retrain):
            return None
        self.training = True
        self._new_normals = 0
        return np.array(self._normal_rows, dtype=np.float64)

    def install_model(self, bundle: ModelBundle | None) -> None:
        if bundle is not None:
            self.model = bundle  # single reference swap: scoring sees old or new, never a mix
        self.training = False

    # -- per-sample update ----------------------------------------------------------

    def observe(self, ts_ms: int, values: dict[Metric, float]) -> DeviceState:
        self.samples += 1
        t = ts_ms / 1000.0
        z: dict[Metric, float] = {}
        z_ema: dict[Metric, float] = {}
        zones: dict[Metric, Zone] = {}
        for m in METRICS:
            v = values[m]
            z[m] = self.zscores[m].update(v)
            z_ema[m] = self.zscores[m].z_ema
            self.trends[m].add(t, v)
            zones[m] = self.limits[m].zone(v)

        row = [values[m] for m in METRICS]
        is_normal = all(abs(z[m]) < NORMAL_Z for m in METRICS) and all(
            zones[m] == "normal" for m in METRICS
        )
        if is_normal:
            self._normal_rows.append(row)
            self._new_normals += 1

        model = self.model
        iforest = model.score(row) if model is not None else 0.0
        model_ready = model is not None and model.trained_on >= IF_READY_SAMPLES

        eta, eta_metric = self._eta(values, z_ema, zones)
        max_abs_z = max(abs(z_ema[m]) for m in METRICS)

        raw = 100.0 - (
            self._limit_penalty(values, zones)
            + min(max(max_abs_z - 3.0, 0.0) * 6.0, 30.0)
            + (30.0 * iforest if model_ready else 0.0)
            + (min(max(15.0 - eta, 0.0) * 1.5, 20.0) if eta is not None else 0.0)
        )
        raw = min(100.0, max(0.0, raw))
        alpha = SMOOTH_DOWN if raw < self.health else SMOOTH_UP
        self.health += alpha * (raw - self.health)

        status: Status
        if any(zones[m] == "critical" for m in METRICS) or self.health < CRITICAL_BELOW:
            status = "critical"
        elif any(zones[m] == "warning" for m in METRICS) or self.health < WARNING_BELOW:
            status = "warning"
        else:
            status = "normal"

        self.state = DeviceState(
            device_id=self.device_id,
            name=self.name,
            type=self.type,
            site=self.site,
            ts=ts_ms,
            values=dict(values),
            z=z_ema,
            zones=zones,
            health=self.health,
            status=status,
            iforest=iforest,
            max_abs_z=max_abs_z,
            eta_minutes=eta,
            eta_metric=eta_metric,
            cause_metric=self._cause(status, values, zones, z_ema),
            model_ready=model_ready,
            limits={m: self.limits[m].as_dict() for m in METRICS},
        )
        return self.state

    # -- components -------------------------------------------------------------------

    def _limit_penalty(self, values: dict[Metric, float], zones: dict[Metric, Zone]) -> float:
        worst = 0.0
        for m in METRICS:
            if zones[m] == "critical":
                worst = max(worst, 60.0)
            elif zones[m] == "warning":
                worst = max(worst, 25.0 + 35.0 * self.limits[m].severity(values[m]))
        return worst

    def _eta(
        self, values: dict[Metric, float], z_ema: dict[Metric, float], zones: dict[Metric, Zone]
    ) -> tuple[float | None, Metric | None]:
        """Minutes to the nearest critical limit, only for metrics that already deviate.

        A normal load cycle produces clean linear segments too, so the trend alone is not
        enough: the metric must already be off-baseline in the critical direction.
        """
        best: tuple[float | None, Metric | None] = (None, None)
        for m in METRICS:
            if not self.zscores[m].mature:
                continue  # "deviated" means nothing against a baseline shorter than a cycle
            limit = self.limits[m]
            signed_z = z_ema[m] if limit.direction == "high" else -z_ema[m]
            if signed_z < ETA_MIN_ABS_Z and zones[m] == "normal":
                continue
            trend = self.trends[m].fit()
            if trend is None or trend.r2 < ETA_MIN_R2 or not limit.toward_critical(trend.slope):
                continue
            eta = minutes_to_limit(values[m], trend.slope, limit.critical, limit.direction)
            if eta is not None and (best[0] is None or eta < best[0]):
                best = (eta, m)
        return best

    def _cause(
        self,
        status: Status,
        values: dict[Metric, float],
        zones: dict[Metric, Zone],
        z_ema: dict[Metric, float],
    ) -> Metric | None:
        if status == "normal":
            return None
        in_zone = [m for m in METRICS if zones[m] != "normal"]
        if in_zone:
            return max(
                in_zone,
                key=lambda m: (zones[m] == "critical", self.limits[m].severity(values[m])),
            )
        return max(METRICS, key=lambda m: abs(z_ema[m]))
