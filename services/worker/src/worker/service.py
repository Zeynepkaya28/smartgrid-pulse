"""Worker runtime: MQTT ingestion, 1 s COPY flush, 1 Hz detection tick, alerts."""

from __future__ import annotations

import asyncio
import functools
import json
import logging
import ssl
import time
from concurrent.futures import ThreadPoolExecutor

import aiomqtt
import structlog
from pydantic import ValidationError

from worker.alerts import Alert
from worker.buffer import TelemetryBuffer
from worker.db import DB_ERRORS, Database
from worker.detection.iforest import ModelBundle, train
from worker.engine import Engine
from worker.models import FaultsSnapshotIn, TelemetryIn
from worker.monitor import DeviceMonitor
from worker.realtime import RealtimeBroadcaster
from worker.settings import Settings

log = logging.getLogger(__name__)
metrics_log = structlog.get_logger("worker.metrics")

TELEMETRY_FILTER = "smartgrid/+/+/telemetry"
FAULTS_TOPIC = "smartgrid/sim/faults"
ALERTS_TOPIC = "smartgrid/alerts"
FLUSH_INTERVAL_S = 1.0
TICK_INTERVAL_S = 1.0
HEALTH_EVERY_TICKS = 5
LAST_SEEN_INTERVAL_S = 30.0
BACKOFF_INITIAL_S = 1.0
BACKOFF_MAX_S = 30.0
METRICS_INTERVAL_S = 30.0
# Isolation Forest training: one background thread, at most this many new jobs per tick.
TRAININGS_PER_TICK = 2
METRICS_WINDOW_CAP = 200_000  # samples kept per window


