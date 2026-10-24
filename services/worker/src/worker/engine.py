"""Fleet-level detection engine shared by the live service and the scenario test."""

from __future__ import annotations

from collections.abc import Callable

import numpy as np
from numpy.typing import NDArray

from worker.alerts import Alert, AlertPolicy
from worker.detection.iforest import ModelBundle, train
from worker.limits import Metric, limits_for
from worker.models import TelemetryIn
from worker.monitor import DeviceMonitor, DeviceState


class Engine:
    def __init__(self) -> None:
        self.monitors: dict[str, DeviceMonitor] = {}
        self.policy = AlertPolicy()

    def observe(self, msg: TelemetryIn) -> DeviceMonitor:
        monitor = self.monitors.get(msg.device_id)
        if monitor is None:
            monitor = DeviceMonitor(
                msg.device_id, msg.name, msg.type, msg.site, limits_for(msg.type)
            )
            self.monitors[msg.device_id] = monitor
        values: dict[Metric, float] = {
            "temperature": msg.temperature,
            "vibration": msg.vibration,
            "pressure": msg.pressure,
            "current": msg.current,
        }
        monitor.observe(msg.ts, values)
        return monitor

    def due_training(
        self, limit: int | None = None
    ) -> list[tuple[DeviceMonitor, NDArray[np.float64]]]:
        """Monitors whose Isolation Forest should be (re)trained, with their data.

        `limit` caps how many jobs start now; the rest stay due and are picked up on later
        calls. A fleet that starts together reaches its training thresholds in the same
        second, and training all at once starves the event loop (seen in the load test).
        """
        jobs: list[tuple[DeviceMonitor, NDArray[np.float64]]] = []
        for monitor in self.monitors.values():
            if limit is not None and len(jobs) >= limit:
                break
            data = monitor.training_data()
            if data is not None:
                jobs.append((monitor, data))
        return jobs

    def train_inline(self, trainer: Callable[..., ModelBundle] = train) -> None:
        """Synchronous training, used by tests and simulations."""
        for monitor, data in self.due_training():
            monitor.install_model(trainer(data))

    def evaluate(self) -> tuple[list[DeviceState], list[Alert]]:
        states: list[DeviceState] = []
        alerts: list[Alert] = []
        for monitor in self.monitors.values():
            state = monitor.state
            if state is None:
                continue
            states.append(state)
            alert = self.policy.check(state)
            if alert is not None:
                alerts.append(alert)
        return states, alerts
