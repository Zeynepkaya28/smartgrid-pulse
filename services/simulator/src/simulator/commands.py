"""MQTT command payloads and topic helpers (see the topic contract in CLAUDE.md)."""

from __future__ import annotations

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from simulator.physics import FaultType

TOPIC_PREFIX = "smartgrid"
FAULT_COMMAND_FILTER = f"{TOPIC_PREFIX}/cmd/+/fault"
RESET_COMMAND_TOPIC = f"{TOPIC_PREFIX}/cmd/all/reset"
FAULTS_STATE_TOPIC = f"{TOPIC_PREFIX}/sim/faults"


def telemetry_topic(site_slug: str, device_id: str) -> str:
    return f"{TOPIC_PREFIX}/{site_slug}/{device_id}/telemetry"


def device_id_from_fault_topic(topic: str) -> str | None:
    """'smartgrid/cmd/mt-01/fault' -> 'mt-01'; anything else -> None."""
    parts = topic.split("/")
    if len(parts) == 4 and parts[0] == TOPIC_PREFIX and parts[1] == "cmd" and parts[3] == "fault":
        return parts[2]
    return None


class FaultCommand(BaseModel):
    """Payload of smartgrid/cmd/{device_id}/fault."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    action: Literal["inject", "clear"]
    type: FaultType | None = None
    intensity: float = Field(default=1.0, ge=0.2, le=3.0)

    @model_validator(mode="after")
    def _inject_needs_type(self) -> Self:
        if self.action == "inject" and self.type is None:
            raise ValueError("inject requires a fault type")
        return self
