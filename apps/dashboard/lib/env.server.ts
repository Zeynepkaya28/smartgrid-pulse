/** Server-only environment. Importing this from a client component fails the build. */
import "server-only";

import { z } from "zod";

const emptyAsUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const ServerEnvSchema = z.object({
  MQTT_HOST: z.preprocess(emptyAsUndefined, z.string().optional()),
  MQTT_PORT: z.coerce.number().int().min(1).max(65535).default(1883),
  MQTT_TLS: z
    .enum(["true", "false", "1", "0", ""])
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  MQTT_USERNAME: z.preprocess(emptyAsUndefined, z.string().optional()),
  MQTT_PASSWORD: z.preprocess(emptyAsUndefined, z.string().optional()),
});

export const serverEnv = ServerEnvSchema.parse({
  MQTT_HOST: process.env.MQTT_HOST,
  MQTT_PORT: process.env.MQTT_PORT,
  MQTT_TLS: process.env.MQTT_TLS,
  MQTT_USERNAME: process.env.MQTT_USERNAME,
  MQTT_PASSWORD: process.env.MQTT_PASSWORD,
});
