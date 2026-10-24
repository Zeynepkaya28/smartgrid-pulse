from __future__ import annotations

from typing import Literal

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Worker configuration from environment variables (or a local .env file)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    mqtt_host: str = "localhost"
    mqtt_port: int = Field(default=1883, ge=1, le=65535)
    mqtt_username: str | None = None
    mqtt_password: SecretStr | None = None
    mqtt_tls: bool = False
    mqtt_client_id: str = "smartgrid-worker"

    # Supabase Postgres. In production use the Supavisor SESSION pooler (port 5432, IPv4):
    # COPY does not work through the transaction pooler (6543).
    database_url: SecretStr
    supabase_url: str
    supabase_service_role_key: SecretStr

    health_port: int = Field(default=8080, validation_alias=AliasChoices("PORT", "HEALTH_PORT"))
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "json"

    @field_validator("mqtt_username", "mqtt_password", mode="before")
    @classmethod
    def _empty_as_none(cls, value: object) -> object:
        if isinstance(value, str) and value.strip() == "":
            return None
        return value

    @field_validator("supabase_url")
    @classmethod
    def _strip_slash(cls, value: str) -> str:
        return value.rstrip("/")
