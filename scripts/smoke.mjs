#!/usr/bin/env node
/**
 * Post-deploy smoke test (no dependencies; Node 22+ for global WebSocket).
 *
 *   SMOKE_BASE_URL=https://smartgrid-pulse.vercel.app \
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=... node scripts/smoke.mjs
 *
 * Checks:
 *   1. a Realtime "state" event arrives on the fleet channel within 10 s
 *   2. POST /api/sim without a session returns 401
 *   3. get_fleet_stats reports 12 devices
 *
 * SMOKE_SKIP_REALTIME=1 skips check 1 when no simulator/worker runs in that environment.
 */
const BASE = process.env.SMOKE_BASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY;
const EXPECTED_DEVICES = Number(process.env.SMOKE_EXPECTED_DEVICES ?? 12);
const STATE_TIMEOUT_MS = 10_000;
const SKIP_REALTIME = process.env.SMOKE_SKIP_REALTIME === "1";

if (!BASE || !SUPABASE_URL || !ANON) {
  console.error("SMOKE_BASE_URL, SUPABASE_URL and SUPABASE_ANON_KEY are required");
  process.exit(2);
}

async function realtimeState() {
  const wsUrl = `${SUPABASE_URL.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${ANON}&vsn=1.0.0`;
  return new Promise((resolve) => {
    const started = Date.now();
    const ws = new WebSocket(wsUrl);
    const done = (ok, detail) => {
      clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      resolve({ ok, detail });
    };
    const timer = setTimeout(() => done(false, `no state event within ${STATE_TIMEOUT_MS / 1000} s`), STATE_TIMEOUT_MS);
    ws.addEventListener("open", () => {
      ws.send(
        JSON.stringify({
          topic: "realtime:fleet",
          event: "phx_join",
          payload: { config: { broadcast: { self: false }, presence: { key: "" }, private: false } },
          ref: "1",
        }),
      );
    });
    ws.addEventListener("message", (msg) => {
      const data = JSON.parse(String(msg.data));
      if (data.event === "broadcast" && data.payload?.event === "state") {
        const devices = data.payload.payload?.devices?.length ?? 0;
        done(true, `state after ${((Date.now() - started) / 1000).toFixed(1)} s (${devices} devices)`);
      }
    });
    ws.addEventListener("error", () => done(false, "websocket error"));
  });
}

async function simUnauthorized() {
  const res = await fetch(`${BASE.replace(/\/$/, "")}/api/sim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: "mt-01", action: "clear" }),
  });
  return { ok: res.status === 401, detail: `HTTP ${res.status}` };
}

async function fleetStats() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_fleet_stats`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
  const [row] = await res.json();
  const count = row?.device_count;
  return {
    ok: count === EXPECTED_DEVICES,
    detail: `device_count=${count}, ${row?.messages_per_second?.toFixed?.(1) ?? "?"} msg/s`,
  };
}

const checks = [
  ["Realtime state ≤ 10 s", realtimeState],
  ["/api/sim without session → 401", simUnauthorized],
  [`get_fleet_stats → ${EXPECTED_DEVICES} devices`, fleetStats],
];

let failed = 0;
for (const [name, check] of checks) {
  if (SKIP_REALTIME && check === realtimeState) {
    console.log(`SKIP  ${name.padEnd(36)} no backend in this environment (SMOKE_SKIP_REALTIME=1)`);
    continue;
  }
  let result;
  try {
    result = await check();
  } catch (err) {
    result = { ok: false, detail: String(err) };
  }
  if (!result.ok) failed += 1;
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${name.padEnd(36)} ${result.detail}`);
}
// Let open sockets finish closing instead of exiting mid-close (libuv assert on Windows).
process.exitCode = failed ? 1 : 0;
