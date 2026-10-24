"""Per-device physics model with slowly developing faults.

Faults are trends, not jumps: a predictive "time to threshold" estimate only makes
sense when the signal drifts towards the limit over minutes.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from enum import StrEnum

from simulator.devices import DeviceProfile

TEMPERATURE_TAU_S = 45.0  # first-order thermal lag

# Fault tuning (per unit intensity).
OVERHEAT_RAMP_C_PER_S = 0.22
BEARING_WEAR_RATE = 0.012
BEARING_WEAR_MAX = 20.0  # vibration multiplier caps at 21x nominal
BEARING_IMPULSE_PROBABILITY = 0.04
LEAK_LOSS_PER_MIN = 0.36
LEAK_LOSS_MAX = 0.65
SURGE_BUILDUP_S = 30.0  # oscillation reaches full amplitude after this long
SURGE_PERIOD_S = 7.0
SURGE_EXTRA_HEAT_C = 6.0  # extra I^2R heating at full surge, per unit intensity


class FaultType(StrEnum):
    OVERHEAT = "overheat"
    VIBRATION = "vibration"
    PRESSURE_LEAK = "pressure_leak"
    CURRENT_SURGE = "current_surge"


@dataclass(slots=True)
class ActiveFault:
    intensity: float
    since: float  # epoch seconds when injected
    progress: float = 0.0


@dataclass(frozen=True, slots=True)
class Reading:
    temperature: float
    vibration: float
    pressure: float
    current: float


class DeviceModel:
    """Simulates one device. Call `step(t, dt)` once per publish tick."""

    def __init__(self, profile: DeviceProfile, rng: random.Random) -> None:
        self.profile = profile
        self._rng = rng
        self._phase = rng.uniform(0.0, 2.0 * math.pi)
        self.faults: dict[FaultType, ActiveFault] = {}
        self._temperature = self._steady_temperature()
        self._heat_offset = 0.0  # overheat ramp, added on top of the lagged temperature

    def _steady_temperature(self) -> float:
        return self.profile.ambient_c + self.profile.temp_rise_full_load_c * 0.62

    # -- fault control -----------------------------------------------------------

    def inject(self, fault: FaultType, intensity: float, now: float) -> None:
        existing = self.faults.get(fault)
        if existing is None:
            self.faults[fault] = ActiveFault(intensity=intensity, since=now)
        else:
            existing.intensity = intensity  # keep accumulated progress

    def clear(self, fault: FaultType | None = None) -> bool:
        """Clear one fault (or all). Returns True if anything changed."""
        targets = list(self.faults) if fault is None else [fault]
        changed = False
        for item in targets:
            if self.faults.pop(item, None) is not None:
                changed = True
                if item is FaultType.OVERHEAT:
                    # Hand the extra heat to the thermal lag so the device cools down gradually.
                    self._temperature += self._heat_offset
                    self._heat_offset = 0.0
        return changed

    def reset(self) -> None:
        self.faults.clear()
        self._heat_offset = 0.0
        self._temperature = self._steady_temperature()

    # -- simulation ---------------------------------------------------------------

    def step(self, t: float, dt: float) -> Reading:
        p = self.profile
        rng = self._rng

        load = 0.62 + 0.25 * math.sin(2.0 * math.pi * t / p.load_period_s + self._phase)
        load = min(1.0, max(0.1, load + rng.gauss(0.0, 0.03)))

        overheat = self.faults.get(FaultType.OVERHEAT)
        wear = self.faults.get(FaultType.VIBRATION)
        leak = self.faults.get(FaultType.PRESSURE_LEAK)
        surge = self.faults.get(FaultType.CURRENT_SURGE)

        if overheat is not None:
            self._heat_offset += OVERHEAT_RAMP_C_PER_S * overheat.intensity * dt
            overheat.progress = self._heat_offset
        if wear is not None:
            growth = BEARING_WEAR_RATE * wear.intensity * (1.0 + wear.progress) * dt
            wear.progress = min(BEARING_WEAR_MAX, wear.progress + growth)
        if leak is not None:
            loss = LEAK_LOSS_PER_MIN / 60.0 * leak.intensity * dt
            leak.progress = min(LEAK_LOSS_MAX, leak.progress + loss)
        if surge is not None:
            surge.progress = min(1.0, surge.progress + dt / SURGE_BUILDUP_S)

        # Temperature: first-order lag towards the load-dependent target.
        target = p.ambient_c + p.temp_rise_full_load_c * load
        current_factor = 1.0
        if surge is not None:
            level = surge.intensity * surge.progress
            wave = math.sin(2.0 * math.pi * t / SURGE_PERIOD_S)
            current_factor += 0.18 * level * (1.0 + 0.6 * wave) + rng.gauss(0.0, 0.04 * level)
            target += SURGE_EXTRA_HEAT_C * level
        alpha = 1.0 - math.exp(-dt / TEMPERATURE_TAU_S)
        self._temperature += (target - self._temperature) * alpha
        temperature = self._temperature + self._heat_offset + rng.gauss(0.0, 0.08)

        vibration = p.vibration_nominal_mm_s * (0.75 + 0.35 * load)
        if wear is not None:
            vibration *= 1.0 + wear.progress
            if rng.random() < BEARING_IMPULSE_PROBABILITY:
                impulse = rng.uniform(1.0, 2.5) * (1.0 + wear.progress)
                vibration += p.vibration_nominal_mm_s * impulse
        vibration = max(0.0, vibration + rng.gauss(0.0, 0.04 * p.vibration_nominal_mm_s))

        pressure = p.pressure_nominal_bar * (0.92 + 0.12 * load)
        if leak is not None:
            pressure *= 1.0 - leak.progress
        pressure = max(0.0, pressure + rng.gauss(0.0, 0.01 * p.pressure_nominal_bar))

        current = p.current_nominal_a * (0.35 + 0.65 * load) * current_factor
        current = max(0.0, current + rng.gauss(0.0, 0.01 * p.current_nominal_a))

        return Reading(temperature, vibration, pressure, current)
