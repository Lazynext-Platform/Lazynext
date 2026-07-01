/**
 * OpenTelemetry tracing setup for the AI Agents service.
 *
 * Exports traces via OTLP gRPC when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 * Gracefully shut down on SIGTERM.
 */

import * as opentelemetry from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (endpoint) {
  const sdk = new opentelemetry.NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: endpoint,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: "ai-agents",
  });
  
  sdk.start();
  console.log(`[Telemetry] OpenTelemetry initialized (exporting to ${endpoint})`);
  
  process.on("SIGTERM", () => {
    sdk.shutdown()
      .then(() => console.log("[Telemetry] Tracing terminated"))
      .catch((error) => console.log("[Telemetry] Error terminating tracing", error))
      .finally(() => process.exit(0));
  });
} else {
  console.log(`[Telemetry] OpenTelemetry disabled. Set OTEL_EXPORTER_OTLP_ENDPOINT to enable.`);
}
