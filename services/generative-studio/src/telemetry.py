"""
OpenTelemetry instrumentation for the Generative Studio service.
Connects to Tempo via OTLP gRPC.
"""

import os
from fastapi import FastAPI

def init_telemetry(app: FastAPI):
    """Initialize OpenTelemetry with OTLP export to Tempo."""
    otel_enabled = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")

    if not otel_enabled:
        print("[Telemetry] OpenTelemetry disabled. Set OTEL_EXPORTER_OTLP_ENDPOINT to enable.")
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource, SERVICE_NAME as RESOURCE_SERVICE_NAME
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        # 1. Setup Resource (Service Name)
        resource = Resource(attributes={
            RESOURCE_SERVICE_NAME: "generative-studio"
        })

        # 2. Initialize Tracer Provider
        provider = TracerProvider(resource=resource)

        # 3. Configure OTLP Exporter
        otlp_exporter = OTLPSpanExporter(
            endpoint=otel_enabled,
            insecure=True # internal cluster traffic
        )

        # 4. Attach Exporter to Provider
        processor = BatchSpanProcessor(otlp_exporter)
        provider.add_span_processor(processor)

        # 5. Set Global Tracer Provider
        trace.set_tracer_provider(provider)

        # 6. Instrument FastAPI
        FastAPIInstrumentor.instrument_app(app)
        
        print(f"[Telemetry] OpenTelemetry initialized (exporting to {otel_enabled})")

    except ImportError:
        print("[Telemetry] OpenTelemetry packages not installed. "
              "Install: pip install opentelemetry-api opentelemetry-sdk "
              "opentelemetry-instrumentation-fastapi opentelemetry-exporter-otlp-proto-grpc")
    except Exception as e:
        print(f"[Telemetry] Failed to initialize OpenTelemetry: {e}")
