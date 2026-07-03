# Lazynext Domain Setup — lazynext.com via Spaceship → Azure

Step-by-step instructions for configuring `lazynext.com` (purchased from
Spaceship) to point at the Lazynext Azure infrastructure.

## Prerequisites

- Spaceship account with ownership of lazynext.com
- Azure subscription with Contributor rights
- Terraform applied (Application Gateway public IP provisioned)
- Cloudflare account (for DNS-01 ACME challenge with Traefik)

## Step 1: Get Azure Endpoints

After running `terraform apply -var-file="production.tfvars"`, retrieve the
public IP address:

```bash
cd infra/terraform
terraform output app_gateway_public_ip
terraform output app_gateway_fqdn
# Example output: 20.199.45.12 / lazynext-agw-production.southeastasia.cloudapp.azure.com
```

Also retrieve the Front Door endpoint for media:

```bash
terraform output cdn_endpoint_hostname
# Example: lazynext-media-ep-production-abc123.z01.azurefd.net
```

## Step 2: Configure DNS at Spaceship

Log in to [spaceship.com](https://www.spaceship.com) → Domain List → lazynext.com → Manage DNS.

### 2a. Set Nameservers (Option A: Use Spaceship DNS)

If keeping DNS at Spaceship, add these records:

| Type  | Name/Host | Value/Points To                          | TTL    |
|-------|-----------|------------------------------------------|--------|
| A     | @         | `<Application Gateway Public IP>`        | 300    |
| CNAME | www       | `lazynext.com`                           | 300    |
| CNAME | api       | `lazynext.com`                           | 300    |
| CNAME | app       | `lazynext.com`                           | 300    |
| CNAME | media     | `<Front Door Endpoint Hostname>`          | 300    |

> **Why api/app CNAME → lazynext.com?** The Application Gateway handles all
> HTTP Host-based routing. Requests for `api.lazynext.com` and
> `app.lazynext.com` are forwarded to the same Application Gateway, which
> routes to the correct backend pool based on the Host header.

### 2b. Delegate to Azure DNS (Option B: Recommended)

If creating an Azure DNS zone for complete Azure-side management:

1. In the Terraform config, set `create_dns_zone = true`
2. After `terraform apply`, get the Azure name servers:
   ```bash
   terraform output dns_zone_name_servers
   ```
3. In Spaceship, change nameservers to custom and paste the 4 Azure name servers
4. DNS propagation can take up to 48 hours (usually <1 hour)

### Step 3: Domain Verification (if needed)

Some Azure services require domain ownership verification.

#### Azure Container Apps Custom Domain

```bash
# Add TXT record at Spaceship
# Name: asuid.api.lazynext.com
# Value: <container-app-domain-verification-id>

az containerapp hostname bind \
  --resource-group lazynext-rg-production \
  --name lazynext-web-production \
  --hostname lazynext.com
```

#### Azure Front Door Domain Validation

Front Door validates domain ownership via a TXT record. For Premium SKU,
this is automatic if the DNS zone is in Azure. For Standard, manually add:

```bash
# Get validation token
az afd custom-domain show \
  --resource-group lazynext-rg-production \
  --profile-name lazynext-cdn-production \
  --custom-domain-name lazynext.com \
  --query "validationProperties.validationToken"

# Add TXT record at Spaceship:
# Name: _dnsauth.lazynext.com
# Value: <validation-token>
```

#### Better Auth / OAuth Providers

When configuring OAuth providers (Google, GitHub), add these to your app
settings:

- **Authorized redirect URIs**: `https://lazynext.com/api/auth/callback/*`
- **Authorized JavaScript origins**: `https://lazynext.com`

## Step 4: SSL/TLS Certificates

### Traefik (Docker Compose deployment)

The Traefik reverse proxy in `docker-compose.prod-full.yml` uses Cloudflare
DNS-01 challenge for automatic Let's Encrypt certificates. Set these env vars:

```bash
export DOMAIN=lazynext.com
export CF_API_EMAIL=ops@lazynext.ai
export CF_DNS_API_TOKEN=<cloudflare-api-token>
export ACME_EMAIL=ops@lazynext.ai
export LETSENCRYPT_STAGING=false
```

No manual certificate management needed — Traefik handles renewal automatically.

### Application Gateway (Azure deployment)

Upload the PFX certificate to Key Vault:

```bash
# Generate a PFX (if using Let's Encrypt)
certbot certonly --manual --preferred-challenges dns \
  -d "lazynext.com" -d "*.lazynext.com"

openssl pkcs12 -export -out lazynext.pfx \
  -inkey /etc/letsencrypt/live/lazynext.com/privkey.pem \
  -in /etc/letsencrypt/live/lazynext.com/fullchain.pem

# Upload to Key Vault
az keyvault certificate import \
  --vault-name lazynext-kv-production \
  --name lazynext-tls \
  --file lazynext.pfx

# Get the secret ID
az keyvault certificate show \
  --vault-name lazynext-kv-production \
  --name lazynext-tls \
  --query "sid" -o tsv
```

Then uncomment the `ssl_certificate` block in `infra/terraform/waf.tf` and
re-apply:

```hcl
http_listener "listener-web-https" {
  # ... existing config ...
  ssl_certificate {
    name                = "ssl-lazynext"
    key_vault_secret_id = "<secret-id-from-above>"
  }
}
```

### Azure Front Door CDN

Front Door uses Azure-managed certificates automatically when using Premium
SKU. No manual steps needed — just ensure the domain validation TXT record
is in place.

## Step 5: Verify Everything

Run the deployment verification script:

```bash
DOMAIN=lazynext.com ./scripts/verify-deployment.sh
```

Expected output:
```
🔍 Lazynext Deployment Verification — lazynext.com

  DNS Resolution
    lazynext.com ....................... ✓ (20.199.45.12)
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
| 502 Bad Gateway | Check backend health probes in Application Gateway |
| Spaceship DNS not saving | Use Chrome; clear Spaceship cookies |
| Domain verification failing | TXT records are case-sensitive; verify exact values |
