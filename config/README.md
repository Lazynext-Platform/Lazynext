# Configuration

Platform-level configuration files for Lazynext infrastructure components.

## Directory Layout

```
config/
└── traefik/            # Traefik reverse proxy / ingress configuration
    ├── dynamic.yml     # Middleware: rate limiting, circuit breakers, security headers, compression
    └── tls.yml         # TLS certificates and SSL options
```

## Traefik (`config/traefik/`)

Traefik serves as the reverse proxy and ingress controller for Lazynext services. All middleware and TLS configuration is defined here and mounted into the Traefik container.

### `dynamic.yml`

Defines all HTTP middleware used by service routers:

| Middleware | Purpose |
|---|---|
| `web-rate-limit` | 100 req/s average, 200 burst (public web) |
| `api-rate-limit` | 30 req/s average, 60 burst (API endpoints) |
| `web-circuit-breaker` | Opens after 10% network errors or 25% 5xx responses |
| `api-circuit-breaker` | Opens after 20% network errors or 30% 5xx responses |
| `secure-headers` | HSTS (1 year), CSP, X-Frame-Options, referrer policy, nosniff |
| `compress` | Gzip/Brotli compression (excludes SSE streams, min 1KB) |
| `auth-dashboard` | Basic auth for internal Traefik dashboard |
| `internal-ip` | IP allowlist (RFC 1918 + Tailscale/WireGuard ranges) |
| `retry` | 3 retries with 100ms exponential backoff |
| `error-pages` | Custom error page fallback for 5xx responses |

Also defines:
- **TLS options**: Modern cipher suites (TLS 1.3, ECDHE, ChaCha20), strict SNI, P-521/P-384/P-256/X25519 curves
- **Internal health router**: `health.lazynext.internal` on HTTP (no TLS) for monitoring probes

### `tls.yml`

- Default certificate: `/etc/traefik/certs/lazynext.com.crt` / `.key`
- Production certificates: Cloudflare DNS-01 ACME challenge, stored in `/letsencrypt/acme.json`
- Fallback certs: Self-signed for internal/development use

### Usage

Mount both files into the Traefik container:

```bash
docker run ... \
  -v $(pwd)/config/traefik/dynamic.yml:/etc/traefik/dynamic.yml \
  -v $(pwd)/config/traefik/tls.yml:/etc/traefik/tls.yml \
  traefik:latest
```

Or reference them in Docker Compose / Kubernetes ConfigMap mounts.
