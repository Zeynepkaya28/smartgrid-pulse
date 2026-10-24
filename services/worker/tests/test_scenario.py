"""Acceptance test: 12 simulated devices, 900 s normal + 420 s faults (see scenario.py).

Run with `pytest -s` to see the result tables.
"""

from __future__ import annotations

import pytest
from scenario import OTHER_FAULTS, OVERHEAT_DEVICES, DeviceResult, format_table, run_scenario

SEEDS = (2026, 7, 99)


@pytest.fixture(scope="module", params=SEEDS, ids=lambda s: f"seed{s}")
def results(request: pytest.FixtureRequest) -> dict[str, DeviceResult]:
    res = run_scenario(request.param)
    print(f"\nseed {request.param}\n{format_table(res)}")
    return res


def test_no_false_alarms_or_fake_eta_in_normal_period(results: dict[str, DeviceResult]) -> None:
    for r in results.values():
        assert r.normal_worst == "normal", f"{r.device_id} reached {r.normal_worst}"
        assert r.normal_eta_count == 0, f"{r.device_id} produced {r.normal_eta_count} fake ETAs"


def test_healthy_devices_stay_normal_during_fault_period(results: dict[str, DeviceResult]) -> None:
    for r in results.values():
        if r.fault is None:
            assert r.fault_worst == "normal", r.device_id
            assert r.first_eta is None, r.device_id


def test_motor_overheat_meets_acceptance_timing(results: dict[str, DeviceResult]) -> None:
    """Prompt criteria ("Motoru Isıt"): warning <= 150 s, critical <= 200 s, ETA first."""
    r = results["mt-01"]
    assert r.first_warning is not None and r.first_warning <= 150, r
    assert r.first_critical is not None and r.first_critical <= 200, r
    assert r.first_eta is not None and r.first_eta < r.first_critical, r


@pytest.mark.parametrize("device_id", OVERHEAT_DEVICES)
def test_overheat_detected_on_every_device_type(
    results: dict[str, DeviceResult], device_id: str
) -> None:
    """Looser bound for all types: slower load cycles can mask the ramp for a while."""
    r = results[device_id]
    assert r.first_warning is not None and r.first_warning <= 200, r
    assert r.first_critical is not None and r.first_critical <= 240, r
    assert r.first_eta is not None and r.first_eta < r.first_critical, r


@pytest.mark.parametrize("device_id", sorted(OTHER_FAULTS))
def test_other_faults_raise_at_least_a_warning(
    results: dict[str, DeviceResult], device_id: str
) -> None:
    assert results[device_id].first_warning is not None, results[device_id]
