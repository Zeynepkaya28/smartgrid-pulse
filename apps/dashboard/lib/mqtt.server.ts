/**
 * Publish one simulator command. Serverless functions cannot hold a broker connection,
 * so every call connects, publishes with QoS 1 and disconnects.
 */
import "server-only";

import { randomUUID } from "node:crypto";

import mqtt from "mqtt";

import { serverEnv } from "./env.server";

export class MqttNotConfiguredError extends Error {}

export async function publishCommand(topic: string, payload: string): Promise<void> {
  const { MQTT_HOST, MQTT_PORT, MQTT_TLS, MQTT_USERNAME, MQTT_PASSWORD } = serverEnv;
  if (!MQTT_HOST) throw new MqttNotConfiguredError("MQTT_HOST is not set");

  const client = await mqtt.connectAsync(`${MQTT_TLS ? "mqtts" : "mqtt"}://${MQTT_HOST}:${MQTT_PORT}`, {
    clientId: `smartgrid-dashboard-${randomUUID().slice(0, 8)}`,
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    clean: true,
    connectTimeout: 5_000,
    reconnectPeriod: 0, // fail fast instead of retrying inside a request
  });
  try {
    await client.publishAsync(topic, payload, { qos: 1 });
  } finally {
    await client.endAsync();
  }
}
