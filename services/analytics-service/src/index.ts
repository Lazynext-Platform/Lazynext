/**
 * Lazynext Analytics Service — Express HTTP server.
 *
 * Ingests high-velocity user telemetry events, buffers them in memory,
 * pushes to Kafka (when available), and queries ClickHouse for OLAP
 * dashboards. Computes LTV metrics and provides a real-time metrics API.
 *
 * Falls back to in-memory buffering when Kafka/ClickHouse are unavailable.
 */

import "./tracing";
import express, { Request, Response } from "express";
import crypto from "crypto";
import { Database } from "bun:sqlite";
import path from "path";
import { connectKafka, sendToKafka } from "./kafka";
import { authMiddleware } from "@lazynext/api-client/auth-middleware";

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "analytics-service",
    uptime: process.uptime(),
    kafka: kafkaAvailable ? "connected" : "buffer_only",
    clickhouse: clickhouseAvailable ? "connected" : "unavailable",
    buffered_events: eventBuffer.length,
    active_sessions: activeSessions.size,
  });
});

app.use(authMiddleware);

const PORT = process.env.PORT || 8006;

// ── SQLite Persistence Layer ────────────────────────────────────────────
// Events are written to SQLite for durability across restarts.
// The in-memory buffer remains as a hot cache for /api/v1/metrics queries.

const DB_PATH = process.env.ANALYTICS_DB_PATH || path.resolve("analytics.db");
let db: Database | null;

