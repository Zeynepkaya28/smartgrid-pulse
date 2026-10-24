"use client";

import type { FaultType } from "./types";

export type SimCommand =
  | { action: "inject"; device_id: string; type: FaultType; intensity: number }
  | { action: "clear"; device_id: string; type?: FaultType }
  | { action: "reset"; device_id: "all" };

export interface SimResult {
  ok: boolean;
  message?: string;
}

/** POST /api/sim. Errors come back as user-facing Turkish text. */
export async function sendSimCommand(command: SimCommand): Promise<SimResult> {
  try {
    const response = await fetch("/api/sim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    if (response.ok) return { ok: true };
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : "Komut gönderilemedi.";
    return { ok: false, message };
  } catch {
    return { ok: false, message: "Sunucuya ulaşılamadı." };
  }
}
