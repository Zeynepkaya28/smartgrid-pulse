"""MQTT side of the simulator: publish telemetry, consume commands, reconnect forever."""

from __future__ import annotations

import asyncio
import json
import logging
import ssl

import aiomqtt
from pydantic import ValidationError

from simulator.commands import (
    FAULT_COMMAND_FILTER,
    FAULTS_STATE_TOPIC,
    RESET_COMMAND_TOPIC,
    FaultCommand,
    device_id_from_fault_topic,
)
from simulator.fleet import Fleet, UnknownDeviceError
from simulator.settings import Settings

log = logging.getLogger(__name__)

BACKOFF_INITIAL_S = 1.0
BACKOFF_MAX_S = 30.0


class SimulatorService:
    def __init__(self, settings: Settings, fleet: Fleet) -> None:
        self._settings = settings
        self._fleet = fleet
        self.connected = False
        self.last_publish_monotonic: float | None = None

    def _client(self) -> aiomqtt.Client:
        s = self._settings
        return aiomqtt.Client(
            hostname=s.mqtt_host,
            port=s.mqtt_port,
            username=s.mqtt_username,
            password=s.mqtt_password.get_secret_value() if s.mqtt_password else None,
            identifier=s.mqtt_client_id,
            tls_context=ssl.create_default_context() if s.mqtt_tls else None,
            keepalive=30,
        )

    async def run(self) -> None:
        """Connect, run publisher + command consumer, and reconnect with exponential backoff."""
        delay = BACKOFF_INITIAL_S
        while True:
            try:
                async with self._client() as client:
                    self.connected = True
                    delay = BACKOFF_INITIAL_S
                    log.info(
                        "connected to mqtt%s://%s:%d",
                        "s" if self._settings.mqtt_tls else "",
                        self._settings.mqtt_host,
                        self._settings.mqtt_port,
                    )
                    await client.subscribe(FAULT_COMMAND_FILTER, qos=1)
                    await client.subscribe(RESET_COMMAND_TOPIC, qos=1)
                    await self._publish_faults(client)
                    async with asyncio.TaskGroup() as tg:
                        tg.create_task(self._publish_loop(client))
                        tg.create_task(self._command_loop(client))
            except* aiomqtt.MqttError as group:
                log.warning("mqtt connection lost: %s", group.exceptions[0])
            finally:
                self.connected = False
            log.info("reconnecting in %.0f s", delay)
            await asyncio.sleep(delay)
            delay = min(delay * 2, BACKOFF_MAX_S)

    async def _publish_loop(self, client: aiomqtt.Client) -> None:
        """Drift-free schedule: deadlines advance by a fixed period on loop.time()."""
        loop = asyncio.get_running_loop()
        period = 1.0 / self._settings.publish_hz
        next_tick = loop.time()
        while True:
            for topic, payload in self._fleet.tick():
                await client.publish(topic, payload.model_dump_json(), qos=0)
            self.last_publish_monotonic = loop.time()

            next_tick += period
            delay = next_tick - loop.time()
            if delay < 0:
                # We fell behind (slow broker, GC pause): skip missed ticks instead of bursting.
                missed = int(-delay // period) + 1
                next_tick += missed * period
                log.debug("publisher behind schedule, skipped %d tick(s)", missed)
                delay = next_tick - loop.time()
            await asyncio.sleep(delay)

    async def _command_loop(self, client: aiomqtt.Client) -> None:
        async for message in client.messages:
            topic = message.topic.value
            if self.handle_command(topic, message.payload):
                await self._publish_faults(client)

    def handle_command(self, topic: str, payload: object) -> bool:
        """Validate and apply one command. Invalid commands are logged and dropped.

        Returns True when the fault state changed.
        """
        if topic == RESET_COMMAND_TOPIC:
            log.info("reset: clearing all faults")
            self._fleet.reset_all()
            return True

        device_id = device_id_from_fault_topic(topic)
        if device_id is None:
            log.warning("ignoring message on unexpected topic %s", topic)
            return False

        if isinstance(payload, bytes | bytearray):
            raw = payload.decode("utf-8", "replace")
        else:
            raw = "" if payload is None else str(payload)
        try:
            command = FaultCommand.model_validate_json(raw)
            changed = self._fleet.apply(device_id, command)
        except ValidationError as exc:
            log.warning("invalid command on %s: %s", topic, exc.errors(include_url=False))
            return False
        except UnknownDeviceError:
            log.warning("command for unknown device %s dropped", device_id)
            return False

        log.info(
            "%s %s on %s (intensity %.2f)",
            command.action,
            command.type or "all faults",
            device_id,
            command.intensity,
        )
        return changed

    async def _publish_faults(self, client: aiomqtt.Client) -> None:
        snapshot = self._fleet.faults_snapshot()
        await client.publish(FAULTS_STATE_TOPIC, json.dumps(snapshot), qos=1, retain=True)
