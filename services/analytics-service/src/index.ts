import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8005;

// Health check endpoint (required by K8s probes)
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "analytics-service",
    uptime: process.uptime(),
    kafka: "connected", // Mock — real implementation would check Kafka connection
  });
});

// Mock Kafka / ClickHouse connection
const kafkaProducer = {
    send: async (topic: string, message: any) => {
        console.log(`[Kafka] Pushed to topic '${topic}':`, message);
        return true;
    }
};

/**
 * High-velocity ingestion endpoint.
 * Called by the Next.js frontend or Native Desktop app every time a user performs an action.
 */
app.post("/api/v1/events", async (req, res) => {
    try {
        const { userId, eventType, metadata, timestamp } = req.body;

        if (!userId || !eventType) {
            return res.status(400).json({ error: "Missing required telemetry fields." });
        }

        // Push event to Kafka Data Lake
        await kafkaProducer.send("user_telemetry_events", {
            userId,
            eventType,
            metadata,
            timestamp: timestamp || Date.now()
        });

        // E.g., if eventType === "EXPORT_COMPLETED", we might calculate LTV downstream in ClickHouse.

        return res.status(202).json({ accepted: true });
    } catch (error) {
        console.error("Failed to ingest telemetry event:", error);
        return res.status(500).json({ error: "Ingestion failure" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Lazynext Analytics Service running on port ${PORT}`);
    console.log(`📊 Ready to ingest high-velocity telemetry into Kafka + ClickHouse.`);
});
