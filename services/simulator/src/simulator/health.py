"""Tiny /healthz HTTP endpoint for the Railway healthcheck."""

from __future__ import annotations

import asyncio

from aiohttp import web

from simulator.service import SimulatorService

# Unhealthy if no telemetry went out for this long while connected.
STALE_AFTER_S = 10.0


def create_app(service: SimulatorService) -> web.Application:
    async def healthz(_: web.Request) -> web.Response:
        last = service.last_publish_monotonic
        age = None if last is None else asyncio.get_running_loop().time() - last
        healthy = service.connected and age is not None and age < STALE_AFTER_S
        body = {
            "status": "ok" if healthy else "unavailable",
            "mqtt_connected": service.connected,
            "last_publish_age_s": None if age is None else round(age, 2),
        }
        return web.json_response(body, status=200 if healthy else 503)

    app = web.Application()
    app.router.add_get("/healthz", healthz)
    return app


async def serve(service: SimulatorService, port: int) -> web.AppRunner:
    runner = web.AppRunner(create_app(service), access_log=None)
    await runner.setup()
    await web.TCPSite(runner, host="0.0.0.0", port=port).start()
    return runner