class WorkerService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.engine = Engine()
        self.buffer = TelemetryBuffer(max_age_s=60.0)
        self.db = Database(settings.database_url.get_secret_value())
        self.realtime = RealtimeBroadcaster(
            settings.supabase_url, settings.supabase_service_role_key.get_secret_value()
        )
        self.mqtt_connected = False
        self.last_flush_ok_monotonic: float | None = None
        self.rows_written = 0
        self.invalid_messages = 0
        self.messages_received = 0
        self._flush_ms: list[float] = []
        self._latency_ms: list[float] = []
        self._trainer = ThreadPoolExecutor(max_workers=1, thread_name_prefix="iforest")
        self._trainings_in_flight = 0
        self._client: aiomqtt.Client | None = None
        self._known_devices: set[str] = set()
        self._last_seen: dict[str, int] = {}
        self._registered_pending: list[TelemetryIn] = []
        # Active simulator faults (relayed to the dashboard, which never talks to MQTT).
        self.faults: dict[str, dict[str, dict[str, float | int]]] = {}
        self._faults_changed = False

    # -- MQTT -----------------------------------------------------------------------

    def _mqtt_client(self) -> aiomqtt.Client:
        s = self.settings
        return aiomqtt.Client(
            hostname=s.mqtt_host,
            port=s.mqtt_port,
            username=s.mqtt_username,
            password=s.mqtt_password.get_secret_value() if s.mqtt_password else None,
            identifier=s.mqtt_client_id,
            tls_context=ssl.create_default_context() if s.mqtt_tls else None,
            keepalive=30,
        )

    async def run_mqtt(self) -> None:
        delay = BACKOFF_INITIAL_S
        while True:
            try:
                async with self._mqtt_client() as client:
                    self._client = client
                    self.mqtt_connected = True
                    delay = BACKOFF_INITIAL_S
                    log.info(
                        "connected to mqtt broker %s:%d",
                        self.settings.mqtt_host,
                        self.settings.mqtt_port,
                    )
                    await client.subscribe(TELEMETRY_FILTER, qos=0)
                    await client.subscribe(FAULTS_TOPIC, qos=1)
                    async for message in client.messages:
                        if message.topic.value == FAULTS_TOPIC:
                            self.handle_faults(message.payload)
                        else:
                            self.handle_telemetry(message.payload)
            except aiomqtt.MqttError as exc:
                log.warning("mqtt connection lost: %s", exc)
            finally:
                self._client = None
                self.mqtt_connected = False
            log.info("reconnecting to mqtt in %.0f s", delay)
            await asyncio.sleep(delay)
            delay = min(delay * 2, BACKOFF_MAX_S)

    def handle_telemetry(self, payload: object) -> TelemetryIn | None:
        """Validate one telemetry message; invalid messages are counted and dropped."""
        try:
            raw = payload if isinstance(payload, bytes | bytearray | str) else b""
            msg = TelemetryIn.model_validate_json(raw)
        except ValidationError as exc:
            self.invalid_messages += 1
            if self.invalid_messages % 100 == 1:
                log.warning(
                    "invalid telemetry dropped (%d so far): %s",
                    self.invalid_messages,
                    exc.errors(include_url=False)[:2],
                )
            return None
        self.messages_received += 1
        self.buffer.add(msg)
        self.engine.observe(msg)
        self._last_seen[msg.device_id] = msg.ts
        if msg.device_id not in self._known_devices:
            self._known_devices.add(msg.device_id)
            self._registered_pending.append(msg)
        return msg

    def handle_faults(self, payload: object) -> None:
        """Keep the latest retained fault map; an empty payload means no faults."""
        if payload in (None, b"", ""):
            faults: dict[str, dict[str, dict[str, float | int]]] = {}
        else:
            try:
                raw = payload if isinstance(payload, bytes | bytearray | str) else b""
                snapshot = FaultsSnapshotIn.model_validate_json(raw)
            except ValidationError as exc:
                log.warning("invalid fault map dropped: %s", exc.errors(include_url=False)[:2])
                return
            faults = {
                device: {kind: f.model_dump() for kind, f in kinds.items()}
                for device, kinds in snapshot.faults.items()
            }
        if faults != self.faults:
            self.faults = faults
            self._faults_changed = True

    # -- database writers -------------------------------------------------------------

    async def run_flush(self) -> None:
        """COPY buffered telemetry every second; on failure keep the rows and retry."""
        while True:
            await asyncio.sleep(FLUSH_INTERVAL_S)
            await self._register_new_devices()
            rows = self.buffer.drain()
            if not rows:
                continue
            started = time.perf_counter()
            try:
                await self.db.copy_telemetry([record for _, record in rows])
            except DB_ERRORS as exc:
                self.buffer.restore(rows)
                log.warning("telemetry write failed (%d rows kept): %s", len(self.buffer), exc)
                await self._reset_db()
                continue
            self.rows_written += len(rows)
            self.last_flush_ok_monotonic = time.monotonic()
            # Ingest latency: device timestamp -> row committed in Postgres.
            committed_ms = time.time() * 1000
            if len(self._latency_ms) < METRICS_WINDOW_CAP:
                self._latency_ms.extend(committed_ms - ts for ts, _ in rows)
            self._flush_ms.append((time.perf_counter() - started) * 1000)

    async def _register_new_devices(self) -> None:
        pending, self._registered_pending = self._registered_pending, []
        for i, msg in enumerate(pending):
            try:
                await self.db.upsert_device(msg.device_id, msg.name, msg.type, msg.site, msg.ts)
                log.info("registered device %s (%s)", msg.device_id, msg.name)
            except DB_ERRORS as exc:
                log.warning("device upsert failed, will retry: %s", exc)
                self._registered_pending = pending[i:] + self._registered_pending
                return

    async def run_last_seen(self) -> None:
        while True:
            await asyncio.sleep(LAST_SEEN_INTERVAL_S)
            snapshot = dict(self._last_seen)
            try:
                await self.db.touch_devices(snapshot)
            except DB_ERRORS as exc:
                log.warning("last_seen update failed: %s", exc)

    async def _reset_db(self) -> None:
        try:
            await self.db.close()
        except Exception:  # closing a broken pool may fail in many ways
            log.debug("ignored error while closing pool", exc_info=True)
        self.db = Database(self.settings.database_url.get_secret_value())

    # -- detection tick ---------------------------------------------------------------

    async def run_tick(self) -> None:
        loop = asyncio.get_running_loop()
        next_tick = loop.time()
        tick = 0
        while True:
            next_tick += TICK_INTERVAL_S
            await asyncio.sleep(max(0.0, next_tick - loop.time()))
            tick += 1
            self._schedule_training()
            states, alerts = self.engine.evaluate()
            if self._faults_changed:
                self._faults_changed = False
                await self.realtime.send("faults", {"faults": self.faults})
            if not states:
                continue
            await self.realtime.send(
                "state",
                {
                    "ts": int(time.time() * 1000),
                    "devices": [s.to_payload() for s in states],
                    "faults": self.faults,
                },
            )
            for alert in alerts:
                await self._publish_alert(alert)
            if tick % HEALTH_EVERY_TICKS == 0:
                try:
                    await self.db.insert_health(states)
                except DB_ERRORS as exc:
                    log.warning("device_health insert failed: %s", exc)

    def _schedule_training(self) -> None:
        """Queue at most TRAININGS_PER_TICK new trainings, never more than that in flight."""
        free = TRAININGS_PER_TICK - self._trainings_in_flight
        if free <= 0:
            return
        loop = asyncio.get_running_loop()
        for monitor, data in self.engine.due_training(limit=free):
            self._trainings_in_flight += 1
            future = loop.run_in_executor(self._trainer, train, data)
            future.add_done_callback(functools.partial(self._install, monitor))

    def _install(self, monitor: DeviceMonitor, future: asyncio.Future[ModelBundle]) -> None:
        self._trainings_in_flight -= 1
        if future.cancelled() or future.exception() is not None:
            log.warning(
                "model training failed for %s: %s",
                monitor.device_id,
                "cancelled" if future.cancelled() else future.exception(),
            )
            monitor.install_model(None)
            return
        bundle = future.result()
        monitor.install_model(bundle)
        log.info("isolation forest ready for %s (%d samples)", monitor.device_id, bundle.trained_on)

    async def _publish_alert(self, alert: Alert) -> None:
        log.info("alert %s %s: %s", alert.severity, alert.device_id, alert.message)
        payload = alert.to_payload()
        try:
            payload["id"] = await self.db.insert_alert(alert)
        except DB_ERRORS as exc:
            log.warning("alert insert failed: %s", exc)
        client = self._client
        if client is not None:
            try:
                await client.publish(ALERTS_TOPIC, json.dumps(payload), qos=1)
            except aiomqtt.MqttError as exc:
                log.warning("alert publish failed: %s", exc)
        await self.realtime.send("alert", payload)

    async def run_metrics(self) -> None:
        """One structured metrics event every 30 s (messages, queue, flush, latency, models)."""
        last_received = 0
        last_time = time.monotonic()
        while True:
            await asyncio.sleep(METRICS_INTERVAL_S)
            now = time.monotonic()
            elapsed = now - last_time
            received = self.messages_received - last_received
            last_received, last_time = self.messages_received, now
            latency, self._latency_ms = sorted(self._latency_ms), []
            flushes, self._flush_ms = self._flush_ms, []
            metrics_log.info(
                "metrics",
                window_s=round(elapsed, 1),
                messages_per_s=round(received / elapsed, 1) if elapsed else 0.0,
                buffered_rows=len(self.buffer),
                dropped_rows=self.buffer.dropped,
                rows_written_total=self.rows_written,
                flushes=len(flushes),
                flush_ms_avg=round(sum(flushes) / len(flushes), 1) if flushes else None,
                flush_ms_max=round(max(flushes), 1) if flushes else None,
                ingest_latency_ms_p50=_percentile(latency, 50),
                ingest_latency_ms_p95=_percentile(latency, 95),
                ingest_latency_ms_max=round(latency[-1], 1) if latency else None,
                devices=len(self.engine.monitors),
                models_ready=sum(1 for m in self.engine.monitors.values() if m.model is not None),
                invalid_messages=self.invalid_messages,
                mqtt_connected=self.mqtt_connected,
            )

    async def close(self) -> None:
        self._trainer.shutdown(wait=False, cancel_futures=True)
        await self.realtime.close()
        await self.db.close()


def _percentile(sorted_values: list[float], pct: float) -> float | None:
    if not sorted_values:
        return None
    index = min(len(sorted_values) - 1, round(pct / 100 * (len(sorted_values) - 1)))
    return round(sorted_values[index], 1)
