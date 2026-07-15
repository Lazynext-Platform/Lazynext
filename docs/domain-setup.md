# Lazynext Domain Setup — lazynext.com via Spaceship → Linode

Step-by-step instructions for configuring `lazynext.com` (purchased from
Spaceship) to point at the Lazynext Linode infrastructure.

## Prerequisites

- Spaceship account with ownership of lazynext.com
- Linode account with a provisioned server (Ubuntu 24.04, Docker installed)
- Cloudflare account (for DNS-01 ACME challenge with Caddy/Traefik)

## Step 1: Get Linode Server IP

After deploying via `./infra/linode/deploy.sh`, retrieve the server's
public IP address from your Linode dashboard or via:

```bash
# From the Linode server:
curl -s https://ipinfo.io/ip
# Example output: 192.46.209.127
```

## Step 2: Configure DNS at Spaceship

Log in to [spaceship.com](https://www.spaceship.com) → Domain List → lazynext.com → Manage DNS.

### 2a. Set DNS Records (Use Spaceship DNS)

Add these records pointing to your Linode server:

| Type  | Name/Host | Value/Points To                          | TTL    |
|-------|-----------|------------------------------------------|--------|
| A     | @         | `<Linode Server Public IP>`              | 300    |
| CNAME | www       | `lazynext.com`                           | 300    |
| CNAME | api       | `lazynext.com`                           | 300    |
| CNAME | collab    | `lazynext.com`                           | 300    |

> **Why api/collab CNAME → lazynext.com?** The Caddy reverse proxy handles all
> HTTP Host-based routing. Requests for `api.lazynext.com` and
> `collab.lazynext.com` are forwarded to the same server, which
> routes to the correct backend service based on the Host header.

### 2b. Use Cloudflare DNS (Alternative)

If you prefer Cloudflare for DNS management with automatic SSL:

1. In Spaceship, set custom nameservers to Cloudflare's assigned nameservers
2. Add the same A/CNAME records in Cloudflare's DNS dashboard
3. DNS propagation can take up to 48 hours (usually <1 hour)

### Step 3: Domain Verification

#### Better Auth / OAuth Providers

When configuring OAuth providers (Google, GitHub), add these to your app
settings:

- **Authorized redirect URIs**: `https://lazynext.com/api/auth/callback/*`
- **Authorized JavaScript origins**: `https://lazynext.com`

## Step 4: SSL/TLS Certificates

### Caddy (Docker Compose deployment)

The Caddy reverse proxy in `docker-compose.prod-full.yml` handles automatic
Let's Encrypt certificates. Set these env vars:

```bash
export DOMAIN=lazynext.com
export ACME_EMAIL=ops@lazynext.ai
```

No manual certificate management needed — Caddy handles renewal automatically.

### Traefik (Alternative Docker Compose deployment)

If using Traefik, configure Cloudflare DNS-01 challenge:

```bash
export DOMAIN=lazynext.com
export CF_API_EMAIL=ops@lazynext.ai
export CF_DNS_API_TOKEN=<cloudflare-api-token>
export ACME_EMAIL=ops@lazynext.ai
export LETSENCRYPT_STAGING=false
```

## Step 5: Verify Everything

Run the deployment verification script:

```bash
DOMAIN=lazynext.com ./scripts/verify-deployment.sh
```

Expected output:
```
🔍 Lazynext Deployment Verification — lazynext.com

  DNS Resolution
    lazynext.com ....................... ✓ (192.46.209.127)
    www.lazynext.com .................. ✓
    api.lazynext.com .................. ✓
    app.lazynext.com .................. ✓

  SSL Certificates
    https://lazynext.com .............. ✓ (valid until 2025-10-01)
    https://api.lazynext.com/health ... ✓

  Service Health
    Web App (lazynext.com) ............ ✓ 200
    API Gateway                     ... ✓ 200
    AI Agents                      ... ✓ 200
    Render Service                 ... ✓ 200
    Collab Server                  ... ✓ 200
    PostgreSQL                     ... ✓
    Redis                          ... ✓

  📊 10/10 services healthy
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| DNS not resolving | Wait for propagation (check with `dig lazynext.com @8.8.8.8`) |
| SSL cert not issued | Check ACME challenge: `docker logs traefik` |
| 502 Bad Gateway | Check backend health in Caddy reverse proxy |
| Spaceship DNS not saving | Use Chrome; clear Spaceship cookies |
| Domain verification failing | TXT records are case-sensitive; verify exact values |
