"""Inbound MQTT payloads."""

from __future__ import annotations

import math
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TelemetryIn(BaseModel):
    """smartgrid/{site}/{device_id}/telemetry (see CLAUDE.md topic contract)."""

    model_config = ConfigDict(extra="ignore", frozen=True)

    device_id: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=1, max_length=120)
    type: Literal["motor", "wind_turbine", "pump", "transformer"]
    site: str = Field(min_length=1, max_length=120)
    ts: int = Field(gt=1_500_000_000_000)  # epoch ms, sanity-checked
    seq: int = Field(ge=0)
    temperature: float
    vibration: float = Field(ge=0)
    pressure: float = Field(ge=0)
    current: float = Field(ge=0)

    @field_validator("temperature", "vibration", "pressure", "current")
    @classmethod
    def _finite(cls, v: float) -> float:
        if not math.isfinite(v):
            raise ValueError("must be finite")
        return v
