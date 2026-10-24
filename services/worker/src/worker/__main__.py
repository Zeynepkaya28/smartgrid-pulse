"""Entry point: `python -m worker`."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import sys

from worker.health import serve
from worker.service import WorkerService
from worker.settings import Settings

log = logging.getLogger("worker")


async def main() -> None:
    settings = Settings()  # required fields come from the environment
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)

    service = WorkerService(settings)
    runner = await serve(service, settings.health_port)
    log.info("worker started, healthcheck on :%d/healthz", settings.health_port)
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(service.run_mqtt())
            tg.create_task(service.run_flush())
            tg.create_task(service.run_tick())
            tg.create_task(service.run_last_seen())
    finally:
        await service.close()
        await runner.cleanup()


def run() -> None:
    if sys.platform == "win32":
        # aiomqtt (paho) needs add_reader/add_writer, which ProactorEventLoop lacks.
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(main())


if __name__ == "__main__":
    run()
