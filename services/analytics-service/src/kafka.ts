/**
 * Real Kafka producer integration using kafkajs.
 *
 * Activated when KAFKA_BROKERS environment variable is set.
 * Falls back to in-memory buffering when Kafka is unavailable.
 *
 * Usage:
 *   import { getProducer, sendEvent } from './kafka';
 *   await sendEvent('user_telemetry', { userId, eventType, metadata });
 */

import type { Producer, Kafka } from "kafkajs";

let kafkaInstance: Kafka | null = null;
let producerInstance: Producer | null = null;
let kafkaConnected = false;

interface KafkaConfig {
  clientId: string;
  brokers: string[];
  ssl?: boolean;
  sasl?: {
    mechanism: "plain" | "scram-sha-256" | "scram-sha-512";
    username: string;
    password: string;
  };
}

/** Build a KafkaConfig from environment variables, or return null if unconfigured. */
async function getConfig(): Promise<KafkaConfig | null> {
  const brokersEnv = process.env.KAFKA_BROKERS;
  if (!brokersEnv) return null;

  const brokers = brokersEnv.split(",").filter(Boolean);
  if (brokers.length === 0) return null;

  const config: KafkaConfig = {
    clientId: process.env.KAFKA_CLIENT_ID || "lazynext-analytics",
    brokers,
  };

  if (process.env.KAFKA_SSL === "true") {
    config.ssl = true;
  }

  const username = process.env.KAFKA_SASL_USERNAME;
  const password = process.env.KAFKA_SASL_PASSWORD;
  if (username && password) {
    config.sasl = {
      mechanism: (process.env.KAFKA_SASL_MECHANISM as any) || "scram-sha-256",
      username,
      password,
    };
  }

  return config;
}

/** Connect to Kafka via kafkajs; returns true on success, false if unavailable. */
export async function connectKafka(): Promise<boolean> {
  if (kafkaConnected) return true;

  const config = await getConfig();
  if (!config) {
    console.log("[Kafka] No KAFKA_BROKERS configured — events buffered in memory.");
    return false;
  }

  try {
    const { Kafka } = await import("kafkajs");
    kafkaInstance = new Kafka(config as unknown as import("kafkajs").KafkaConfig);
    producerInstance = kafkaInstance.producer({
      maxInFlightRequests: 5,
      idempotent: true,
    });
    await producerInstance.connect();

    kafkaConnected = true;
    console.log(`[Kafka] Connected to brokers: ${config.brokers.join(", ")}`);
    return true;
  } catch (err) {
    console.warn(`[Kafka] Connection failed (${err}) — falling back to in-memory buffer.`);
    return false;
  }
}

/** Send messages to a Kafka topic; returns false if producer is not connected. */
export async function sendToKafka(
  topic: string,
  messages: Array<{ key: string; value: Record<string, unknown> }>,
): Promise<boolean> {
  if (!kafkaConnected || !producerInstance) return false;

  try {
    await producerInstance.send({
      topic,
      messages: messages.map((m) => ({
        key: m.key,
        value: JSON.stringify(m.value),
      })),
    });
    return true;
  } catch (err) {
    console.warn(`[Kafka] Send to topic '${topic}' failed: ${err}`);
    return false;
  }
}

/**
 * Batch send accumulated events to Kafka.
 * Called periodically (every 5 seconds) to reduce API overhead.
 */
export async function flushBatch(
  topic: string,
  batch: Array<{ key: string; value: Record<string, unknown> }>,
): Promise<number> {
  if (batch.length === 0) return 0;

  const success = await sendToKafka(topic, batch);
  return success ? batch.length : 0;
}

/** Gracefully disconnect the Kafka producer. */
export async function disconnectKafka(): Promise<void> {
  if (producerInstance) {
    try {
      await producerInstance.disconnect();
    } catch {
      // Ignore disconnect errors during shutdown
    }
    producerInstance = null;
    kafkaConnected = false;
  }
}

/** Check whether the Kafka producer is currently connected. */
export function isKafkaConnected(): boolean {
  return kafkaConnected;
}

// ── Topic Definitions ─────────────────────────────────────────────────

/** Kafka topic name constants used across the analytics pipeline. */
export const Topics = {
  USER_EVENTS: "lazynext.user.events",
  EDIT_OPERATIONS: "lazynext.editor.operations",
  EXPORT_JOBS: "lazynext.exports.jobs",
  AI_REQUESTS: "lazynext.ai.requests",
  ERRORS: "lazynext.errors",
  REVENUE: "lazynext.billing.revenue",
} as const;

// ── ClickHouse Materialized Views (SQL for reference) ─────────────────
//
// These are created in ClickHouse when the service starts to power
// the real-time analytics dashboard:
//
// CREATE TABLE IF NOT EXISTS lazynext.user_events (
//   timestamp DateTime64(3),
//   userId String,
//   eventType LowCardinality(String),
//   sessionId String,
//   metadata String, -- JSON
//   ingested_at DateTime64(3) DEFAULT now64(3)
// ) ENGINE = MergeTree()
// PARTITION BY toYYYYMM(timestamp)
// ORDER BY (userId, eventType, timestamp);
//
// CREATE MATERIALIZED VIEW IF NOT EXISTS lazynext.dau_mv
// ENGINE = AggregatingMergeTree()
// ORDER BY date
// AS SELECT
//   toDate(timestamp) as date,
//   uniqState(userId) as unique_users,
//   countState() as total_events
// FROM lazynext.user_events
// GROUP BY date;
