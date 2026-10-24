"""Gated rolling z-score with O(1) updates."""

from __future__ import annotations

import math
from collections import deque


class RollingZ:
    """Rolling mean/std over the last `window` accepted samples.

    Gating: once warmed up, samples with |z| > `gate` are NOT added to the baseline, so a
    developing fault cannot teach itself to be normal. If `regime_after` samples in a row
    are rejected, the process has genuinely moved (e.g. a new set point) and the baseline
    is rebuilt from those samples.

    Hold: a slow ramp never produces |z| > 4 because every accepted sample widens the
    baseline a little (in simulation an overheat ramp stayed at z ~ 2.3 while the
    baseline std grew from 6 to 16). So once the window is full, samples are also held
    back while the smoothed |z_ema| >= `hold`. Before the window is full the baseline may
    not yet span one load cycle, and holding there could freeze it on a narrow range.
    """

    def __init__(
        self,
        window: int = 600,
        warmup: int = 60,
        gate: float = 4.0,
        regime_after: int = 300,
        ema_weight: float = 0.4,
        std_floor_ratio: float = 0.002,
        hold: float = 2.5,
    ) -> None:
        self.window = window
        self.warmup = warmup
        self.gate = gate
        self.regime_after = regime_after
        self.ema_weight = ema_weight  # z_ema = 0.4 * z + 0.6 * previous z_ema
        self.std_floor_ratio = std_floor_ratio
        self.hold = hold
        self._values: deque[float] = deque()
        self._sum = 0.0
        self._sumsq = 0.0
        self._rejected: list[float] = []
        self._updates = 0
        self.z = 0.0
        self.z_ema = 0.0
        self.regime_changes = 0

    @property
    def ready(self) -> bool:
        return len(self._values) >= self.warmup

    @property
    def mature(self) -> bool:
        """Baseline covers a full window (10 min at 1 Hz, longer than every load cycle)."""
        return len(self._values) >= self.window

    @property
    def count(self) -> int:
        return len(self._values)

    def mean_std(self) -> tuple[float, float]:
        n = len(self._values)
        if n == 0:
            return 0.0, 1.0
        mean = self._sum / n
        var = max(self._sumsq / n - mean * mean, 0.0)
        std = max(math.sqrt(var), abs(mean) * self.std_floor_ratio, 1e-9)
        return mean, std

    def _learn(self, x: float) -> None:
        self._values.append(x)
        self._sum += x
        self._sumsq += x * x
        if len(self._values) > self.window:
            old = self._values.popleft()
            self._sum -= old
            self._sumsq -= old * old
        self._updates += 1
        if self._updates % self.window == 0:  # cancel accumulated float error
            self._sum = math.fsum(self._values)
            self._sumsq = math.fsum(v * v for v in self._values)

    def _rebuild(self, values: list[float]) -> None:
        self._values = deque(values[-self.window :])
        self._sum = math.fsum(self._values)
        self._sumsq = math.fsum(v * v for v in self._values)
        self.regime_changes += 1

    def update(self, x: float) -> float:
        """Add one sample; returns the raw z of x against the baseline before learning it."""
        if not self.ready:
            self._learn(x)
            self.z = 0.0
            self.z_ema = 0.0
            return 0.0

        mean, std = self.mean_std()
        z = (x - mean) / std
        held = self.mature and abs(self.z_ema) >= self.hold
        if abs(z) > self.gate or held:
            self._rejected.append(x)
            if len(self._rejected) >= self.regime_after:
                self._rebuild(self._rejected)
                self._rejected = []
        else:
            self._rejected = []
            self._learn(x)

        self.z = z
        self.z_ema = self.ema_weight * z + (1.0 - self.ema_weight) * self.z_ema
        return z
