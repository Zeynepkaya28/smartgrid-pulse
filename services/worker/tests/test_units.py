"""Unit tests for detectors, buffer, alerts and payload validation."""

from __future__ import annotations

import json
import random

import numpy as np
import pytest
from pydantic import ValidationError
from sklearn.ensemble import IsolationForest

from worker.alerts import AlertPolicy, build_message
from worker.buffer import TelemetryBuffer
from worker.detection.iforest import _CompiledForest, train
from worker.detection.trend import TrendWindow, minutes_to_limit
from worker.detection.zscore import RollingZ
from worker.limits import limits_for
from worker.models import TelemetryIn
from worker.monitor import DeviceMonitor

TS0 = 1_800_000_000_000


def telemetry(**overrides: object) -> TelemetryIn:
    base: dict[str, object] = {
        "device_id": "mt-01",
        "name": "Motor MT-01",
        "type": "motor",
        "site": "Bursa Fabrika A",
        "ts": TS0,
        "seq": 1,
        "temperature": 47.0,
        "vibration": 1.6,
        "pressure": 3.2,
        "current": 30.0,
    }
    base.update(overrides)
    return TelemetryIn.model_validate(base)


# -- rolling z ------------------------------------------------------------------------


def test_z_is_zero_during_warmup_then_scores() -> None:
    rz = RollingZ(warmup=60)
    rng = random.Random(1)
    for _ in range(59):
        assert rz.update(10 + rng.gauss(0, 1)) == 0.0
    rz.update(10.0)
    assert rz.ready
    assert rz.update(15.0) == pytest.approx(5.0, abs=1.0)


def test_outliers_are_not_learned() -> None:
    rz = RollingZ()
    rng = random.Random(2)
    for _ in range(200):
        rz.update(10 + rng.gauss(0, 1))
    mean_before, std_before = rz.mean_std()
    for _ in range(50):
        rz.update(30.0)  # z ~ 20
    mean_after, std_after = rz.mean_std()
    assert mean_after == pytest.approx(mean_before)
    assert std_after == pytest.approx(std_before)


def test_new_regime_accepted_after_300_consecutive_rejections() -> None:
    rz = RollingZ()
    rng = random.Random(3)
    for _ in range(200):
        rz.update(10 + rng.gauss(0, 1))
    for _ in range(299):
        rz.update(30 + rng.gauss(0, 1))
    assert rz.regime_changes == 0
    rz.update(30.0)
    assert rz.regime_changes == 1
    assert rz.mean_std()[0] == pytest.approx(30.0, abs=0.5)
    assert abs(rz.update(30.0)) < 3


def test_slow_ramp_is_held_back_once_window_is_full() -> None:
    rz = RollingZ()
    rng = random.Random(4)
    for _ in range(600):
        rz.update(10 + rng.gauss(0, 1))
    assert rz.mature
    for i in range(150):
        rz.update(10 + 0.05 * i + rng.gauss(0, 1))  # +7.5 over 150 s, never |z| > 4 at once
    assert rz.z_ema > 4  # without the hold the baseline would chase the ramp (z ~ 2)


def test_std_floor_prevents_division_blowup_on_constant_signal() -> None:
    rz = RollingZ()
    for _ in range(100):
        rz.update(100.0)
    assert rz.mean_std()[1] == pytest.approx(0.2)  # |mean| * 0.002
    assert rz.update(100.1) == pytest.approx(0.5)


# -- trend / ETA ----------------------------------------------------------------------


def test_trend_slope_and_r2() -> None:
    tw = TrendWindow(90)
    for t in range(90):
        tw.add(float(t), 50 + 0.2 * t)
    trend = tw.fit()
    assert trend is not None
    assert trend.slope == pytest.approx(0.2)
    assert trend.r2 == pytest.approx(1.0)


def test_minutes_to_limit_directions_and_cap() -> None:
    assert minutes_to_limit(80, 0.25, 95, "high") == pytest.approx(1.0)
    assert minutes_to_limit(80, -0.25, 95, "high") is None
    assert minutes_to_limit(96, 0.1, 95, "high") == 0.0
    assert minutes_to_limit(3.0, -0.01, 1.92, "low") == pytest.approx(1.8)
    assert minutes_to_limit(50, 0.0001, 95, "high") == 240.0


# -- Isolation Forest -------------------------------------------------------------------


def test_compiled_forest_matches_sklearn() -> None:
    rng = np.random.default_rng(5)
    x = rng.normal(size=(600, 4))
    model = IsolationForest(n_estimators=50, random_state=0).fit(x)
    queries = np.vstack([rng.normal(size=(50, 4)), rng.normal(size=(20, 4)) * 6])
    fast = _CompiledForest(model)
    expected = -model.score_samples(queries)
    actual = np.array([fast.score(q.tolist()) for q in queries])
    np.testing.assert_allclose(actual, expected, atol=1e-12)


