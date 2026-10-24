"""Supabase Realtime Broadcast over the REST API (no websocket needed on the server)."""

from __future__ import annotations

import logging
import time

import httpx

log = logging.getLogger(__name__)

FLEET_CHANNEL = "fleet"
ERROR_LOG_INTERVAL_S = 30.0


class RealtimeBroadcaster:
    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        self._client = httpx.AsyncClient(
            base_url=supabase_url,
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(5.0),
        )
        self.last_ok_monotonic: float | None = None
        self._last_error_log = 0.0

    async def send(self, event: str, payload: dict[str, object]) -> bool:
        body = {
            "messages": [
                {"topic": FLEET_CHANNEL, "event": event, "payload": payload, "private": False}
            ]
        }
        try:
            response = await self._client.post("/realtime/v1/api/broadcast", json=body)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            now = time.monotonic()
            if now - self._last_error_log > ERROR_LOG_INTERVAL_S:  # avoid 1 Hz log spam
                log.warning("realtime broadcast failed: %s", exc)
                self._last_error_log = now
            return False
        self.last_ok_monotonic = time.monotonic()
        return True

    async def close(self) -> None:
        await self._client.aclose()