try {
  db = new Database(DB_PATH);
  db.run("PRAGMA journal_mode = WAL");
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      session_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      ingested_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)`);
  console.log(`[Analytics] SQLite persistence enabled at ${DB_PATH}`);
} catch (err) {
  console.warn(`[Analytics] SQLite unavailable (${err}) — events will not survive restarts`);
  db = null;
}

/** Persist an analytics event to SQLite for durability across restarts. No-op if DB is unavailable. */
function persistEvent(userId: string, eventType: string, metadata: Record<string, unknown>, sessionId: string, timestamp: number): void {
  if (!db) return;
  try {
    const stmt = db.prepare(
      "INSERT INTO events (user_id, event_type, metadata, session_id, timestamp) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(userId, eventType, JSON.stringify(metadata), sessionId, timestamp);
  } catch (err) {
    console.warn(`[Analytics] SQLite write failed: ${err}`);
  }
}

// ── Kafka / ClickHouse Configuration ────────────────────────────────────
// In production, uses kafkajs for real Kafka producers and @clickhouse/client
// for OLAP queries. Falls back to an in-memory analytics buffer for development.
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "")
  .split(",")
  .filter(Boolean);
let kafkaAvailable = false;

// In-memory analytics buffer (circular, last 10k events)
const MAX_BUFFERED_EVENTS = 10_000;
const eventBuffer: Array<{
  userId: string;
  eventType: string;
  metadata: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
}> = [];

// ── Kafka Producer (real when brokers are configured) ───────────────────
const kafkaProducer = {
  connect: async () => {
    return await connectKafka();
  },

  send: async (topic: string, messages: Array<{ key: string; value: any }>) => {
    return await sendToKafka(topic, messages);
  },
};

// ── ClickHouse Client (used for dashboards and LTV queries) ────────────
let clickhouseAvailable = false;

/** Query ClickHouse via HTTP for OLAP dashboards and LTV metrics. Returns rows as parsed JSON objects. Falls back to empty array when ClickHouse is unavailable. */
async function queryClickHouse(_query: string): Promise<any[]> {
  if (process.env.CLICKHOUSE_URL) {
    try {
      const headers: Record<string, string> = {};
      const chUser = process.env.CLICKHOUSE_USER;
      const chPassword = process.env.CLICKHOUSE_PASSWORD;
      if (chUser && chPassword) {
        const auth = Buffer.from(`${chUser}:${chPassword}`).toString("base64");
        headers["Authorization"] = `Basic ${auth}`;
      }
      const resp = await fetch(`${process.env.CLICKHOUSE_URL}?default_format=JSONEachRow`, {
        method: "POST",
        headers,
        body: _query,
      });
      if (resp.ok) {
        const text = await resp.text();
        return text
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line));
      }
    } catch {
      // ClickHouse unavailable — return empty
    }
  }
  return [];
}

// ── Session tracking ────────────────────────────────────────────────────
// Groups events by user session for engagement metrics
const activeSessions = new Map<string, { startTime: number; lastEvent: number; eventCount: number }>();

/** Track an active user session, cleaning up stale sessions (inactive >30 min). */
function trackSession(userId: string, sessionId: string): void {
  const key = `${userId}:${sessionId}`;
  const now = Date.now();
  const existing = activeSessions.get(key);
  if (existing) {
    existing.lastEvent = now;
    existing.eventCount++;
  } else {
    activeSessions.set(key, { startTime: now, lastEvent: now, eventCount: 1 });
    // Clean up stale sessions (inactive > 30 min)
    if (activeSessions.size > 1000) {
      for (const [k, v] of activeSessions) {
        if (now - v.lastEvent > 30 * 60 * 1000) {
          activeSessions.delete(k);
        }
      }
    }
  }
}

/**
 * High-velocity telemetry ingestion endpoint.
 * Accepts user action events from the Next.js frontend or native apps.
 *
 * Event types: page_view, timeline_edit, export_started, export_completed,
 *              ai_prompt, collaboration_join, payment_initiated, etc.
 */
const VALID_EVENT_TYPES = new Set([
  "page_view", "timeline_edit", "clip_added", "track_added",
  "export_started", "export_completed", "ai_prompt_sent",
  "ai_response_received", "payment_completed", "subscription_changed",
  "login", "signup", "session_start", "session_end",
  "collaboration_joined", "asset_uploaded", "plugin_used",
]);

const MAX_METADATA_KEYS = 50;
const MAX_METADATA_VALUE_LENGTH = 1000;

function sanitizeMetadata(metadata: unknown): Record<string, unknown> {
  if (typeof metadata !== "object" || metadata === null) {
    return {};
  }
  const record = metadata as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  let keyCount = 0;
  for (const [key, value] of Object.entries(record)) {
    if (keyCount >= MAX_METADATA_KEYS) break;
    if (typeof key !== "string" || key.length > 256) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.length > MAX_METADATA_VALUE_LENGTH) {
      sanitized[key] = value.substring(0, MAX_METADATA_VALUE_LENGTH) + "...";
    } else {
      sanitized[key] = value;
    }
    keyCount++;
  }
  return sanitized;
}

app.post("/api/v1/events", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      eventType,
      metadata = {},
      timestamp,
      sessionId,
    } = req.body as {
      userId?: unknown;
      eventType?: unknown;
      metadata?: unknown;
      timestamp?: unknown;
      sessionId?: unknown;
    };

    // Strict type validation
    if (typeof userId !== "string" || userId.trim().length === 0 || userId.length > 256) {
      return res.status(400).json({ error: "Invalid userId: must be a non-empty string (max 256 chars)" });
    }
    if (typeof eventType !== "string" || eventType.trim().length === 0) {
      return res.status(400).json({ error: "Missing eventType" });
    }
    if (!VALID_EVENT_TYPES.has(eventType)) {
      return res.status(400).json({
        error: `Invalid eventType '${eventType}'. Must be one of: ${[...VALID_EVENT_TYPES].join(", ")}`
      });
    }
    if (timestamp !== undefined && typeof timestamp !== "number") {
      return res.status(400).json({ error: "timestamp must be a number" });
    }
    if (sessionId !== undefined && typeof sessionId !== "string") {
      return res.status(400).json({ error: "sessionId must be a string" });
    }

    const cleanMetadata = sanitizeMetadata(metadata);
    const ts = typeof timestamp === "number" && timestamp > 0 ? timestamp : Date.now();
    const sid = typeof sessionId === "string" && sessionId.trim().length > 0
      ? sessionId.trim()
      : crypto.randomUUID();
    const cleanUserId = userId.trim();
    const cleanEventType = eventType.trim();

    // Buffer in-memory for /api/v1/metrics queries
    eventBuffer.push({ userId: cleanUserId, eventType: cleanEventType, metadata: cleanMetadata, timestamp: ts, sessionId: sid });
    if (eventBuffer.length > MAX_BUFFERED_EVENTS) {
      eventBuffer.shift();
    }

    // Persist to SQLite for durability across restarts
    persistEvent(cleanUserId, cleanEventType, cleanMetadata, sid, ts);

    // Track session
    trackSession(cleanUserId, sid);

    // Push to Kafka if available
    if (kafkaAvailable) {
      await kafkaProducer.send("lazynext.user.events", [
        {
          key: cleanUserId,
          value: JSON.stringify({ userId: cleanUserId, eventType: cleanEventType, metadata: cleanMetadata, timestamp: ts, sessionId: sid }),
        },
      ]);
    }

    return res.status(202).json({ accepted: true });
  } catch (error) {
    console.error("[Analytics] Failed to ingest event:", error);
    return res.status(500).json({ error: "Ingestion failure" });
  }
});

/**
 * Query aggregated metrics from the in-memory buffer.
 * In production, this queries ClickHouse for real-time dashboards.
 */
app.get("/api/v1/metrics", async (_req: Request, res: Response) => {
  try {
    // Aggregate from in-memory buffer
    const eventCounts: Record<string, number> = {};
    let totalRevenue = 0;
    const uniqueUsers = new Set<string>();

    for (const event of eventBuffer) {
      eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
      uniqueUsers.add(event.userId);

      // Track revenue events
      if (
        event.eventType === "payment_completed" &&
        typeof event.metadata.amount === "number"
      ) {
        totalRevenue += event.metadata.amount;
      }
    }

    // If ClickHouse is available, enrich with real OLAP data
    let chRevenue = 0;
    if (clickhouseAvailable) {
      const rows = await queryClickHouse(
        "SELECT sum(amount) as total FROM analytics.payments WHERE date >= today() - 30",
      );
      if (rows.length > 0) {
        chRevenue = rows[0].total || 0;
      }
    }

    res.json({
      success: true,
      period: "30d",
      metrics: {
        totalEvents: eventBuffer.length,
        uniqueUsers: uniqueUsers.size,
        activeSessions: activeSessions.size,
        eventBreakdown: eventCounts,
        estimatedRevenue: totalRevenue || chRevenue,
        dataSource: clickhouseAvailable ? "clickhouse" : "in-memory",
      },
    });
  } catch (error) {
    console.error("[Analytics] Failed to compute metrics:", error);
    res.status(500).json({ error: "Metrics computation failed" });
  }
});

/**
 * Calculate Customer Lifetime Value (LTV) for a user.
 * LTV = average revenue per user × average retention period.
 */
app.get("/api/v1/ltv/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const userEvents = eventBuffer.filter((e) => e.userId === userId);

  const totalSpent = userEvents
    .filter((e) => e.eventType === "payment_completed")
    .reduce((sum, e) => sum + ((e.metadata.amount as number) || 0), 0);

  const firstEvent = userEvents.length > 0
    ? Math.min(...userEvents.map((e) => e.timestamp))
    : Date.now();

  const daysActive = (Date.now() - firstEvent) / (1000 * 60 * 60 * 24);

  res.json({
    success: true,
    userId,
    metrics: {
      totalEvents: userEvents.length,
      totalSpent,
      daysActive: Math.round(daysActive),
      estimatedLTV: daysActive > 0 ? totalSpent / daysActive * 365 : 0,
    },
  });
});

// ── Startup ─────────────────────────────────────────────────────────────

async function start() {
  // Attempt Kafka connection
  await kafkaProducer.connect();

  // Attempt ClickHouse connection check
  if (process.env.CLICKHOUSE_URL) {
    try {
      const headers: Record<string, string> = {};
      const chUser = process.env.CLICKHOUSE_USER;
      const chPassword = process.env.CLICKHOUSE_PASSWORD;
      if (chUser && chPassword) {
        headers["Authorization"] = `Basic ${Buffer.from(`${chUser}:${chPassword}`).toString("base64")}`;
      }
      const resp = await fetch(`${process.env.CLICKHOUSE_URL}?query=SELECT%201`, { headers });
      if (resp.ok) {
        (clickhouseAvailable as boolean) = true;
        console.log("[Analytics] ClickHouse connected.");
      }
    } catch {
      console.log("[Analytics] ClickHouse unavailable — using in-memory metrics.");
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 Lazynext Analytics Service running on port ${PORT}`);
    console.log(
      `📊 Pipeline: ${kafkaAvailable ? "Kafka→ClickHouse" : "In-Memory Buffer"} | Buffered: ${eventBuffer.length} events`,
    );
  });
}

if ((import.meta as unknown as { main?: boolean }).main) {
  start();
}

export default app;
