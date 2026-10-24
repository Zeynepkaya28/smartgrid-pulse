from __future__ import annotations

import pytest

from simulator.devices import build_devices
from simulator.fleet import Fleet


class FakeClock:
    """Injectable clock: time only moves when the test says so."""

    def __init__(self, start: float = 1_800_000_000.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture
def fleet(clock: FakeClock) -> Fleet:
    return Fleet(build_devices(12), clock=clock, seed=42)
