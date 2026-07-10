//! Lazynext Collab Server binary entrypoint.
//!
//! Sets up tracing, connects to the database, builds the router from
//! the library crate, and binds the Axum HTTP/WebSocket server.

use std::net::SocketAddr;
use std::sync::Arc;

use collab_server::{AppState, DbStore};
use opentelemetry_otlp::WithExportConfig;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    let fmt_layer = tracing_subscriber::fmt::layer().with_target(false);

    // Setup tracing and OpenTelemetry
    if let Ok(endpoint) = std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT") {
        let exporter = opentelemetry_otlp::SpanExporter::builder()
            .with_http()
            .with_endpoint(endpoint)
            .build()
            .expect("Failed to create OTLP exporter");

        let tracer_provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
            .with_batch_exporter(exporter)
            .build();

        opentelemetry::global::set_tracer_provider(tracer_provider.clone());
        use opentelemetry::trace::TracerProvider;
        let tracer = tracer_provider.tracer("collab-server");
        let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

        tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .with(telemetry)
            .init();
    } else {
        tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .init();
    }

    info!("Lazynext Collab Server starting...");
    dotenvy::dotenv().ok();

    let db: Option<Arc<DbStore>> = match DbStore::new().await {
        Ok(db) => {
            info!("Database connected");
            Some(Arc::new(db))
        }
        Err(e) => {
            error!(
                "Failed to connect to db: {} — running without persistence",
                e
            );
            None
        }
    };

    let state = Arc::new(AppState {
        rooms: dashmap::DashMap::new(),
        peer_rooms: dashmap::DashMap::new(),
        db,
    });

    let app = collab_server::build_router(state);

    let port: u16 = std::env::var("COLLAB_PORT")
        .unwrap_or_else(|_| "8004".to_string())
        .parse()
        .unwrap_or(8004);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Collab WebSocket server on ws://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
