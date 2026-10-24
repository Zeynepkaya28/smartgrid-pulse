from __future__ import annotations

from typing import Literal

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Simulator configuration, read from environment variables (or a local .env file)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    mqtt_host: str = "localhost"
    mqtt_port: int = Field(default=1883, ge=1, le=65535)
    mqtt_username: str | None = None
    mqtt_password: SecretStr | None = None
    mqtt_tls: bool = False
    mqtt_client_id: str = "smartgrid-simulator"

    device_count: int = Field(default=12, ge=1, le=1000)
    publish_hz: float = Field(default=1.0, gt=0, le=20)

    # Railway injects PORT; HEALTH_PORT is the explicit local name.
    health_port: int = Field(default=8080, validation_alias=AliasChoices("PORT", "HEALTH_PORT"))
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "json"
    # Fixed seed makes the fleet reproducible; unset means a new random fleet per start.
    sim_seed: int | None = None

    @field_validator("mqtt_username", "mqtt_password", "sim_seed", mode="before")
    @classmethod
    def _empty_as_none(cls, value: object) -> object:
        if isinstance(value, str) and value.strip() == "":
            return None
        return value
