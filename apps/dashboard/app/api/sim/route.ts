/**
 * POST /api/sim — send a simulator command over MQTT (signed-in users only).
 *
 *   { device_id: "mt-01", action: "inject", type: "overheat", intensity: 1.5 }
 *   { device_id: "mt-01", action: "clear" }            // "Normale Döndür"
 *   { device_id: "all",   action: "reset" }            // "Tümünü sıfırla"
 *
 * The browser never sees broker credentials: they exist only in this route's env.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { MqttNotConfiguredError, publishCommand } from "@/lib/mqtt.server";
import { rateLimit } from "@/lib/rateLimit";
import { getSessionUser } from "@/lib/supabase/server";
import { FaultTypeSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

// Strict id pattern: also prevents MQTT wildcards (+, #) and extra topic levels (/).
const DeviceId = z.string().regex(/^[a-z0-9-]{1,32}$/);

const CommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("inject"),
    device_id: DeviceId,
    type: FaultTypeSchema,
    intensity: z.number().min(0.5).max(3).default(1),
  }),
  z.object({
    action: z.literal("clear"),
    device_id: DeviceId,
    type: FaultTypeSchema.optional(),
  }),
  z.object({
    action: z.literal("reset"),
    device_id: z.literal("all"),
  }),
]);

function error(status: number, message: string, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return error(401, "Simülasyon için giriş yapmalısın.");

  const limited = rateLimit(`sim:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limited.ok) {
    return error(429, "Dakikada en fazla 20 komut gönderebilirsin.", {
      "Retry-After": String(limited.retryAfterS),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "Geçersiz JSON.");
  }
  const parsed = CommandSchema.safeParse(body);
  if (!parsed.success) return error(400, "Geçersiz komut.");

  const cmd = parsed.data;
  const topic =
    cmd.action === "reset" ? "smartgrid/cmd/all/reset" : `smartgrid/cmd/${cmd.device_id}/fault`;
  const payload =
    cmd.action === "reset"
      ? ""
      : JSON.stringify(
          cmd.action === "inject"
            ? { action: "inject", type: cmd.type, intensity: cmd.intensity }
            : { action: "clear", ...(cmd.type ? { type: cmd.type } : {}) },
        );

  try {
    await publishCommand(topic, payload);
  } catch (err) {
    if (err instanceof MqttNotConfiguredError) {
      return error(503, "Simülasyon bu ortamda kapalı (MQTT yapılandırılmamış).");
    }
    console.error("sim publish failed", err);
    return error(502, "Komut broker'a iletilemedi.");
  }
  return NextResponse.json({ ok: true, topic }, { status: 202 });
}
