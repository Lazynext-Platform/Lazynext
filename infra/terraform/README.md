# Lazynext — Azure Infrastructure (Terraform)

Provisions the entire Lazynext platform on Azure using HashiCorp Terraform.

## Quick Start

```bash
cd infra/terraform
terraform init
terraform workspace select dev   # or staging / production
terraform plan   -var-file="dev.tfvars"
terraform apply  -var-file="dev.tfvars"
```

## Architecture

```
Resource Group: lazynext-rg-{env}
├── VNet: 10.0.0.0/16
│   ├── Subnet: container-apps    (10.0.0.0/21)  — Azure Container Apps
│   ├── Subnet: postgresql        (10.0.2.0/24)  — PostgreSQL Flexible Server
│   └── Subnet: private-endpoints (10.0.3.0/24)  — ACR, Key Vault, Blob
├── Container Apps Environment (8 services)
│   ├── web, ai-agents, render-service
│   ├── pre-processing, generative-studio
│   ├── api-gateway, collab-server, analytics
├── Application Gateway v2 + WAF (OWASP 3.2)
├── Azure Front Door CDN + WAF
├── PostgreSQL Flexible Server 17 (private network)
├── Azure Container Registry (Premium)
├── Key Vault (purge-protected, 90-day soft-delete)
├── Storage Account (Blob, lifecycle-managed)
├── Monitoring: App Insights ×8, metric/log alerts, URL ping tests
├── Backup: Recovery Services Vault + Data Protection Vault
├── GitHub Actions OIDC (federated identity)
└── Private endpoints: ACR, Key Vault, Blob Storage
```

## Files

| File | Purpose |
|------|---------|
| `main.tf` | Provider config, remote state backend |
| `variables.tf` | All variable declarations with validations |
| `outputs.tf` | 30 output values (FQDNs, connection strings, IDs) |
| `vnet.tf` | Virtual network and subnet delegation |
| `containerapps.tf` | 8 Container Apps with managed identity |
| `waf.tf` | Application Gateway v2 with WAF rules |
| `cdn.tf` | Azure Front Door + CDN WAF policy |
| `monitoring.tf` | App Insights, metric/log alerts, URL ping tests |
| `storage.tf` | Blob storage with lifecycle management |
| `keyvault.tf` | Key Vault with access policies + secrets |
| `acr.tf` | Container Registry |
| `postgresql.tf` | PostgreSQL Flexible Server + database |
| `backup.tf` | Backup vaults with policies for PG + Blob |
| `private-endpoints.tf` | Private DNS zones + endpoints |
| `oidc.tf` | GitHub Actions OIDC federation |
| `aks.tf.disabled` | AKS config (disabled — using Container Apps) |

## Environments

| Env | tfvars File | Purpose |
|-----|-------------|---------|
| `dev` | `dev.tfvars` | Development / local testing |
| `staging` | `staging.tfvars` | Pre-production validation |
| `production` | `production.tfvars` | Live deployment |
| `terraform.tfvars` | (gitignored) | Local overrides |

## Secrets

All secrets are managed via Azure Key Vault, set externally:

```bash
az keyvault secret set --vault-name lazynext-kv-{env} --name "OPENAI--API--KEY" --value "sk-..."
```

GitHub Actions OIDC provides passwordless authentication for CI/CD.