def test_calibrated_score_is_zero_for_typical_and_high_for_outliers() -> None:
    rng = np.random.default_rng(6)
    rows = rng.normal(loc=[50, 1.6, 3.2, 30], scale=[3, 0.1, 0.05, 2], size=(1800, 4))
    bundle = train(rows)
    typical = [bundle.score(r.tolist()) for r in rows[:200]]
    assert np.mean(typical) < 0.02
    # Isolation Forest saturates for extreme points (path length cannot go below ~1).
    assert bundle.score([80, 4.0, 2.0, 60]) > 0.5


# -- buffer -----------------------------------------------------------------------------


def test_buffer_keeps_at_most_60_seconds() -> None:
    buf = TelemetryBuffer(max_age_s=60)
    for s in range(90):
        buf.add(telemetry(ts=TS0 + s * 1000, seq=s))
    assert len(buf) == 61
    assert buf.dropped == 29


def test_buffer_restore_keeps_order_after_failed_write() -> None:
    buf = TelemetryBuffer()
    for s in range(3):
        buf.add(telemetry(ts=TS0 + s * 1000, seq=s))
    rows = buf.drain()
    buf.add(telemetry(ts=TS0 + 3000, seq=3))
    buf.restore(rows)
    assert [ts for ts, _ in buf.drain()] == [TS0, TS0 + 1000, TS0 + 2000, TS0 + 3000]


# -- validation -------------------------------------------------------------------------


@pytest.mark.parametrize(
    "bad",
    [
        {"type": "toaster"},
        {"device_id": "MT 01"},
        {"ts": 12345},
        {"vibration": -1.0},
        {"temperature": float("nan")},
    ],
)
def test_invalid_telemetry_is_rejected(bad: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        telemetry(**bad)


def test_telemetry_parses_simulator_json() -> None:
    raw = json.dumps(
        {
            "device_id": "tr-01",
            "name": "Trafo TR-01",
            "type": "transformer",
            "site": "İzmir Şebeke TM-3",
            "ts": TS0,
            "seq": 7,
            "temperature": 47.4,
            "vibration": 0.6,
            "pressure": 0.35,
            "current": 419.5,
        }
    )
    assert TelemetryIn.model_validate_json(raw).site == "İzmir Şebeke TM-3"


# -- alerts -----------------------------------------------------------------------------


def _monitor_with_state(temperature: float) -> DeviceMonitor:
    monitor = DeviceMonitor("mt-01", "Motor MT-01", "motor", "Bursa Fabrika A", limits_for("motor"))
    monitor.observe(
        TS0,
        {"temperature": temperature, "vibration": 1.6, "pressure": 3.2, "current": 30.0},
    )
    return monitor


def test_limit_message_matches_prompt_example() -> None:
    state = _monitor_with_state(97.2).state
    assert state is not None and state.status == "critical"
    state.eta_minutes, state.eta_metric = None, None
    assert build_message(state, "temperature", "critical") == (
        "Sıcaklık kritik eşiği aştı: 97.2 °C (limit 95 °C)"
    )


def test_message_includes_eta_before_critical() -> None:
    state = _monitor_with_state(85.0).state
    assert state is not None
    state.eta_minutes, state.eta_metric = 3.6, "temperature"
    assert build_message(state, "temperature", "warning") == (
        "Sıcaklık uyarı eşiğini aştı: 85 °C (limit 80 °C) · Tahmini kritik eşik: ~4 dk"
    )


def test_alert_only_on_escalation_with_cooldown() -> None:
    policy = AlertPolicy(cooldown_s=60)
    monitor = _monitor_with_state(85.0)  # warning
    state = monitor.state
    assert state is not None
    assert policy.check(state) is not None  # normal -> warning
    assert policy.check(state) is None  # still warning
    state.status = "normal"
    assert policy.check(state) is None
    state.status, state.ts = "warning", TS0 + 30_000
    assert policy.check(state) is None  # cooldown
    state.status = "normal"
    policy.check(state)
    state.status, state.ts = "warning", TS0 + 61_000
    assert policy.check(state) is not None


# -- fault relay ------------------------------------------------------------------------


def test_fault_map_relay(monkeypatch: pytest.MonkeyPatch) -> None:
    from worker.service import WorkerService
    from worker.settings import Settings

    monkeypatch.setenv("DATABASE_URL", "postgresql://x@localhost/x")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test")
    service = WorkerService(Settings(_env_file=None))
    payload = {
        "updated_at": TS0,
        "faults": {"mt-01": {"overheat": {"intensity": 2.0, "since": TS0}}},
    }
    service.handle_faults(json.dumps(payload).encode())
    assert service.faults == {"mt-01": {"overheat": {"intensity": 2.0, "since": TS0}}}
    assert service._faults_changed
    service._faults_changed = False
    service.handle_faults(json.dumps(payload).encode())
    assert not service._faults_changed  # unchanged map is not re-broadcast
    service.handle_faults(b"not json")
    assert service.faults["mt-01"]["overheat"]["intensity"] == 2.0
    service.handle_faults(b"")
    assert service.faults == {}
