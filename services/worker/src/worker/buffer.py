"""In-memory telemetry buffer that survives database outages (bounded by data age)."""

from __future__ import annotations

import logging
from collections import deque
from datetime import UTC, datetime

from worker.models import TelemetryIn

log = logging.getLogger(__name__)

# asyncpg COPY record: (time, device_id, temperature, vibration, pressure, current)
Record = tuple[datetime, str, float, float, float, float]
COLUMNS = ("time", "device_id", "temperature", "vibration", "pressure", "current")


class TelemetryBuffer:
    """Keeps at most `max_age_s` seconds of data; the oldest rows are dropped first."""

    def __init__(self, max_age_s: float = 60.0) -> None:
        self.max_age_ms = int(max_age_s * 1000)
        self._rows: deque[tuple[int, Record]] = deque()
        self.dropped = 0

    def __len__(self) -> int:
        return len(self._rows)

    def add(self, msg: TelemetryIn) -> None:
        record: Record = (
            datetime.fromtimestamp(msg.ts / 1000, tz=UTC),
            msg.device_id,
            msg.temperature,
            msg.vibration,
            msg.pressure,
            msg.current,
        )
        self._rows.append((msg.ts, record))
        self._trim(msg.ts)

    def _trim(self, newest_ts: int) -> None:
        dropped = 0
        while self._rows and self._rows[0][0] < newest_ts - self.max_age_ms:
            self._rows.popleft()
            dropped += 1
        if dropped:
            self.dropped += dropped
            log.warning(
                "database unavailable: dropped %d oldest rows (%d total)", dropped, self.dropped
            )

    def drain(self) -> list[tuple[int, Record]]:
        rows = list(self._rows)
        self._rows.clear()
        return rows

    def restore(self, rows: list[tuple[int, Record]]) -> None:
        """Put rows back in front after a failed write, keeping order and the age cap."""
        if not rows:
            return
        self._rows.extendleft(reversed(rows))
        self._trim(self._rows[-1][0])
