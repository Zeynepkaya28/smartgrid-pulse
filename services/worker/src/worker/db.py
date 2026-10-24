"""Postgres access via asyncpg (raw telemetry COPY, devices, health, alerts)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

import asyncpg

from worker.alerts import Alert
from worker.buffer import COLUMNS, Record
from worker.monitor import DeviceState

log = logging.getLogger(__name__)

# Everything a dropped or failing connection can raise; callers keep data and retry.
DB_ERRORS: tuple[type[Exception], ...] = (
    OSError,
    TimeoutError,
    asyncpg.PostgresError,
    asyncpg.InterfaceError,
)


def _dt(ts_ms: int) -> datetime:
    return datetime.fromtimestamp(ts_ms / 1000, tz=UTC)


class Database:
    def __init__(self, dsn: str) -> None:
        self._dsn = dsn
        self._pool: Any = None

    @property
    def connected(self) -> bool:
        return self._pool is not None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(
            self._dsn,
            min_size=1,
            max_size=4,
            command_timeout=15,
            server_settings={"application_name": "smartgrid-worker"},
        )

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    async def ensure(self) -> None:
        if self._pool is None:
            await self.connect()

    async def copy_telemetry(self, records: list[Record]) -> None:
        await self.ensure()
        async with self._pool.acquire() as conn:
            await conn.copy_records_to_table(
                "telemetry", schema_name="public", records=records, columns=list(COLUMNS)
            )

    async def upsert_device(
        self, device_id: str, name: str, device_type: str, site: str, ts_ms: int
    ) -> None:
        await self.ensure()
        await self._pool.execute(
            """
            insert into public.devices (device_id, name, type, site, first_seen, last_seen)
            values ($1, $2, $3, $4, $5, $5)
            on conflict (device_id) do update set
              name = excluded.name,
              type = excluded.type,
              site = excluded.site,
              first_seen = coalesce(public.devices.first_seen, excluded.first_seen),
              last_seen = greatest(public.devices.last_seen, excluded.last_seen)
            """,
            device_id,
            name,
            device_type,
            site,
            _dt(ts_ms),
        )

    async def touch_devices(self, last_seen: dict[str, int]) -> None:
        if not last_seen:
            return
        await self.ensure()
        ids = list(last_seen)
        times = [_dt(last_seen[i]) for i in ids]
        await self._pool.execute(
            """
            update public.devices d
            set last_seen = greatest(d.last_seen, v.ts)
            from unnest($1::text[], $2::timestamptz[]) as v(device_id, ts)
            where d.device_id = v.device_id
            """,
            ids,
            times,
        )

    async def insert_health(self, states: list[DeviceState]) -> None:
        if not states:
            return
        await self.ensure()
        rows = [
            (
                _dt(s.ts),
                s.device_id,
                float(s.health),
                s.status,
                float(s.iforest),
                float(s.max_abs_z),
                None if s.eta_minutes is None else float(s.eta_minutes),
                s.eta_metric,
            )
            for s in states
        ]
        async with self._pool.acquire() as conn:
            await conn.copy_records_to_table(
                "device_health",
                schema_name="public",
                records=rows,
                columns=[
                    "time",
                    "device_id",
                    "health_score",
                    "status",
                    "iforest_score",
                    "max_abs_z",
                    "eta_minutes",
                    "eta_metric",
                ],
            )

    async def insert_alert(self, alert: Alert) -> int:
        await self.ensure()
        alert_id: int = await self._pool.fetchval(
            """
            insert into public.alerts (time, device_id, severity, metric, value, zscore, message)
            values ($1, $2, $3, $4, $5, $6, $7)
            returning id
            """,
            _dt(alert.ts),
            alert.device_id,
            alert.severity,
            alert.metric,
            float(alert.value),
            float(alert.zscore),
            alert.message,
        )
        return alert_id
