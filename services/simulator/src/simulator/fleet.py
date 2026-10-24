"""The simulated fleet: owns the device models, the clock and the fault state."""

from __future__ import annotations

import random
import time
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel

from simulator.commands import FaultCommand, telemetry_topic
from simulator.devices import Device, DeviceType
from simulator.physics import DeviceModel

Clock = Callable[[], float]

# A long pause (laptop sleep, debugger) must not make the physics jump.
MAX_STEP_S = 5.0


class UnknownDeviceError(KeyError):
    pass


class Telemetry(BaseModel):
    """Payload of smartgrid/{site}/{device_id}/telemetry."""

    device_id: str
    name: str
    type: DeviceType
    site: str
    ts: int  # epoch milliseconds
    seq: int
    temperature: float  # °C
    vibration: float  # mm/s RMS
    pressure: float  # bar
    current: float  # A


class Fleet:
    def __init__(
        self, devices: list[Device], clock: Clock = time.time, seed: int | None = None
    ) -> None:
        self._clock = clock
        self.devices: dict[str, Device] = {d.device_id: d for d in devices}
        self._models: dict[str, DeviceModel] = {
            d.device_id: DeviceModel(
                d.profile,
                random.Random(f"{seed}:{d.device_id}") if seed is not None else random.Random(),
            )
            for d in devices
        }
        self._seq = 0
        self._last_t: float | None = None

    def tick(self) -> list[tuple[str, Telemetry]]:
        """Advance every device to the current clock time; return (topic, payload) pairs."""
        now = self._clock()
        dt = 0.0 if self._last_t is None else min(MAX_STEP_S, max(0.0, now - self._last_t))
        self._last_t = now
        self._seq += 1
        ts = int(now * 1000)

        out: list[tuple[str, Telemetry]] = []
        for device_id, device in self.devices.items():
            r = self._models[device_id].step(now, dt)
            out.append(
                (
                    telemetry_topic(device.site_slug, device_id),
                    Telemetry(
                        device_id=device_id,
                        name=device.name,
                        type=device.type,
                        site=device.site,
                        ts=ts,
                        seq=self._seq,
                        temperature=round(r.temperature, 2),
                        vibration=round(r.vibration, 3),
                        pressure=round(r.pressure, 3),
                        current=round(r.current, 2),
                    ),
                )
            )
        return out

    def model(self, device_id: str) -> DeviceModel:
        try:
            return self._models[device_id]
        except KeyError:
            raise UnknownDeviceError(device_id) from None

    def apply(self, device_id: str, command: FaultCommand) -> bool:
        """Apply a fault command. Returns True if the fault state changed."""
        model = self.model(device_id)
        if command.action == "inject":
            assert command.type is not None  # guaranteed by FaultCommand validation
            before = model.faults.get(command.type)
            prev_intensity = before.intensity if before is not None else None
            model.inject(command.type, command.intensity, self._clock())
            return prev_intensity != command.intensity
        return model.clear(command.type)

    def reset_all(self) -> bool:
        changed = any(m.faults for m in self._models.values())
        for m in self._models.values():
            m.reset()
        return changed

    def faults_snapshot(self) -> dict[str, Any]:
        """Retained payload for smartgrid/sim/faults: only devices with active faults."""
        faults: dict[str, dict[str, dict[str, float | int]]] = {}
        for device_id, m in self._models.items():
            if m.faults:
                faults[device_id] = {
                    str(kind): {"intensity": f.intensity, "since": int(f.since * 1000)}
                    for kind, f in m.faults.items()
                }
        return {"updated_at": int(self._clock() * 1000), "faults": faults}
