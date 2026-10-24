"""End-to-end detection scenario: the real simulator device models driven by a fake clock.

12 devices run 900 s normally, then faults are injected for 420 s:
  overheat (intensity 1) on one device of every type  -> acceptance criteria
  vibration / pressure_leak / current_surge on three more devices -> reported only
The remaining five devices stay healthy for the whole run.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from simulator.commands import FaultCommand
from simulator.devices import build_devices
from simulator.fleet import Fleet
from simulator.physics import FaultType

from worker.engine import Engine
from worker.models import TelemetryIn
from worker.monitor import STATUS_RANK, Status

NORMAL_S = 900
FAULT_S = 420

OVERHEAT_DEVICES = ("mt-01", "wt-01", "pm-01", "tr-01")
OTHER_FAULTS = {
    "mt-02": FaultType.VIBRATION,
    "pm-02": FaultType.PRESSURE_LEAK,
    "wt-02": FaultType.CURRENT_SURGE,
}


class FakeClock:
    def __init__(self, start: float = 1_800_000_000.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now


@dataclass
class DeviceResult:
    device_id: str
    fault: str | None
    normal_worst: Status = "normal"
    normal_eta_count: int = 0
    normal_min_health: float = 100.0
    first_eta: int | None = None  # seconds after injection
    first_warning: int | None = None
    first_critical: int | None = None
    fault_worst: Status = "normal"
    eta_at_first: float | None = None
    alerts: list[str] = field(default_factory=list)


def run_scenario(seed: int = 2026) -> dict[str, DeviceResult]:
    clock = FakeClock()
    fleet = Fleet(build_devices(12), clock=clock, seed=seed)
    engine = Engine()
    faults: dict[str, FaultType] = {d: FaultType.OVERHEAT for d in OVERHEAT_DEVICES}
    faults.update(OTHER_FAULTS)
    results = {d: DeviceResult(d, str(faults[d]) if d in faults else None) for d in fleet.devices}

    for second in range(NORMAL_S + FAULT_S):
        clock.now += 1.0
        if second == NORMAL_S:
            for device_id, fault in faults.items():
                fleet.apply(device_id, FaultCommand(action="inject", type=fault))
        for _, payload in fleet.tick():
            engine.observe(TelemetryIn.model_validate(payload.model_dump()))
        engine.train_inline()
        states, alerts = engine.evaluate()

        for alert in alerts:
            results[alert.device_id].alerts.append(f"{second - NORMAL_S:+d}s {alert.message}")
        for s in states:
            r = results[s.device_id]
            if second < NORMAL_S:
                if STATUS_RANK[s.status] > STATUS_RANK[r.normal_worst]:
                    r.normal_worst = s.status
                if s.eta_minutes is not None:
                    r.normal_eta_count += 1
                r.normal_min_health = min(r.normal_min_health, s.health)
                continue
            t = second - NORMAL_S
            if s.eta_minutes is not None and r.first_eta is None:
                r.first_eta, r.eta_at_first = t, s.eta_minutes
            if s.status != "normal" and r.first_warning is None:
                r.first_warning = t
            if s.status == "critical" and r.first_critical is None:
                r.first_critical = t
            if STATUS_RANK[s.status] > STATUS_RANK[r.fault_worst]:
                r.fault_worst = s.status
    return results


def format_table(results: dict[str, DeviceResult]) -> str:
    def fmt(v: int | None) -> str:
        return "-" if v is None else f"{v} s"

    header = (
        f"{'device':<7}{'fault':<15}{'normal':<9}{'min hp':>7}{'fake eta':>9}"
        f"{'ETA':>8}{'warn':>8}{'crit':>8}  first ETA"
    )
    lines = [header, "-" * len(header)]
    for r in results.values():
        eta = "-" if r.eta_at_first is None else f"{r.eta_at_first:.1f} dk"
        lines.append(
            f"{r.device_id:<7}{r.fault or '-':<15}{r.normal_worst:<9}{r.normal_min_health:>7.1f}"
            f"{r.normal_eta_count:>9}{fmt(r.first_eta):>8}{fmt(r.first_warning):>8}"
            f"{fmt(r.first_critical):>8}  {eta}"
        )
    return "\n".join(lines)


if __name__ == "__main__":
    import sys
    import time

    seeds = [int(a) for a in sys.argv[1:]] or [2026]
    for seed in seeds:
        start = time.perf_counter()
        res = run_scenario(seed)
        print(f"\nseed {seed} ({time.perf_counter() - start:.1f} s)")
        print(format_table(res))
        for r in res.values():
            for a in r.alerts:
                print(f"  {r.device_id} {a}")
