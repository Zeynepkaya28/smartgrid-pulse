"""Least-squares trend over a short window and time-to-threshold estimate."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass

import numpy as np

ETA_CAP_MINUTES = 240.0


@dataclass(frozen=True, slots=True)
class Trend:
    slope: float  # units per second
    r2: float


class TrendWindow:
    def __init__(self, size: int = 90) -> None:
        self.size = size
        self._t: deque[float] = deque(maxlen=size)
        self._v: deque[float] = deque(maxlen=size)

    def add(self, t: float, value: float) -> None:
        self._t.append(t)
        self._v.append(value)

    @property
    def full(self) -> bool:
        return len(self._v) == self.size

    def fit(self) -> Trend | None:
        if len(self._v) < max(10, self.size // 2):
            return None
        t = np.fromiter(self._t, dtype=np.float64)
        v = np.fromiter(self._v, dtype=np.float64)
        t = t - t[0]
        t_mean = t.mean()
        v_mean = v.mean()
        dt = t - t_mean
        sxx = float(np.dot(dt, dt))
        if sxx == 0.0:
            return None
        slope = float(np.dot(dt, v - v_mean)) / sxx
        resid = v - (v_mean + slope * dt)
        ss_tot = float(np.dot(v - v_mean, v - v_mean))
        r2 = 1.0 - float(np.dot(resid, resid)) / ss_tot if ss_tot > 0 else 0.0
        return Trend(slope=slope, r2=r2)


def minutes_to_limit(value: float, slope: float, limit: float, direction: str) -> float | None:
    """Minutes until `value` reaches `limit` at `slope` (per second); None if moving away."""
    if direction == "high":
        if value >= limit:
            return 0.0
        if slope <= 0:
            return None
        seconds = (limit - value) / slope
    else:
        if value <= limit:
            return 0.0
        if slope >= 0:
            return None
        seconds = (value - limit) / -slope
    return min(seconds / 60.0, ETA_CAP_MINUTES)
