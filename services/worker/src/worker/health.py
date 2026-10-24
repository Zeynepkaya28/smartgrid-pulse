"""/healthz endpoint for the Railway healthcheck."""

from __future__ import annotations

import time

from aiohttp import web

from worker.service import WorkerService

DB_STALE_AFTER_S = 15.0


def create_app(service: WorkerService) -> web.Application:
    async def healthz(_: web.Request) -> web.Response:
        now = time.monotonic()
        last_flush = service.last_flush_ok_monotonic
        db_ok = len(service.buffer) == 0 or (
            last_flush is not None and now - last_flush < DB_STALE_AFTER_S
        )
        healthy = service.mqtt_connected and db_ok
        body = {
            "status": "ok" if healthy else "unavailable",
            "mqtt_connected": service.mqtt_connected,
            "db_ok": db_ok,
            "buffered_rows": len(service.buffer),
            "rows_written": service.rows_written,
            "devices": len(service.engine.monitors),
            "invalid_messages": service.invalid_messages,
        }
        return web.json_response(body, status=200 if healthy else 503)

    app = web.Application()
    app.router.add_get("/healthz", healthz)
    return app


async def serve(service: WorkerService, port: int) -> web.AppRunner:
    runner = web.AppRunner(create_app(service), access_log=None)
    await runner.setup()
    await web.TCPSite(runner, host="0.0.0.0", port=port).start()
    return runner
