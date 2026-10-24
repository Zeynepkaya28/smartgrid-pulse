"""Each fault must move its signal in the expected direction within 120 simulated seconds."""

from __future__ import annotations

from statistics import mean

import pytest
from conftest import FakeClock

from simulator.commands import FaultCommand
from simulator.devices import build_devices
from simulator.fleet import Fleet, Telemetry
from simulator.physics import FaultType

SIM_SECONDS = 120
DEVICES = ["mt-01", "wt-01", "pm-01", "tr-01"]  # one of each type


def simulate(fleet: Fleet, clock: FakeClock, seconds: int, device_id: str) -> list[Telemetry]:
    series: list[Telemetry] = []
    for _ in range(seconds):
        clock.advance(1.0)
        series.extend(p for _, p in fleet.tick() if p.device_id == device_id)
    return series


def run_pair(device_id: str, fault: FaultType, intensity: float = 1.0) -> list[list[Telemetry]]:
    """Run a faulted fleet and an identical healthy baseline on separate fake clocks."""
    results: list[list[Telemetry]] = []
    for inject in (False, True):
        clock = FakeClock()
        fleet = Fleet(build_devices(12), clock=clock, seed=7)
        simulate(fleet, clock, 30, device_id)  # warm-up
        if inject:
            fleet.apply(device_id, FaultCommand(action="inject", type=fault, intensity=intensity))
        results.append(simulate(fleet, clock, SIM_SECONDS, device_id))
    return results  # [baseline, faulted]


def tail(series: list[Telemetry], field: str, n: int = 20) -> float:
    return mean(float(getattr(p, field)) for p in series[-n:])


def head(series: list[Telemetry], field: str, n: int = 10) -> float:
    return mean(float(getattr(p, field)) for p in series[:n])


@pytest.mark.parametrize("device_id", DEVICES)
def test_overheat_ramps_temperature_up(device_id: str) -> None:
    base, faulted = run_pair(device_id, FaultType.OVERHEAT)
    # 0.22 °C/s x 120 s = 26.4 °C on top of the baseline
    assert tail(faulted, "temperature") - tail(base, "temperature") > 20
    assert tail(faulted, "temperature") > head(faulted, "temperature") + 15


@pytest.mark.parametrize("device_id", DEVICES)
def test_bearing_wear_grows_vibration_exponentially(device_id: str) -> None:
    base, faulted = run_pair(device_id, FaultType.VIBRATION)
    # (1 + p) = e^(0.012 t) -> ~4.2x after 120 s
    assert tail(faulted, "vibration") / tail(base, "vibration") > 3
    # Growth accelerates: the second minute adds more than the first.
    first_minute = mean(p.vibration for p in faulted[50:60]) - head(faulted, "vibration")
    second_minute = tail(faulted, "vibration", 10) - mean(p.vibration for p in faulted[50:60])
    assert second_minute > first_minute


def test_bearing_wear_impulse_rate_is_about_four_percent(fleet: Fleet, clock: FakeClock) -> None:
    # A single device can go 120 s without an impulse (0.96^120 ~ 0.7 %), so measure the
    # rate over the whole fleet instead: 12 devices x 300 s = 3600 samples.
    for device_id in fleet.devices:
        fleet.apply(
            device_id, FaultCommand(action="inject", type=FaultType.VIBRATION, intensity=0.2)
        )
    clock.advance(1)
    previous = {p.device_id: p.vibration for _, p in fleet.tick()}
    spikes = samples = 0
    for _ in range(300):
        clock.advance(1)
        for _, p in fleet.tick():
            # An impulse adds >= 1x the worn baseline; normal steps change it by a few %.
            if p.vibration > 1.6 * previous[p.device_id]:
                spikes += 1
            previous[p.device_id] = p.vibration
            samples += 1
    assert 0.02 < spikes / samples < 0.065


@pytest.mark.parametrize("device_id", DEVICES)
def test_pressure_leak_drops_pressure_but_caps_at_65_percent(device_id: str) -> None:
    base, faulted = run_pair(device_id, FaultType.PRESSURE_LEAK)
    ratio = tail(faulted, "pressure") / tail(base, "pressure")
    assert 0.30 < ratio < 0.40  # 65 % cap reached after ~108 s
    minute = slice(55, 65)
    after_one_minute = mean(p.pressure for p in faulted[minute]) / mean(
        p.pressure for p in base[minute]
    )
    assert 0.55 < after_one_minute < 0.72  # ~36 % per minute


@pytest.mark.parametrize("device_id", DEVICES)
def test_current_surge_raises_current_and_heats(device_id: str) -> None:
    base, faulted = run_pair(device_id, FaultType.CURRENT_SURGE)
    assert tail(faulted, "current", 40) / tail(base, "current", 40) > 1.1
    assert tail(faulted, "temperature") - tail(base, "temperature") > 2
    # It is an oscillation, not a constant offset.
    ratios = [f.current / b.current for f, b in zip(faulted[-40:], base[-40:], strict=True)]
    assert max(ratios) - min(ratios) > 0.15


def test_higher_intensity_develops_faster() -> None:
    _, mild = run_pair("mt-01", FaultType.OVERHEAT, intensity=0.5)
    _, severe = run_pair("mt-01", FaultType.OVERHEAT, intensity=2.0)
    assert tail(severe, "temperature") > tail(mild, "temperature") + 30


def test_clear_stops_fault_and_device_recovers(fleet: Fleet, clock: FakeClock) -> None:
    fleet.apply("pm-01", FaultCommand(action="inject", type=FaultType.PRESSURE_LEAK))
    leaking = simulate(fleet, clock, 120, "pm-01")
    assert fleet.apply("pm-01", FaultCommand(action="clear", type=FaultType.PRESSURE_LEAK))
    recovered = simulate(fleet, clock, 10, "pm-01")
    assert tail(recovered, "pressure", 5) > 2 * tail(leaking, "pressure", 5)


def test_overheat_clear_cools_down_gradually(fleet: Fleet, clock: FakeClock) -> None:
    fleet.apply("mt-01", FaultCommand(action="inject", type=FaultType.OVERHEAT, intensity=2))
    hot = simulate(fleet, clock, 120, "mt-01")
    fleet.apply("mt-01", FaultCommand(action="clear"))
    cooling = simulate(fleet, clock, 180, "mt-01")
    assert cooling[0].temperature > hot[-1].temperature - 3  # no instant drop
    assert cooling[-1].temperature < hot[-1].temperature - 30  # but it does cool


def test_reset_all_clears_every_fault(fleet: Fleet) -> None:
    fleet.apply("mt-01", FaultCommand(action="inject", type=FaultType.OVERHEAT))
    fleet.apply("wt-02", FaultCommand(action="inject", type=FaultType.VIBRATION))
    assert set(fleet.faults_snapshot()["faults"]) == {"mt-01", "wt-02"}
    assert fleet.reset_all()
    assert fleet.faults_snapshot()["faults"] == {}
