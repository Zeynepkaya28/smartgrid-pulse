"""Entry point: `python -m simulator`."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import sys

from simulator.devices import build_devices
from simulator.fleet import Fleet
from simulator.health import serve
from simulator.logging_setup import configure_logging
from simulator.service import SimulatorService
from simulator.settings import Settings

log = logging.getLogger("simulator")


async def main() -> None:
    settings = Settings()
    configure_logging(settings.log_level, settings.log_format, service="simulator")
    devices = build_devices(settings.device_count)
    fleet = Fleet(devices, seed=settings.sim_seed)
    service = SimulatorService(settings, fleet)

    runner = await serve(service, settings.health_port)
    log.info(
        "simulating %d devices at %.2f Hz, healthcheck on :%d/healthz",
        len(devices),
        settings.publish_hz,
        settings.health_port,
    )
    try:
        await service.run()
    finally:
        await runner.cleanup()


def run() -> None:
    if sys.platform == "win32":
        # aiomqtt (paho) needs add_reader/add_writer, which ProactorEventLoop lacks.
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(main())


if __name__ == "__main__":
    run()
