import * as opentelemetry from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
let sdk: opentelemetry.NodeSDK | null = null;

if (endpoint) {
  sdk = new opentelemetry.NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: endpoint,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: "render-service",
  });

  sdk.start();
  console.log(`[Telemetry] OpenTelemetry initialized (exporting to ${endpoint})`);
} else {
  console.log(`[Telemetry] OpenTelemetry disabled. Set OTEL_EXPORTER_OTLP_ENDPOINT to enable.`);
}

/** Gracefully shut down OpenTelemetry. Called by the main shutdown handler. */
export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
      console.log("[Telemetry] Tracing terminated");
    } catch (error) {
      console.log("[Telemetry] Error terminating tracing", error);
    }
  }
}
