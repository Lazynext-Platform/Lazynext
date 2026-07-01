# Monitoring

Observability stack for Lazynext based on the **Grafana LGTM** ecosystem (Loki, Grafana, Tempo, Mimir/Prometheus) plus **Alertmanager**, **Alloy** (OpenTelemetry), and **Blackbox Exporter**.

## Directory Layout

```
monitoring/
├── prometheus/          # Metrics collection, alerting rules, SLOs
├── grafana/             # Dashboards and datasource provisioning
├── loki/                # Log aggregation configuration
├── tempo/               # Distributed tracing
├── alertmanager/        # Alert routing and notification
├── alloy/               # Grafana Alloy (OpenTelemetry collector)
├── blackbox/            # Blackbox prober (endpoint health checks)
└── runbooks/            # Operational runbooks for SLOs and incidents
```

## Components

### Prometheus (`prometheus/`)

| File | Purpose |
|---|---|
| `prometheus.yml` | Scrape configs for all 8 microservices, Postgres/Redis/node exporters, and TensorFlow Serving |
| `rules.yml` | Alerting rules |
| `recording-rules.yml` | Pre-computed metrics for dashboard performance |
| `slos.yaml` | Service Level Objectives (error budgets, burn rate alerts) |
| `alerts/` | Additional alert definitions |

### Grafana (`grafana/`)

| File | Purpose |
|---|---|
| `datasources.yml` | Auto-provisioned datasources: Prometheus (default), Loki, Tempo, Azure PostgreSQL |
| `dashboards.yml` | Dashboard provisioning config |
| `dashboards/` | JSON dashboard definitions |

Datasources connect to Docker Compose service names by default (`prometheus:9090`, `loki:3100`, `tempo:3200`). K8s overlays should patch these to namespace-qualified URLs.

### Loki (`loki/`)

| File | Purpose |
|---|---|
| `loki-config.yaml` | Production Loki configuration (S3 storage, compactor, retention) |
| `local-config.yaml` | Local development configuration (filesystem storage) |
| `rules.yml` | Log-based alerting rules |

### Tempo (`tempo/`)

| File | Purpose |
|---|---|
| `tempo-config.yaml` | Distributed tracing backend (receivers, storage, query frontend) |
| `data/` | Local trace storage (development only) |

### Alertmanager (`alertmanager/`)

| File | Purpose |
|---|---|
| `config.yml` | Alert routing tree, receivers (Slack, PagerDuty, email), inhibition rules |

### Alloy (`alloy/`)

| File | Purpose |
|---|---|
| `config.alloy` | Grafana Alloy configuration for local development (OTel receiver, processors, exporters) |
| `config-prod.alloy` | Production Alloy configuration with Azure-specific exporters |

Alloy acts as the OpenTelemetry collector — receiving, processing, and exporting telemetry to Prometheus, Loki, and Tempo.

### Blackbox (`blackbox/`)

| File | Purpose |
|---|---|
| `blackbox.yml` | Blackbox Exporter configuration (HTTP, TCP, DNS probes for all service endpoints) |

### Runbooks (`runbooks/`)

| File | Purpose |
|---|---|
| `database-availability-slo.md` | Runbook for PostgreSQL availability SLO breaches |
| `ml-inference-latency-slo.md` | Runbook for ML inference latency SLO breaches |
| `render-latency-slo.md` | Runbook for render pipeline latency SLO breaches |
| `production-deployment.md` | Production deployment procedure |
| `slo-burn-rate.md` | SLO burn rate alert response procedure |

## Stack Integration

```
Apps (OTel SDK) ──→ Alloy ──→ Tempo (traces)
                   ├───────→ Loki  (logs)
                   └───────→ Prometheus (metrics)

Prometheus ──→ Alertmanager ──→ Slack / PagerDuty / Email
Prometheus ──→ Grafana    (dashboards)
Loki        ──→ Grafana   (log exploration)
Tempo       ──→ Grafana   (trace exploration)
Blackbox    ──→ Prometheus (endpoint health)
```

In production on Azure, Application Insights provides an additional telemetry path alongside this stack.
